// Vendas atribuídas a revendedores (modelo de comissão)
// Lê subscriptions onde reseller_id é não-nulo
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search } from 'lucide-react';
import { formatBRL, formatDateTime } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type Sub = {
  id: string;
  plan_code: string;
  status: string;
  amount_cents: number;
  commission_percent_at_sale: number | null;
  payment_method: string;
  created_at: string;
  paid_at?: string | null;
  reseller_id: string;
  customers?: { name?: string; email?: string };
  resellers?: { name: string; slug: string };
};

const PLAN: Record<string, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  '1dia': '1 dia',
  '7dias': '7 dias',
};

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  past_due: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  canceled: 'bg-white/5 text-[var(--color-text-muted)] border-[var(--color-border)]',
};

export default function ResellerSales() {
  const [sales, setSales] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'active' | 'pending' | 'lost'>('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*, customers(name,email), resellers!inner(name,slug)')
      .not('reseller_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    setSales((data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (tab === 'active' && s.status !== 'active') return false;
      if (tab === 'pending' && s.status !== 'pending') return false;
      if (tab === 'lost' && !['canceled', 'suspended', 'past_due'].includes(s.status)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.customers?.name?.toLowerCase().includes(q) ||
          s.customers?.email?.toLowerCase().includes(q) ||
          s.resellers?.name?.toLowerCase().includes(q) ||
          s.resellers?.slug?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sales, tab, search]);

  const counts = {
    all: sales.length,
    active: sales.filter((s) => s.status === 'active').length,
    pending: sales.filter((s) => s.status === 'pending').length,
    lost: sales.filter((s) => ['canceled', 'suspended', 'past_due'].includes(s.status)).length,
  };

  const totalRevenue = sales.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.amount_cents, 0);
  const totalCommission = sales
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + Math.round((s.amount_cents * (s.commission_percent_at_sale || 60)) / 100), 0);

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      <PageHeader
        title="Vendas via revenda"
        subtitle={`${counts.active} assinaturas ativas · ${formatBRL(totalRevenue)} receita bruta · ${formatBRL(totalCommission)} em comissões pagas`}
      />

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente ou revendedor…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm placeholder:text-[var(--color-text-dim)] outline-none focus:border-[var(--color-primary)]/50"
            />
          </div>
          <div className="flex gap-1 ml-auto text-xs">
            {([
              ['all', `Todas (${counts.all})`],
              ['active', `Ativas (${counts.active})`],
              ['pending', `Pendentes (${counts.pending})`],
              ['lost', `Perdidas (${counts.lost})`],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={
                  'px-3 py-1.5 rounded-md ' +
                  (tab === k
                    ? 'bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 grid place-items-center text-[var(--color-text-muted)]">
            <LoaderRing size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-sm text-[var(--color-text-muted)]">
            Nenhuma venda atribuída a revenda{search ? ` para "${search}"` : ''}.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-dim)] border-b border-[var(--color-border)]">
                <th className="font-normal py-3 pl-6">Cliente</th>
                <th className="font-normal">Revenda</th>
                <th className="font-normal">Plano</th>
                <th className="font-normal">Comissão</th>
                <th className="font-normal">Data</th>
                <th className="font-normal">Status</th>
                <th className="font-normal text-right pr-6">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const commission = Math.round((s.amount_cents * (s.commission_percent_at_sale || 60)) / 100);
                return (
                  <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)]/40">
                    <td className="py-3 pl-6">
                      <div className="font-medium truncate max-w-[200px]">{s.customers?.name || '—'}</div>
                      <div className="text-xs text-[var(--color-text-dim)] truncate max-w-[200px]">{s.customers?.email}</div>
                    </td>
                    <td>
                      <div className="text-sm">{s.resellers?.name}</div>
                      <div className="text-xs text-[var(--color-text-dim)] font-mono">/c/{s.resellers?.slug}</div>
                    </td>
                    <td className="text-[var(--color-text-muted)]">{PLAN[s.plan_code] || s.plan_code}</td>
                    <td className="text-xs">
                      <div className="text-[var(--color-primary)] font-mono">{formatBRL(commission)}</div>
                      <div className="text-[var(--color-text-dim)]">{s.commission_percent_at_sale || 60}%</div>
                    </td>
                    <td className="text-xs text-[var(--color-text-muted)] font-mono">
                      {formatDateTime(s.created_at)}
                    </td>
                    <td>
                      <span
                        className={
                          'inline-flex items-center gap-1 px-2 h-5 rounded text-[11px] font-medium border ' +
                          (STATUS_TONE[s.status] || STATUS_TONE.canceled)
                        }
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="text-right pr-6 font-mono">{formatBRL(s.amount_cents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-dim)] mt-6 text-center">
        Comissões são debitadas automaticamente do split na Pagar.me. Estornos descontam do saldo do revendedor.
      </p>
    </div>
  );
}
