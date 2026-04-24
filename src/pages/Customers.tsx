import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Phone, FileKey, Save, X } from 'lucide-react';
import { formatDate, formatBRL, maskPhone } from '@/lib/utils';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  license_count?: number;
  total_spent?: number;
};

export default function Customers() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Customer | null>(null);
  const [customerLicenses, setCustomerLicenses] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const load = async () => {
    setLoading(true);
    const { data: custs } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    const { data: lics } = await supabase.from('licenses').select('customer_id, plan:plans(price_cents)');
    const counts: Record<string, { count: number; spent: number }> = {};
    (lics || []).forEach((l: any) => {
      if (!l.customer_id) return;
      if (!counts[l.customer_id]) counts[l.customer_id] = { count: 0, spent: 0 };
      counts[l.customer_id].count++;
      counts[l.customer_id].spent += (l.plan?.price_cents || 0);
    });
    const enriched = (custs || []).map((c: Customer) => ({
      ...c,
      license_count: counts[c.id]?.count || 0,
      total_spent: counts[c.id]?.spent || 0,
    }));
    setCustomers(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadLicenses = async (id: string) => {
    const { data } = await supabase.from('licenses')
      .select('id, license_key, status, expires_at, created_at, plan:plans(code,name)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });
    setCustomerLicenses(data || []);
  };

  const openDetail = (c: Customer) => {
    setDetail(c);
    setForm({ name: c.name || '', email: c.email || '', phone: maskPhone(c.phone || '') });
    setEditing(false);
    loadLicenses(c.id);
  };

  const save = async () => {
    if (!detail) return;
    const { error } = await supabase.from('customers').update({
      name: form.name, email: form.email, phone: form.phone.replace(/\D/g, ''),
    }).eq('id', detail.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cliente atualizado');
    setEditing(false);
    load();
    setDetail({ ...detail, ...form, phone: form.phone.replace(/\D/g, '') });
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q.replace(/\D/g, ''));
  });

  const totalSpent = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
  const totalLicenses = customers.reduce((s, c) => s + (c.license_count || 0), 0);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <PageHeader icon={Users} title="Clientes" subtitle={`${customers.length} clientes · ${totalLicenses} licenças emitidas · ${formatBRL(totalSpent)} em receita estimada`} />

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, email, WhatsApp..." className="input-dsl pl-10" />
      </div>

      {loading ? <div className="min-h-[40vh] flex items-center justify-center"><LoaderRing size={32} /></div> :
       filtered.length === 0 ? <div className="holo-card p-12 text-center text-text-muted">Nenhum cliente encontrado.</div> :
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <motion.button key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} onClick={() => openDetail(c)} className="holo-card p-5 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center font-bold shrink-0">
                  {c.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-text-muted truncate">{c.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center mt-3">
                <div className="p-2 rounded-lg bg-white/5">
                  <div className="font-display font-bold text-lg">{c.license_count}</div>
                  <div className="text-[10px] text-text-dim uppercase">Licenças</div>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <div className="font-display font-bold text-xs font-tabular">{formatBRL(c.total_spent || 0)}</div>
                  <div className="text-[10px] text-text-dim uppercase">Gasto</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>}

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-deep border-l h-full overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="sticky top-0 flex items-center justify-between p-5 border-b backdrop-blur-xl z-10" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,15,26,0.9)' }}>
              <h3 className="font-display font-bold text-lg">Cliente</h3>
              <button onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-white/5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center text-2xl font-bold">
                  {detail.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold">{detail.name}</div>
                  <div className="text-sm text-text-muted">Desde {formatDate(detail.created_at)}</div>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div><label className="block text-xs text-text-muted mb-1">Nome</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-dsl" /></div>
                  <div><label className="block text-xs text-text-muted mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-dsl" /></div>
                  <div><label className="block text-xs text-text-muted mb-1">WhatsApp</label><input value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} maxLength={15} className="input-dsl" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditing(false)} className="cta-ghost">Cancelar</button>
                    <button onClick={save} className="cta-neon flex items-center justify-center gap-2"><span className="relative z-10 flex items-center gap-2"><Save size={14} /> Salvar</span></button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"><Mail size={14} className="text-text-dim" /><span className="text-sm">{detail.email}</span></div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"><Phone size={14} className="text-text-dim" /><span className="text-sm">{maskPhone(detail.phone || '') || '—'}</span></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <div className="font-display font-bold text-2xl font-tabular text-primary">{detail.license_count}</div>
                  <div className="text-[10px] text-text-dim uppercase">Licenças</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}>
                  <div className="font-display font-bold text-sm font-tabular text-accent-cyan">{formatBRL(detail.total_spent || 0)}</div>
                  <div className="text-[10px] text-text-dim uppercase mt-2">Total gasto</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-text-dim uppercase tracking-widest font-semibold mb-3">Licenças ({customerLicenses.length})</div>
                <div className="space-y-2">
                  {customerLicenses.length === 0 ? <p className="text-sm text-text-muted">Nenhuma licença</p> :
                    customerLicenses.map((l: any) => (
                      <div key={l.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                        <div>
                          <code className="text-xs">{l.license_key?.substring(0, 16)}...</code>
                          <div className="text-[10px] text-text-muted">{l.plan?.name || l.plan?.code}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.status === 'active' ? 'bg-primary/15 text-primary' : 'bg-white/10 text-text-muted'}`}>{l.status}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {!editing && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditing(true)} className="cta-ghost text-sm">Editar cliente</button>
                  <button onClick={() => nav('/issue-license')} className="cta-neon text-sm flex items-center justify-center gap-2"><span className="relative z-10 flex items-center gap-2"><FileKey size={14} /> Emitir licença</span></button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
