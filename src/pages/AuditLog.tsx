import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { ScrollText, Activity, Mail, CreditCard, Key } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type Event = {
  id: string;
  source: 'activity' | 'whatsapp' | 'payment';
  type: string;
  description: string;
  when: string;
  metadata?: any;
};

export default function AuditLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'activity' | 'payment' | 'whatsapp'>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [actsR, waR, payR] = await Promise.all([
        supabase.from('recent_activities').select('id, type, description, metadata, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('whatsapp_logs').select('id, template_code, status, phone, sent_at').order('sent_at', { ascending: false }).limit(100),
        supabase.from('payment_events').select('id, event_type, status, payment_id, created_at').order('created_at', { ascending: false }).limit(100),
      ]);

      const merged: Event[] = [
        ...(actsR.data || []).map((a: any) => ({ id: `act-${a.id}`, source: 'activity' as const, type: a.type, description: a.description, when: a.created_at, metadata: a.metadata })),
        ...(waR.data || []).map((w: any) => ({ id: `wa-${w.id}`, source: 'whatsapp' as const, type: `WA: ${w.template_code}`, description: `${w.phone} · ${w.status}`, when: w.sent_at })),
        ...(payR.data || []).map((p: any) => ({ id: `pay-${p.id}`, source: 'payment' as const, type: p.event_type, description: `${p.payment_id} · ${p.status}`, when: p.created_at })),
      ];
      merged.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
      setEvents(merged.slice(0, 150));
      setLoading(false);
    })();
  }, []);

  const filtered = events.filter(e => filter === 'all' || e.source === filter);

  const last24h = events.filter(e => new Date(e.when).getTime() > Date.now() - 24 * 3600 * 1000).length;
  const adminActions = events.filter(e => e.source === 'activity' && e.type?.startsWith('license')).length;

  const iconOf = (s: string) => {
    if (s === 'whatsapp') return Mail;
    if (s === 'payment') return CreditCard;
    return Activity;
  };

  const colorOf = (s: string) => {
    if (s === 'whatsapp') return '#22d3ee';
    if (s === 'payment') return '#fbbf24';
    return '#22c55e';
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={ScrollText} title="Log de auditoria" subtitle="Histórico de eventos do sistema" />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat icon={Activity} label="Últimas 24h" value={last24h} color="#22c55e" />
        <Stat icon={Key} label="Ações em licenças" value={adminActions} color="#22d3ee" />
        <Stat icon={CreditCard} label="Eventos totais" value={events.length} color="#fbbf24" />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {([
          ['all', 'Todos'],
          ['activity', 'Atividades'],
          ['payment', 'Pagamentos'],
          ['whatsapp', 'WhatsApp'],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as any)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            filter === k ? 'bg-primary text-void' : 'bg-white/5 text-text-muted hover:text-text-primary'
          }`}>{l}</button>
        ))}
      </div>

      {loading ? <div className="min-h-[40vh] flex items-center justify-center"><LoaderRing size={32} /></div> :
       filtered.length === 0 ? <div className="holo-card p-12 text-center text-text-muted">Nenhum evento.</div> :
        <div className="holo-card overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {filtered.map((e, i) => {
              const Icon = iconOf(e.source);
              const color = colorOf(e.source);
              return (
                <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.005 }} className="flex items-start gap-3 p-4 hover:bg-white/5">
                  <div className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-text-muted">{e.type}</span>
                      <span className="text-sm">{e.description}</span>
                    </div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <div className="text-[10px] text-text-dim font-mono mt-1 truncate">{JSON.stringify(e.metadata).substring(0, 120)}</div>
                    )}
                  </div>
                  <div className="text-xs text-text-dim shrink-0">{formatDateTime(e.when)}</div>
                </motion.div>
              );
            })}
          </div>
        </div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="holo-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="text-3xl font-display font-bold font-tabular">{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
    </div>
  );
}
