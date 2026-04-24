import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { ShoppingBag, Search } from 'lucide-react';
import { formatBRL, formatDateTime } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type Purchase = {
  id: string;
  reseller_id: string;
  plan_code?: string;
  package_size: number;
  unit_price_cents: number;
  total_cents: number;
  payment_method: string;
  payment_status: string;
  paid_at?: string;
  created_at: string;
  keys_generated: number;
  reseller?: { name: string; email: string };
};

const planLabel: Record<string, string> = {
  '7dias': '7 dias',
  '30dias': '30 dias',
  'vitalicio': 'Vitalícia',
};

export default function ResellerPurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('reseller_purchases')
      .select('*, reseller:resellers!inner(name,email)')
      .order('created_at', { ascending: false });
    setPurchases((data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = purchases.filter(p => {
    if (tab === 'paid' && p.payment_status !== 'paid') return false;
    if (tab === 'pending' && p.payment_status !== 'pending') return false;
    if (tab === 'failed' && !['failed', 'cancelled', 'refunded'].includes(p.payment_status)) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.reseller?.name?.toLowerCase().includes(q) ||
             p.reseller?.email?.toLowerCase().includes(q) ||
             p.id.includes(q);
    }
    return true;
  });

  const counts = {
    all: purchases.length,
    paid: purchases.filter(p => p.payment_status === 'paid').length,
    pending: purchases.filter(p => p.payment_status === 'pending').length,
    failed: purchases.filter(p => ['failed', 'cancelled', 'refunded'].includes(p.payment_status)).length,
  };

  const totalPaid = purchases.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.total_cents, 0);
  const totalKeys = purchases.filter(p => p.payment_status === 'paid').reduce((s, p) => s + p.package_size, 0);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader
        icon={ShoppingBag}
        title="Compras de revenda"
        subtitle={`${counts.paid} compras confirmadas · ${totalKeys} chaves vendidas · ${formatBRL(totalPaid)} em receita`}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {([
          ['all', `Todas (${counts.all})`],
          ['paid', `Pagas (${counts.paid})`],
          ['pending', `Pendentes (${counts.pending})`],
          ['failed', `Falhas (${counts.failed})`],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            tab === k ? 'bg-primary text-void' : 'bg-white/5 text-text-muted hover:text-text-primary'
          }`}>
            {l}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por revendedor ou ID..." className="input-dsl pl-10" />
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center"><LoaderRing size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="holo-card p-12 text-center text-text-muted">Nenhuma compra encontrada.</div>
      ) : (
        <div className="holo-card overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-text-muted text-left text-xs uppercase tracking-wider" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium">Revendedor</th>
                  <th className="p-4 font-medium">Plano</th>
                  <th className="p-4 font-medium">Qtd</th>
                  <th className="p-4 font-medium">Total</th>
                  <th className="p-4 font-medium">Geradas</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b hover:bg-white/5"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  >
                    <td className="p-4 text-text-muted text-xs">{formatDateTime(p.created_at)}</td>
                    <td className="p-4">
                      <div className="font-medium">{p.reseller?.name || '—'}</div>
                      <div className="text-xs text-text-muted">{p.reseller?.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5">
                        {planLabel[p.plan_code || 'vitalicio'] || p.plan_code}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-tabular font-semibold">{p.package_size}</td>
                    <td className="p-4 font-mono font-tabular">{formatBRL(p.total_cents)}</td>
                    <td className="p-4">
                      <div className="font-mono font-tabular text-sm">
                        {p.keys_generated}/{p.package_size}
                      </div>
                      {p.keys_generated === p.package_size && (
                        <div className="text-[10px] text-primary">completo</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        p.payment_status === 'paid' ? 'bg-primary/15 text-primary' :
                        p.payment_status === 'pending' ? 'bg-accent-gold/15 text-accent-gold' :
                        'bg-red-500/15 text-red-400'
                      }`}>
                        {p.payment_status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
