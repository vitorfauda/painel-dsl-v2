import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatBRL } from '@/lib/utils';
import { Key, UserCog, TrendingUp, DollarSign, Activity, ShoppingBag, LayoutDashboard, Sparkles, Zap } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type Stats = {
  licenses: number;
  licensesActive: number;
  licensesExpired: number;
  resellers: number;
  resellersActive: number;
  reseller_revenue: number;
  reseller_keys_bought: number;
  reseller_keys_sold: number;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<{ date: string; vendas: number; receita: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [licRes, licActiveRes, resRes, resActiveRes, purchasesRes, recentRes] = await Promise.all([
        supabase.from('licenses').select('id', { count: 'exact', head: true }),
        supabase.from('licenses').select('id', { count: 'exact', head: true }).or(`expires_at.is.null,expires_at.gt.${nowIso}`),
        supabase.from('resellers').select('id', { count: 'exact', head: true }),
        supabase.from('resellers').select('id', { count: 'exact', head: true }).eq('entry_paid', true),
        supabase.from('reseller_purchases').select('package_size, total_cents, payment_status, created_at').eq('payment_status', 'paid'),
        supabase.from('reseller_purchases').select('id, package_size, total_cents, created_at, payment_status, reseller_id').order('created_at', { ascending: false }).limit(10),
      ]);

      const allPurchases = purchasesRes.data || [];
      const totalRevenue = allPurchases.reduce((s, p) => s + (p.total_cents || 0), 0);
      const totalKeys = allPurchases.reduce((s, p) => s + (p.package_size || 0), 0);

      // Total de licenças vendidas por revendedores
      const { count: soldByResellers } = await supabase
        .from('licenses')
        .select('id', { count: 'exact', head: true })
        .not('sold_at', 'is', null)
        .not('reseller_id', 'is', null);

      const { count: expiredCount } = await supabase
        .from('licenses')
        .select('id', { count: 'exact', head: true })
        .lt('expires_at', nowIso);

      setStats({
        licenses: licRes.count || 0,
        licensesActive: licActiveRes.count || 0,
        licensesExpired: expiredCount || 0,
        resellers: resRes.count || 0,
        resellersActive: resActiveRes.count || 0,
        reseller_revenue: totalRevenue,
        reseller_keys_bought: totalKeys,
        reseller_keys_sold: soldByResellers || 0,
      });

      // Chart: últimos 30 dias
      const days: Record<string, { vendas: number; receita: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days[d.toISOString().slice(0, 10)] = { vendas: 0, receita: 0 };
      }
      allPurchases.forEach((p) => {
        const k = p.created_at?.slice(0, 10);
        if (k && k in days) {
          days[k].vendas += p.package_size || 0;
          days[k].receita += (p.total_cents || 0) / 100;
        }
      });
      setChart(
        Object.entries(days).map(([date, v]) => ({
          date: date.slice(5),
          vendas: v.vendas,
          receita: v.receita,
        }))
      );

      setRecent(recentRes.data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoaderRing size={40} /></div>;
  if (!stats) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader
        icon={LayoutDashboard}
        title={`Olá, ${user?.email?.split('@')[0] || 'admin'}`}
        subtitle="Visão geral do ecossistema Dev Sem Limites"
      />

      {/* Linha 1: Licenças */}
      <div className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-3 mt-2">Licenças</div>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Metric label="Total de licenças" value={stats.licenses} icon={Key} color="#22c55e" delay={0} />
        <Metric label="Ativas" value={stats.licensesActive} icon={Zap} color="#22d3ee" delay={0.05} />
        <Metric label="Expiradas" value={stats.licensesExpired} icon={Activity} color="#ef4444" delay={0.1} />
      </div>

      {/* Linha 2: Revendedores */}
      <div className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-3">Revenda</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric label="Revendedores totais" value={stats.resellers} icon={UserCog} color="#22c55e" delay={0} />
        <Metric label="Ativos (pagaram entry)" value={stats.resellersActive} icon={Sparkles} color="#fbbf24" delay={0.05} />
        <Metric label="Chaves compradas" value={stats.reseller_keys_bought} icon={ShoppingBag} color="#22d3ee" delay={0.1} />
        <Metric label="Receita revenda" value={formatBRL(stats.reseller_revenue)} icon={DollarSign} color="#d946ef" delay={0.15} mono />
      </div>

      {/* Gráfico 30 dias */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="holo-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg">Compras de revenda — últimos 30 dias</h3>
            <p className="text-xs text-text-muted mt-0.5">Chaves compradas / receita diária</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-muted">Receita 30d</div>
            <div className="text-xl font-display font-bold font-tabular text-primary">
              {formatBRL(chart.reduce((s, d) => s + d.receita * 100, 0))}
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="vendas" stroke="#22c55e" strokeWidth={2} fill="url(#fillGreen)" name="Chaves" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Atividade recente */}
      <div className="holo-card p-6">
        <h3 className="font-display font-bold text-lg mb-4">Compras recentes</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nenhuma compra ainda.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  p.payment_status === 'paid' ? 'bg-primary/10 text-primary' : 'bg-accent-gold/10 text-accent-gold'
                }`}>
                  <ShoppingBag size={14} />
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-medium">{p.package_size} chaves</div>
                  <div className="text-xs text-text-muted">
                    {new Date(p.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-tabular font-semibold text-sm">{formatBRL(p.total_cents)}</div>
                  <div className={`text-xs ${p.payment_status === 'paid' ? 'text-primary' : 'text-accent-gold'}`}>
                    {p.payment_status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color, delay, mono }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="holo-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className={`text-3xl font-display font-bold ${mono ? 'font-tabular' : 'font-tabular'} mb-1`}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </motion.div>
  );
}
