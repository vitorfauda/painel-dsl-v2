import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type Row = {
  id: string;
  name: string;
  email: string;
  tier: string;
  total_keys_bought: number;
  total_keys_sold: number;
  total_revenue_cents: number;
};

type Metric = 'sold' | 'bought' | 'revenue';

const podiumIcon = [Crown, Medal, Award];
const podiumColor = ['#fbbf24', '#cbd5e1', '#f59e0b'];

export default function Ranking() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>('sold');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('resellers')
      .select('id, name, email, tier, total_keys_bought, total_keys_sold, total_revenue_cents')
      .eq('entry_paid', true);
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sorted = [...rows].sort((a, b) => {
    if (metric === 'sold') return (b.total_keys_sold || 0) - (a.total_keys_sold || 0);
    if (metric === 'bought') return (b.total_keys_bought || 0) - (a.total_keys_bought || 0);
    return (b.total_revenue_cents || 0) - (a.total_revenue_cents || 0);
  });

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const getVal = (r: Row): string => {
    if (metric === 'sold') return String(r.total_keys_sold || 0);
    if (metric === 'bought') return String(r.total_keys_bought || 0);
    return formatBRL(r.total_revenue_cents || 0);
  };

  const metricConfigs = {
    sold: { label: 'Chaves vendidas', icon: TrendingUp },
    bought: { label: 'Chaves compradas', icon: ShoppingBag },
    revenue: { label: 'Receita gerada', icon: DollarSign },
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader
        icon={Trophy}
        title="Ranking de revendedores"
        subtitle="Top performers do programa de revenda"
      />

      {/* Filtro métrica */}
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {(Object.keys(metricConfigs) as Metric[]).map((m) => {
          const cfg = metricConfigs[m];
          return (
            <button key={m} onClick={() => setMetric(m)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              metric === m ? 'bg-primary text-void' : 'bg-white/5 text-text-muted hover:text-text-primary'
            }`}>
              <cfg.icon size={14} /> {cfg.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center"><LoaderRing size={32} /></div>
      ) : sorted.length === 0 ? (
        <div className="holo-card p-12 text-center text-text-muted">Nenhum revendedor ativo ainda.</div>
      ) : (
        <>
          {/* Pódio */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[1, 0, 2].map((pos) => {
              const r = podium[pos];
              if (!r) return <div key={pos} />;
              const Icon = podiumIcon[pos];
              const color = podiumColor[pos];
              const isFirst = pos === 0;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pos * 0.15 }}
                  className={`holo-card ${isFirst ? 'holo-permanent sm:-translate-y-4 sm:scale-105' : ''} p-6 relative overflow-hidden text-center`}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${color}, transparent 70%)`, filter: 'blur(20px)' }} />
                  <div className="relative z-10">
                    <div className="inline-flex h-14 w-14 rounded-2xl items-center justify-center mb-3" style={{ background: `${color}20`, border: `1px solid ${color}50` }}>
                      <Icon size={24} style={{ color }} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color }}>
                      #{pos + 1} lugar
                    </div>
                    <div className="text-lg font-display font-bold mb-0.5">{r.name}</div>
                    <div className="text-xs text-text-muted mb-4 truncate">{r.email}</div>
                    <div className="text-3xl font-display font-bold font-tabular" style={{ color }}>{getVal(r)}</div>
                    <div className="text-xs text-text-muted mt-1">{metricConfigs[metric].label}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Lista do 4º em diante */}
          {rest.length > 0 && (
            <div className="holo-card overflow-hidden">
              <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <h3 className="font-display font-bold">Demais posições</h3>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {rest.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className="w-8 text-center text-sm font-bold text-text-dim">#{i + 4}</div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center text-sm font-bold">
                      {r.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.name}</div>
                      <div className="text-xs text-text-muted truncate">{r.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-tabular font-bold">{getVal(r)}</div>
                      <div className="text-xs text-text-dim">{r.tier?.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
