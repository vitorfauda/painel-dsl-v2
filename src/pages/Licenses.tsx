import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Key, Search, Copy, Check, X, Trash2, Edit3, Power, PowerOff, Save, Clock, CalendarPlus, Infinity as InfinityIcon } from 'lucide-react';
import { formatDate, formatDateTime, copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type License = {
  id: string;
  license_key: string;
  customer_id: string | null;
  plan_id: string | null;
  plan_code?: string;
  plan_name?: string;
  status: string;
  max_activations: number;
  activations_count?: number;
  expires_at: string | null;
  activated_at: string | null;
  created_at: string;
  customer?: { name: string; email: string; phone: string };
};

type Plan = { id: string; code: string; name: string; duration_days: number | null };

type Tab = 'all' | 'active' | 'expired' | 'suspended';

export default function Licenses() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [detail, setDetail] = useState<License | null>(null);
  const [editing, setEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: lic }, { data: p }] = await Promise.all([
      supabase.from('licenses').select('*, customer:customers(name,email,phone), plan:plans(code,name,duration_days)').order('created_at', { ascending: false }).limit(500),
      supabase.from('plans').select('id, code, name, duration_days').order('duration_days', { ascending: true, nullsFirst: false }),
    ]);
    const mapped = (lic || []).map((l: any) => ({
      ...l,
      plan_code: l.plan?.code,
      plan_name: l.plan?.name,
    }));
    setLicenses(mapped as License[]);
    setPlans((p || []) as Plan[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const now = new Date();
  const isExpired = (l: License): boolean => !!l.expires_at && new Date(l.expires_at) < now;

  const filtered = licenses.filter(l => {
    if (tab === 'active' && (l.status !== 'active' || isExpired(l))) return false;
    if (tab === 'expired' && !isExpired(l)) return false;
    if (tab === 'suspended' && l.status !== 'suspended') return false;
    if (search) {
      const q = search.toLowerCase();
      return l.license_key?.toLowerCase().includes(q) ||
             l.customer?.name?.toLowerCase().includes(q) ||
             l.customer?.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: licenses.length,
    active: licenses.filter(l => l.status === 'active' && !isExpired(l)).length,
    expired: licenses.filter(l => isExpired(l)).length,
    suspended: licenses.filter(l => l.status === 'suspended').length,
  };

  const copyKey = async (id: string, key: string) => {
    await copyToClipboard(key);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    toast.success('Chave copiada!');
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('licenses').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Status atualizado');
    load();
    if (detail?.id === id) setDetail({ ...detail, status });
  };

  const deleteLicense = async (id: string) => {
    if (!confirm('Deletar essa licença permanentemente?')) return;
    const { error } = await supabase.from('licenses').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Licença excluída');
    setDetail(null); load();
  };

  const saveEdit = async (id: string, changes: Partial<License>) => {
    const { error } = await supabase.from('licenses').update(changes).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Licença atualizada');
    setEditing(false);
    load();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={Key} title="Licenças" subtitle={`${counts.all} licenças · ${counts.active} ativas`} />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {([
          ['all', `Todas (${counts.all})`],
          ['active', `Ativas (${counts.active})`],
          ['expired', `Expiradas (${counts.expired})`],
          ['suspended', `Suspensas (${counts.suspended})`],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as Tab)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            tab === k ? 'bg-primary text-void' : 'bg-white/5 text-text-muted hover:text-text-primary'
          }`}>{l}</button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por chave, cliente ou email..." className="input-dsl pl-10" />
      </div>

      {loading ? <div className="min-h-[40vh] flex items-center justify-center"><LoaderRing size={32} /></div> :
       filtered.length === 0 ? <div className="holo-card p-12 text-center text-text-muted">Nenhuma licença encontrada.</div> :
        <div className="holo-card overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-text-muted text-left text-xs uppercase tracking-wider" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <th className="p-4 font-medium">Chave</th>
                  <th className="p-4 font-medium">Cliente</th>
                  <th className="p-4 font-medium">Plano</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Expira</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{l.license_key?.substring(0, 14)}...</code>
                        <button onClick={() => copyKey(l.id, l.license_key)} className="opacity-60 hover:opacity-100">
                          {copiedId === l.id ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">{l.customer?.name || '—'}</div>
                      <div className="text-xs text-text-muted">{l.customer?.email}</div>
                    </td>
                    <td className="p-4"><span className="text-xs px-2 py-1 rounded-full bg-white/5">{l.plan_code || l.plan_name || '—'}</span></td>
                    <td className="p-4"><StatusBadge l={l} isExp={isExpired(l)} /></td>
                    <td className="p-4 text-text-muted text-xs">{formatDate(l.expires_at)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setDetail(l); setEditing(false); }} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary transition-all">
                        Detalhes
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>}

      {detail && (
        <LicenseDrawer
          license={detail}
          plans={plans}
          editing={editing}
          onEdit={() => setEditing(true)}
          onClose={() => { setDetail(null); setEditing(false); }}
          onSave={(changes: Partial<License>) => saveEdit(detail.id, changes)}
          onCancel={() => setEditing(false)}
          onStatus={(s: string) => updateStatus(detail.id, s)}
          onDelete={() => deleteLicense(detail.id)}
          onCopy={() => copyKey(detail.id, detail.license_key)}
          copied={copiedId === detail.id}
        />
      )}
    </div>
  );
}

function StatusBadge({ l, isExp }: { l: License; isExp: boolean }) {
  if (isExp) return <span className="text-xs px-2 py-1 rounded-full bg-red-500/15 text-red-400">Expirada</span>;
  if (l.status === 'active') return <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">Ativa</span>;
  if (l.status === 'suspended') return <span className="text-xs px-2 py-1 rounded-full bg-accent-gold/15 text-accent-gold">Suspensa</span>;
  return <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-text-muted">{l.status}</span>;
}

// Converte ISO → formato datetime-local (YYYY-MM-DDTHH:mm) no timezone SP
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  // Ajusta pro timezone local do browser
  const tzOffset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}

// datetime-local → ISO
function fromLocalInput(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

function LicenseDrawer({ license, plans, editing, onEdit, onClose, onSave, onCancel, onStatus, onDelete, onCopy, copied }: any) {
  const [planId, setPlanId] = useState(license.plan_id || '');
  const [expiresAt, setExpiresAt] = useState(toLocalInput(license.expires_at));
  const [maxActivations, setMaxActivations] = useState(license.max_activations || 3);
  const [status, setStatus] = useState(license.status);

  const isExp = !!license.expires_at && new Date(license.expires_at) < new Date();

  // Adiciona tempo (em ms) a partir de AGORA (se expirada) ou da data atual (se ainda ativa)
  const addTime = (ms: number) => {
    const base = (!expiresAt || new Date(expiresAt) < new Date()) ? new Date() : new Date(expiresAt);
    const next = new Date(base.getTime() + ms);
    setExpiresAt(toLocalInput(next.toISOString()));
    // Se estava expirada, muda status automaticamente pra active
    if (isExp || status === 'expired') setStatus('active');
  };

  const setVitalicia = () => {
    setExpiresAt('');
    if (status === 'expired') setStatus('active');
  };

  const handleSave = () => {
    onSave({
      plan_id: planId || null,
      expires_at: fromLocalInput(expiresAt),
      max_activations: Number(maxActivations) || 3,
      status,
    });
  };

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-deep border-l h-full overflow-y-auto"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="sticky top-0 flex items-center justify-between p-5 border-b backdrop-blur-xl z-10" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,15,26,0.9)' }}>
          <h3 className="font-display font-bold text-lg">Licença</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-[10px] text-text-dim uppercase tracking-widest font-semibold mb-2">Chave</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-xl bg-void/50 border text-xs break-all" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{license.license_key}</code>
              <button onClick={onCopy} className="cta-ghost !px-3 !py-3">{copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}</button>
            </div>
          </div>

          {license.customer && (
            <div>
              <div className="text-[10px] text-text-dim uppercase tracking-widest font-semibold mb-2">Cliente</div>
              <div className="p-4 rounded-xl bg-white/5">
                <div className="font-medium">{license.customer.name}</div>
                <div className="text-sm text-text-muted">{license.customer.email}</div>
                <div className="text-sm text-text-muted">{license.customer.phone}</div>
              </div>
            </div>
          )}

          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Status" value={<StatusBadge l={license} isExp={isExp} />} />
                <Info label="Plano" value={license.plan_code || license.plan_name || '—'} />
                <Info label="Expira em" value={formatDate(license.expires_at)} />
                <Info label="Ativada em" value={formatDateTime(license.activated_at)} />
                <Info label="Máx. ativações" value={license.max_activations} />
                <Info label="Criada em" value={formatDate(license.created_at)} />
              </div>

              <div className="space-y-2">
                {/* Botoes rapidos de tempo direto na visualizacao */}
                {(isExp || license.status === 'active') && (
                  <div>
                    <div className="text-[10px] text-text-dim uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
                      <CalendarPlus size={12} /> Adicionar tempo rápido
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <QuickExtendBtn label="+1h" license={license} ms={60*60*1000} onSave={onSave} />
                      <QuickExtendBtn label="+1 dia" license={license} ms={24*60*60*1000} onSave={onSave} />
                      <QuickExtendBtn label="+7 dias" license={license} ms={7*24*60*60*1000} onSave={onSave} />
                      <QuickExtendBtn label="+30 dias" license={license} ms={30*24*60*60*1000} onSave={onSave} />
                    </div>
                  </div>
                )}

                <button onClick={onEdit} className="cta-ghost w-full flex items-center justify-center gap-2 mt-2"><Edit3 size={14} /> Editar manualmente</button>
                <div className="grid grid-cols-2 gap-2">
                  {license.status !== 'active' && <button onClick={() => onStatus('active')} className="cta-ghost !py-2 text-sm flex items-center justify-center gap-2"><Power size={14} className="text-primary" /> Ativar</button>}
                  {license.status !== 'suspended' && <button onClick={() => onStatus('suspended')} className="cta-ghost !py-2 text-sm flex items-center justify-center gap-2"><PowerOff size={14} className="text-accent-gold" /> Suspender</button>}
                </div>
                <button onClick={onDelete} className="w-full rounded-xl py-3 text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 transition-all">
                  <Trash2 size={14} /> Excluir permanentemente
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              {isExp && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                  <Clock size={14} /> Licença expirada. Ao adicionar tempo, ela será reativada automaticamente.
                </div>
              )}

              {/* Atalhos de tempo */}
              <div>
                <label className="block text-sm text-text-muted mb-2 flex items-center gap-2"><CalendarPlus size={14} /> Adicionar tempo</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <button onClick={() => addTime(10 * MIN)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+10 min</button>
                  <button onClick={() => addTime(30 * MIN)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+30 min</button>
                  <button onClick={() => addTime(1 * HOUR)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+1 hora</button>
                  <button onClick={() => addTime(3 * HOUR)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+3 horas</button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <button onClick={() => addTime(1 * DAY)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+1 dia</button>
                  <button onClick={() => addTime(7 * DAY)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+7 dias</button>
                  <button onClick={() => addTime(30 * DAY)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+30 dias</button>
                  <button onClick={() => addTime(90 * DAY)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+90 dias</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => addTime(365 * DAY)} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-all">+1 ano</button>
                  <button onClick={setVitalicia} className="px-2 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-medium transition-all flex items-center justify-center gap-1"><InfinityIcon size={12} /> Vitalícia</button>
                </div>
              </div>

              {/* Data/hora manual */}
              <div>
                <label className="block text-sm text-text-muted mb-2">Expira em (data + hora)</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="input-dsl" />
                <div className="text-xs text-text-dim mt-1">Vazio = licença vitalícia (nunca expira)</div>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-2">Plano</label>
                <select value={planId} onChange={e => setPlanId(e.target.value)} className="input-dsl">
                  <option value="">— sem plano —</option>
                  {plans.map((p: Plan) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-2">Máx. ativações</label>
                  <input type="number" min={1} value={maxActivations} onChange={e => setMaxActivations(e.target.value)} className="input-dsl" />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-2">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="input-dsl">
                    <option value="active">Ativa</option>
                    <option value="suspended">Suspensa</option>
                    <option value="expired">Expirada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={onCancel} className="cta-ghost" type="button">Cancelar</button>
                <button onClick={handleSave} className="cta-neon flex items-center justify-center gap-2"><span className="relative z-10 flex items-center gap-2"><Save size={14} /> Salvar</span></button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 rounded-xl bg-white/5">
      <div className="text-[10px] text-text-dim uppercase tracking-wider font-semibold mb-1">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function QuickExtendBtn({ label, license, ms, onSave }: { label: string; license: any; ms: number; onSave: (c: any) => void }) {
  const handle = () => {
    const isExp = !!license.expires_at && new Date(license.expires_at) < new Date();
    const base = (!license.expires_at || isExp) ? new Date() : new Date(license.expires_at);
    const next = new Date(base.getTime() + ms);
    onSave({
      expires_at: next.toISOString(),
      status: 'active',
    });
  };
  return (
    <button
      onClick={handle}
      className="px-2 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-medium transition-all"
    >
      {label}
    </button>
  );
}
