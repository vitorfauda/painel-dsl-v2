import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatBRL } from '@/lib/utils';
import {
  Key, UserCog, TrendingUp, DollarSign, Users, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type SubRow = {
  id: string;
  amount_cents: number;
  plan_code: string;
  status: string;
  created_at: string;
  reseller_id: string | null;
  customers?: { name?: string; email?: string };
  resellers?: { name?: string; slug?: string };
};

type PixRow = {
  id: string;
  amount_cents: number;
  plan_code: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  is_renewal: boolean;
  payment_method?: string | null;
};

type RecentItem = {
  kind: 'pagarme' | 'mercadopago';
  date: string;
  customer: string;
  email: string;
  plan: string;
  origin: 'direta' | 'revenda';
  reseller_slug?: string | null;
  status: string;
  amount_cents: number;
};

type Stats = {
  mrr_cents: number;
  active_customers: number;
  sales_30d: number;
  revenue_30d_cents: number;
  direct_sales_30d: number;
  reseller_sales_30d: number;
  direct_revenue_30d: number;
  reseller_revenue_30d: number;
  mp_sales_30d: number;
  mp_revenue_30d: number;
  total_resellers: number;
  active_resellers: number;
  total_licenses: number;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<{ date: string; direta: number; revenda: number }[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const cutoff30 = new Date(now);
      cutoff30.setDate(cutoff30.getDate() - 30);
      const cutoffIso = cutoff30.toISOString();

      const [subsRes, mpRes, mpRecentRes, subsRecentRes, resellersRes, activeResellersRes, licensesRes] =
        await Promise.all([
          // Subscriptions Pagar.me criadas nos últimos 30d
          supabase
            .from('subscriptions')
            .select('id, amount_cents, plan_code, status, created_at, reseller_id, customers(name,email), resellers(name,slug)')
            .gte('created_at', cutoffIso),
          // Mercado Pago — apenas PAGAS nos últimos 30d
          supabase
            .from('pix_payments')
            .select('id, amount_cents, plan_code, status, paid_at, created_at, customer_name, customer_email, is_renewal, payment_method')
            .eq('status', 'paid')
            .gte('paid_at', cutoffIso),
          // 10 MP recentes
          supabase
            .from('pix_payments')
            .select('id, amount_cents, plan_code, status, paid_at, created_at, customer_name, customer_email, is_renewal, payment_method')
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })
            .limit(10),
          // 10 subs recentes
          supabase
            .from('subscriptions')
            .select('id, amount_cents, plan_code, status, created_at, reseller_id, customers(name,email), resellers(name,slug)')
            .order('created_at', { ascending: false })
            .limit(10),
          supabase.from('resellers').select('id', { count: 'exact', head: true }),
          supabase.from('resellers').select('id', { count: 'exact', head: true }).eq('entry_paid', true),
          supabase.from('licenses').select('id', { count: 'exact', head: true }),
        ]);

      const subs30 = (subsRes.data || []) as SubRow[];
      const mp30 = (mpRes.data || []) as PixRow[];

      // MRR — assinaturas ativas Pagar.me (única fonte de recorrência)
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('amount_cents, plan_code')
        .eq('status', 'active');

      const mrr = (activeSubs || []).reduce((s, x) => {
        const monthly = x.plan_code === 'yearly' ? Math.round(x.amount_cents / 12) : x.amount_cents;
        return s + monthly;
      }, 0);

      // Direct vs reseller (subscriptions)
      const directSubs = subs30.filter((s) => !s.reseller_id);
      const viaReseller = subs30.filter((s) => s.reseller_id);

      // Mercado Pago é sempre venda direta (site público devsemlimites.site)
      const mpSalesCount = mp30.length;
      const mpRevenue = mp30.reduce((s, x) => s + (x.amount_cents || 0), 0);

      const directSalesTotal = directSubs.length + mpSalesCount;
      const directRevenueTotal = directSubs.reduce((s, x) => s + x.amount_cents, 0) + mpRevenue;
      const totalSales = directSalesTotal + viaReseller.length;
      const totalRevenue =
        directRevenueTotal + viaReseller.reduce((s, x) => s + x.amount_cents, 0);

      setStats({
        mrr_cents: mrr,
        active_customers: activeSubs?.length || 0,
        sales_30d: totalSales,
        revenue_30d_cents: totalRevenue,
        direct_sales_30d: directSalesTotal,
        reseller_sales_30d: viaReseller.length,
        direct_revenue_30d: directRevenueTotal,
        reseller_revenue_30d: viaReseller.reduce((s, x) => s + x.amount_cents, 0),
        mp_sales_30d: mpSalesCount,
        mp_revenue_30d: mpRevenue,
        total_resellers: resellersRes.count || 0,
        active_resellers: activeResellersRes.count || 0,
        total_licenses: licensesRes.count || 0,
      });

      // Chart — combina subs (Pagar.me) + pix_payments (MP, status=paid)
      const days: Record<string, { direta: number; revenda: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days[d.toISOString().slice(0, 10)] = { direta: 0, revenda: 0 };
      }
      subs30.forEach((s) => {
        const k = s.created_at.slice(0, 10);
        if (k in days) {
          if (s.reseller_id) days[k].revenda += s.amount_cents / 100;
          else days[k].direta += s.amount_cents / 100;
        }
      });
      mp30.forEach((p) => {
        const k = (p.paid_at || p.created_at).slice(0, 10);
        if (k in days) days[k].direta += (p.amount_cents || 0) / 100;
      });
      setChart(
        Object.entries(days).map(([date, v]) => ({
          date: date.slice(5),
          direta: Math.round(v.direta),
          revenda: Math.round(v.revenda),
        })),
      );

      // Recentes — merge subs + MP, sort por data desc, top 10
      const subsItems: RecentItem[] = ((subsRecentRes.data || []) as SubRow[]).map((s) => ({
        kind: 'pagarme',
        date: s.created_at,
        customer: s.customers?.name || '—',
        email: s.customers?.email || '',
        plan: s.plan_code,
        origin: s.reseller_id ? 'revenda' : 'direta',
        reseller_slug: s.resellers?.slug || null,
        status: s.status,
        amount_cents: s.amount_cents,
      }));
      const mpItems: RecentItem[] = ((mpRecentRes.data || []) as PixRow[]).map((p) => ({
        kind: 'mercadopago',
        date: p.paid_at || p.created_at,
        customer: p.customer_name || '—',
        email: p.customer_email || '',
        plan: p.plan_code,
        origin: 'direta',
        status: p.is_renewal ? 'renewal' : 'paid',
        amount_cents: p.amount_cents,
      }));
      const merged = [...subsItems, ...mpItems]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 10);
      setRecent(merged);

      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="min-h-[60vh] grid place-items-center text-[var(--color-text-muted)]">
        <LoaderRing size={28} />
      </div>
    );
  if (!stats) return null;

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      <PageHeader
        title={`Olá, ${user?.email?.split('@')[0] || 'admin'}`}
        subtitle="Visão geral da plataforma · últimos 30 dias"
      />

      {/* Plataforma */}
      <SectionLabel>Plataforma</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="MRR (assinaturas ativas)" value={formatBRL(stats.mrr_cents)} icon={TrendingUp} />
        <Stat label="Clientes ativos" value={String(stats.active_customers)} icon={Users} />
        <Stat label="Vendas 30d" value={String(stats.sales_30d)} icon={DollarSign} />
        <Stat label="Receita 30d" value={formatBRL(stats.revenue_30d_cents)} icon={DollarSign} />
      </div>

      {/* Quebra direta vs revenda */}
      <SectionLabel>Vendas — direta vs via revenda (30d)</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Vendas diretas"
          value={String(stats.direct_sales_30d)}
          icon={ArrowDownLeft}
          delta={
            stats.sales_30d
              ? { value: `${Math.round((stats.direct_sales_30d / stats.sales_30d) * 100)}% do total`, positive: true }
              : undefined
          }
        />
        <Stat label="Receita direta" value={formatBRL(stats.direct_revenue_30d)} icon={DollarSign} />
        <Stat
          label="Vendas via revenda"
          value={String(stats.reseller_sales_30d)}
          icon={ArrowUpRight}
          delta={
            stats.sales_30d
              ? { value: `${Math.round((stats.reseller_sales_30d / stats.sales_30d) * 100)}% do total`, positive: true }
              : undefined
          }
        />
        <Stat label="Receita revenda" value={formatBRL(stats.reseller_revenue_30d)} icon={DollarSign} />
      </div>

      {/* Mercado Pago split — só pra transparência da composição da venda direta */}
      <SectionLabel>Composição da venda direta</SectionLabel>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Stat
          label="Mercado Pago (site)"
          value={`${stats.mp_sales_30d} · ${formatBRL(stats.mp_revenue_30d)}`}
          icon={DollarSign}
        />
        <Stat
          label="Pagar.me (assinaturas diretas)"
          value={`${stats.direct_sales_30d - stats.mp_sales_30d} · ${formatBRL(stats.direct_revenue_30d - stats.mp_revenue_30d)}`}
          icon={DollarSign}
        />
      </div>

      {/* Revenda */}
      <SectionLabel>Revenda</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Stat label="Revendedores totais" value={String(stats.total_resellers)} icon={UserCog} />
        <Stat label="Ativos (entry pago)" value={String(stats.active_resellers)} icon={UserCog} />
        <Stat label="Licenças emitidas" value={String(stats.total_licenses)} icon={Key} />
      </div>

      {/* Gráfico */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 mb-8">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="text-sm font-medium">Receita diária — últimos 30 dias</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Inclui vendas Pagar.me + Mercado Pago
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[var(--color-primary)]" /> Direta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-blue-400" /> Revenda
            </span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="fillG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f0f0f',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: any) => `R$ ${v}`}
              />
              <Area type="monotone" dataKey="direta" stackId="1" stroke="#10b981" strokeWidth={1.5} fill="url(#fillG)" name="Direta" />
              <Area type="monotone" dataKey="revenda" stackId="1" stroke="#60a5fa" strokeWidth={1.5} fill="url(#fillB)" name="Revenda" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vendas recentes */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="text-sm font-medium">Vendas recentes</div>
          <a href="/subscriptions" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            Ver todas →
          </a>
        </div>
        {recent.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--color-text-muted)]">
            Nenhuma venda ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-dim)] border-b border-[var(--color-border)]">
                <th className="font-normal py-2.5 pl-6">Cliente</th>
                <th className="font-normal">Plano</th>
                <th className="font-normal">Origem</th>
                <th className="font-normal">Gateway</th>
                <th className="font-normal">Status</th>
                <th className="font-normal text-right pr-6">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)]/40">
                  <td className="py-3 pl-6">
                    <div className="font-medium truncate max-w-[200px]">{r.customer}</div>
                    <div className="text-xs text-[var(--color-text-dim)] truncate max-w-[200px]">{r.email}</div>
                  </td>
                  <td className="text-[var(--color-text-muted)] capitalize">{r.plan}</td>
                  <td>
                    {r.origin === 'revenda' ? (
                      <span className="text-xs">
                        <span className="text-blue-400">via</span>{' '}
                        <span className="font-mono text-[var(--color-text-muted)]">{r.reseller_slug}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400">Direta</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        'inline-flex items-center gap-1 px-2 h-5 rounded text-[10px] font-medium border ' +
                        (r.kind === 'mercadopago'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20')
                      }
                    >
                      {r.kind === 'mercadopago' ? 'MP' : 'Pagar.me'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        'inline-flex items-center gap-1 px-2 h-5 rounded text-[11px] font-medium border ' +
                        (r.status === 'active' || r.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : r.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-white/5 text-[var(--color-text-muted)] border-[var(--color-border)]')
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="text-right pr-6 font-mono">{formatBRL(r.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-widest mb-3">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string;
  icon?: any;
  delta?: { value: string; positive?: boolean };
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
        {Icon && <Icon size={14} className="text-[var(--color-text-dim)]" />}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {delta && (
        <div className={'mt-1 text-xs ' + (delta.positive ? 'text-emerald-400' : 'text-red-400')}>
          {delta.value}
        </div>
      )}
    </div>
  );
}
