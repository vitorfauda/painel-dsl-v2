// Admin: gerenciar todas as subscriptions
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { CalendarRange, CheckCircle2, Clock, AlertTriangle, XCircle, Search, Filter, RefreshCw, Pause, Play, Ban } from 'lucide-react';
import { formatBRL, formatDateTime } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';

type Status = 'active' | 'pending' | 'past_due' | 'suspended' | 'canceled';

interface Sub {
  id: string;
  plan_code: string;
  payment_method: string;
  status: Status;
  amount_cents: number;
  commission_percent_at_sale: number;
  next_billing_at: string | null;
  failed_charges_count: number;
  created_at: string;
  card_last_4?: string | null;
  customers?: { name?: string; email?: string };
  resellers?: { name?: string; slug?: string };
  license_id?: string | null;
}

const PLAN: Record<string, string> = { monthly: 'Mensal', yearly: 'Anual', '1dia': '1 Dia', '7dias': '7 Dias' };
const STATUS: Record<Status, { label: string; cls: string; icon: any }> = {
  active:    { label: 'Ativo',     cls: 'text-emerald-400 bg-emerald-500/10',  icon: CheckCircle2 },
  pending:   { label: 'Pendente',  cls: 'text-amber-400 bg-amber-500/10',     icon: Clock },
  past_due:  { label: 'Em atraso', cls: 'text-orange-400 bg-orange-500/10',  icon: AlertTriangle },
  suspended: { label: 'Suspenso',  cls: 'text-red-400 bg-red-500/10',         icon: XCircle },
  canceled:  { label: 'Cancelado', cls: 'text-text-dim bg-white/5',           icon: XCircle },
};

export default function Subscriptions() {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*, customers(name,email), resellers(name,slug)')
      .order('created_at', { ascending: false })
      .limit(500);
    setSubs((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => subs.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.customers?.name?.toLowerCase().includes(q) ||
      s.customers?.email?.toLowerCase().includes(q) ||
      s.resellers?.name?.toLowerCase().includes(q) ||
      s.resellers?.slug?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }), [subs, filterStatus, search]);

  const counts = useMemo(() => ({
    all: subs.length,
    active: subs.filter(s => s.status === 'active').length,
    past_due: subs.filter(s => s.status === 'past_due').length,
    suspended: subs.filter(s => s.status === 'suspended').length,
    canceled: subs.filter(s => s.status === 'canceled').length,
  }), [subs]);

  const totalMRR = useMemo(() => subs
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.plan_code === 'yearly' ? Math.round(s.amount_cents / 12) : s.amount_cents), 0),
  [subs]);

  const updateStatus = async (sub: Sub, newStatus: Status) => {
    const update: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'canceled') update.canceled_at = new Date().toISOString();
    if (newStatus === 'suspended') update.suspended_at = new Date().toISOString();
    if (newStatus === 'active') { update.suspended_at = null; update.failed_charges_count = 0; }
    const { error } = await supabase.from('subscriptions').update(update).eq('id', sub.id);
    if (error) { toast.error(error.message); return; }
    if (sub.license_id) {
      const licenseStatus = newStatus === 'active' ? 'active' :
                            newStatus === 'suspended' ? 'suspended' :
                            newStatus === 'canceled' ? 'cancelled' : null;
      if (licenseStatus) {
        await supabase.from('licenses').update({ status: licenseStatus }).eq('id', sub.license_id);
      }
    }
    toast.success(`Status alterado: ${STATUS[newStatus].label}`);
    load();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={CalendarRange} title="Assinaturas" subtitle={`${counts.all} totais · ${counts.active} ativos · MRR ${formatBRL(totalMRR)}`} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <Stat label="Total" value={String(counts.all)} />
        <Stat label="Ativos" value={String(counts.active)} highlight />
        <Stat label="Em atraso" value={String(counts.past_due)} warn={counts.past_due > 0} />
        <Stat label="Suspensos" value={String(counts.suspended)} warn={counts.suspended > 0} />
        <Stat label="MRR Total" value={formatBRL(totalMRR)} highlight />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cliente, revenda, ID..." className="input-dsl !pl-9 !py-2 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input-dsl !py-2 text-sm !w-auto">
          <option value="all">Todos ({counts.all})</option>
          <option value="active">Ativos ({counts.active})</option>
          <option value="past_due">Em atraso ({counts.past_due})</option>
          <option value="suspended">Suspensos ({counts.suspended})</option>
          <option value="canceled">Cancelados ({counts.canceled})</option>
          <option value="pending">Pendentes ({subs.filter(s => s.status === 'pending').length})</option>
        </select>
        <button onClick={load} className="cta-ghost !py-2 !px-3 text-sm inline-flex items-center gap-2">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {loading ? <div className="grid place-items-center py-16"><LoaderRing /></div> : (
        <div className="space-y-2">
          {filtered.map(s => {
            const meta = STATUS[s.status];
            const Icon = meta.icon;
            return (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="holo-card p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary text-sm font-bold shrink-0">
                    {(s.customers?.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.customers?.name || 'Sem nome'}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider inline-flex items-center gap-1 ${meta.cls}`}>
                        <Icon size={10} /> {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted truncate">{s.customers?.email}</div>
                    <div className="text-xs text-text-dim mt-1 flex flex-wrap gap-2">
                      <span>📦 {PLAN[s.plan_code] || s.plan_code}</span>
                      <span>💳 {s.payment_method === 'pix' ? 'PIX' : `Cartão ${s.card_last_4 || ''}`}</span>
                      <span>👤 Revenda: {s.resellers?.name || '—'}</span>
                      {s.next_billing_at && <span>📅 Renova: {formatDateTime(s.next_billing_at)}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{formatBRL(s.amount_cents)}</div>
                    <div className="text-[10px] text-text-dim">{s.commission_percent_at_sale}% revenda</div>
                  </div>
                </div>
                {(s.failed_charges_count || 0) > 0 && (
                  <div className="mt-2 text-xs text-amber-300 flex items-center gap-1">
                    <AlertTriangle size={12} /> {s.failed_charges_count} cobranças falhadas
                  </div>
                )}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {s.status !== 'active' && (
                    <button onClick={() => updateStatus(s, 'active')} className="cta-ghost !py-1.5 !px-3 text-xs inline-flex items-center gap-1">
                      <Play size={11} className="text-emerald-400" /> Ativar
                    </button>
                  )}
                  {s.status === 'active' && (
                    <button onClick={() => updateStatus(s, 'suspended')} className="cta-ghost !py-1.5 !px-3 text-xs inline-flex items-center gap-1">
                      <Pause size={11} className="text-amber-400" /> Suspender
                    </button>
                  )}
                  {s.status !== 'canceled' && (
                    <button
                      onClick={() => { if (confirm('Cancelar definitivamente?')) updateStatus(s, 'canceled'); }}
                      className="cta-ghost !py-1.5 !px-3 text-xs inline-flex items-center gap-1 hover:bg-red-500/10"
                    >
                      <Ban size={11} className="text-red-400" /> Cancelar
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-text-muted text-sm">Nenhuma assinatura encontrada</div>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  const cls = warn ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
              highlight ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
              'bg-white/5 border-white/5';
  return (
    <div className={`rounded-xl p-3 border ${cls}`}>
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
