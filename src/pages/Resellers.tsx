import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Search, UserCog, Mail, Phone, CheckCircle2, XCircle, MoreHorizontal, X, Copy, Check } from 'lucide-react';
import { formatBRL, formatDateTime, maskCPF, maskPhone, copyToClipboard } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';

type Reseller = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  whatsapp: string;
  cpf: string;
  ref_code: string;
  status: string;
  tier: string;
  total_keys_bought: number;
  total_keys_sold: number;
  total_revenue_cents: number;
  entry_paid: boolean;
  pix_key?: string;
  created_at: string;
};

export default function Resellers() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'active' | 'pending' | 'blocked'>('all');
  const [detail, setDetail] = useState<Reseller | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('resellers').select('*').order('created_at', { ascending: false });
    setResellers((data || []) as Reseller[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = resellers.filter(r => {
    if (tab === 'active' && (!r.entry_paid || r.status !== 'active')) return false;
    if (tab === 'pending' && r.entry_paid) return false;
    if (tab === 'blocked' && r.status !== 'blocked' && r.status !== 'suspended') return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name?.toLowerCase().includes(q) ||
             r.email?.toLowerCase().includes(q) ||
             r.whatsapp?.includes(q.replace(/\D/g, '')) ||
             r.ref_code?.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: resellers.length,
    active: resellers.filter(r => r.entry_paid && r.status === 'active').length,
    pending: resellers.filter(r => !r.entry_paid).length,
    blocked: resellers.filter(r => r.status === 'blocked' || r.status === 'suspended').length,
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('resellers').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Status atualizado');
    load();
    if (detail?.id === id) setDetail({ ...detail, status });
  };

  const copyRef = async (code: string) => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Código copiado!');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        icon={UserCog}
        title="Revendedores"
        subtitle={`${counts.all} cadastros · ${counts.active} ativos`}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {([
          ['all', `Todos (${counts.all})`],
          ['active', `Ativos (${counts.active})`],
          ['pending', `Pendentes (${counts.pending})`],
          ['blocked', `Bloqueados (${counts.blocked})`],
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, email, WhatsApp ou código..." className="input-dsl pl-10" />
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center"><LoaderRing size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="holo-card p-12 text-center text-text-muted">Nenhum revendedor encontrado.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => setDetail(r)}
              className="holo-card p-5 text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center font-bold shrink-0">
                    {r.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.name}</div>
                    <div className="text-xs text-text-muted truncate">{r.email}</div>
                  </div>
                </div>
                <StatusBadge r={r} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Stat label="Compradas" value={r.total_keys_bought || 0} />
                <Stat label="Vendidas" value={r.total_keys_sold || 0} />
                <Stat label="Tier" value={r.tier?.toUpperCase() || 'BRONZE'} small />
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between border-t text-xs text-text-muted" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="font-mono">{r.ref_code}</span>
                <MoreHorizontal size={14} />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Drawer de detalhes */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-deep border-l h-full overflow-y-auto"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="sticky top-0 flex items-center justify-between p-5 border-b backdrop-blur-xl" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,15,26,0.9)' }}>
              <h3 className="font-display font-bold text-lg">Detalhes do revendedor</h3>
              <button onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-white/5"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center text-2xl font-bold">
                  {detail.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold">{detail.name}</div>
                  <StatusBadge r={detail} />
                </div>
              </div>

              <Section title="Contato">
                <Row icon={Mail} value={detail.email} />
                <Row icon={Phone} value={maskPhone(detail.whatsapp)} />
                <Row label="CPF" value={maskCPF(detail.cpf)} />
              </Section>

              <Section title="Resultados">
                <div className="grid grid-cols-3 gap-3">
                  <BigStat label="Compradas" value={detail.total_keys_bought || 0} color="#22d3ee" />
                  <BigStat label="Vendidas" value={detail.total_keys_sold || 0} color="#fbbf24" />
                  <BigStat label="Receita" value={formatBRL(detail.total_revenue_cents || 0)} small color="#22c55e" />
                </div>
              </Section>

              <Section title="Referral">
                <div className="flex gap-2">
                  <input readOnly value={detail.ref_code} className="input-dsl font-mono text-sm" />
                  <button onClick={() => copyRef(detail.ref_code)} className="cta-ghost !px-4 shrink-0">
                    {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
                  </button>
                </div>
              </Section>

              <Section title="Cadastro">
                <Row label="PIX" value={detail.pix_key || '—'} />
                <Row label="Criado em" value={formatDateTime(detail.created_at)} />
                <Row label="Entry paga" value={detail.entry_paid ? 'Sim' : 'Não'} />
              </Section>

              <Section title="Ações">
                <div className="grid grid-cols-2 gap-2">
                  {detail.status !== 'active' && (
                    <button onClick={() => updateStatus(detail.id, 'active')} className="cta-ghost !py-2 text-sm flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} className="text-primary" /> Ativar
                    </button>
                  )}
                  {detail.status !== 'suspended' && (
                    <button onClick={() => updateStatus(detail.id, 'suspended')} className="cta-ghost !py-2 text-sm flex items-center justify-center gap-2">
                      <XCircle size={14} className="text-accent-gold" /> Suspender
                    </button>
                  )}
                  {detail.status !== 'blocked' && (
                    <button onClick={() => updateStatus(detail.id, 'blocked')} className="cta-ghost !py-2 text-sm flex items-center justify-center gap-2 col-span-2">
                      <XCircle size={14} className="text-red-400" /> Bloquear
                    </button>
                  )}
                </div>
              </Section>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, small }: any) {
  return (
    <div>
      <div className={`font-display font-bold ${small ? 'text-xs text-text-primary' : 'text-lg'}`}>{value}</div>
      <div className="text-[10px] text-text-dim uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function BigStat({ label, value, color, small }: any) {
  return (
    <div className="p-3 rounded-xl" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <div className={`font-display font-bold ${small ? 'text-sm' : 'text-2xl'} font-tabular`} style={{ color }}>{value}</div>
      <div className="text-[10px] text-text-dim uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <div className="text-[10px] text-text-dim uppercase tracking-widest font-semibold mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5">
      {Icon && <Icon size={14} className="text-text-dim shrink-0" />}
      {label && <span className="text-text-muted text-xs uppercase w-16">{label}</span>}
      <span className="flex-1 truncate">{value}</span>
    </div>
  );
}

function StatusBadge({ r }: { r: Reseller }) {
  if (!r.entry_paid) return <span className="text-xs px-2 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold">Pendente</span>;
  if (r.status === 'active') return <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">Ativo</span>;
  if (r.status === 'suspended') return <span className="text-xs px-2 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold">Suspenso</span>;
  if (r.status === 'blocked') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Bloqueado</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-text-muted">{r.status}</span>;
}
