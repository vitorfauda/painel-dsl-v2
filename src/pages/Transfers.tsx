// Admin: lista todos os saques + autoriza manual fora do cooldown
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ArrowDownToLine, CheckCircle2, Clock, XCircle, Search, RefreshCw } from 'lucide-react';
import { formatBRL, formatDateTime } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

interface Transfer {
  id: string;
  reseller_id: string;
  pagarme_transfer_id?: string;
  amount_cents: number;
  fee_cents: number;
  net_cents: number;
  status: string;
  requested_at: string;
  completed_at?: string;
  failed_reason?: string;
  resellers?: { name?: string; email?: string };
}

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  pending:    { label: 'Pendente',     cls: 'text-amber-400 bg-amber-500/10',     icon: Clock },
  processing: { label: 'Processando',  cls: 'text-blue-400 bg-blue-500/10',       icon: Clock },
  completed:  { label: 'Concluído',    cls: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle2 },
  failed:     { label: 'Falhou',       cls: 'text-red-400 bg-red-500/10',         icon: XCircle },
};

export default function Transfers() {
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pagarme_transfers')
      .select('*, resellers(name,email)')
      .order('requested_at', { ascending: false })
      .limit(500);
    setTransfers((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => transfers.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.resellers?.name?.toLowerCase().includes(q) ||
      t.resellers?.email?.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.pagarme_transfer_id?.toLowerCase() || '').includes(q)
    );
  }), [transfers, filterStatus, search]);

  const totals = useMemo(() => ({
    pending: transfers.filter(t => t.status === 'pending' || t.status === 'processing').reduce((s, t) => s + t.amount_cents, 0),
    completed: transfers.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount_cents, 0),
    failed: transfers.filter(t => t.status === 'failed').length,
    fees: transfers.filter(t => t.status === 'completed').reduce((s, t) => s + (t.fee_cents || 0), 0),
  }), [transfers]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={ArrowDownToLine} title="Saques" subtitle={`${transfers.length} saques · ${formatBRL(totals.completed)} liberado`} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Stat label="Em processamento" value={formatBRL(totals.pending)} highlight />
        <Stat label="Concluído total" value={formatBRL(totals.completed)} />
        <Stat label="Taxas Pagar.me" value={formatBRL(totals.fees)} />
        <Stat label="Falhas" value={String(totals.failed)} warn={totals.failed > 0} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Revenda, email, ID..." className="input-dsl !pl-9 !py-2 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-dsl !py-2 text-sm !w-auto">
          <option value="all">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="processing">Processando</option>
          <option value="completed">Concluídos</option>
          <option value="failed">Falhados</option>
        </select>
        <button onClick={load} className="cta-ghost !py-2 !px-3 text-sm inline-flex items-center gap-2">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {loading ? <div className="grid place-items-center py-16"><LoaderRing /></div> : (
        <div className="space-y-2">
          {filtered.map(t => {
            const meta = STATUS_META[t.status] || STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="holo-card p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary text-sm font-bold shrink-0">
                    {(t.resellers?.name || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{t.resellers?.name || 'Sem nome'}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider inline-flex items-center gap-1 ${meta.cls}`}>
                        <Icon size={10} /> {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted truncate">{t.resellers?.email}</div>
                    <div className="text-xs text-text-dim mt-1 flex flex-wrap gap-2">
                      <span>📅 Solicitado: {formatDateTime(t.requested_at)}</span>
                      {t.completed_at && <span>✅ Concluído: {formatDateTime(t.completed_at)}</span>}
                      {t.pagarme_transfer_id && <span className="font-mono">PgM: {t.pagarme_transfer_id.substring(0, 16)}…</span>}
                    </div>
                    {t.failed_reason && (
                      <div className="text-xs text-red-400 mt-1">⚠️ {t.failed_reason}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-400">{formatBRL(t.amount_cents)}</div>
                    <div className="text-[10px] text-text-dim">−{formatBRL(t.fee_cents || 0)} taxa</div>
                    <div className="text-xs text-text-primary mt-1">→ {formatBRL(t.net_cents)}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-text-muted text-sm">Nenhum saque encontrado</div>}
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
