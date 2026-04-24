import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { TicketPercent, Plus, Trash2, Power, PowerOff, X } from 'lucide-react';
import { formatDate, formatBRL } from '@/lib/utils';
import { toast } from 'sonner';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';

type Coupon = {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  applicable_plans: string[] | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

const PLAN_CODES = ['1dia', '7dias', '30dias', 'vitalicio'];

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 10, applicable_plans: [] as string[], max_uses: null as number | null,
    expires_at: '', active: true,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons((data || []) as Coupon[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePlan = (p: string) => {
    setForm(f => ({ ...f, applicable_plans: f.applicable_plans.includes(p) ? f.applicable_plans.filter(x => x !== p) : [...f.applicable_plans, p] }));
  };

  const save = async () => {
    if (!form.code.trim()) { toast.error('Código obrigatório'); return; }
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'percent' ? Number(form.discount_value) : Math.round(Number(form.discount_value) * 100),
      applicable_plans: form.applicable_plans.length ? form.applicable_plans : null,
      max_uses: form.max_uses,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      active: form.active,
    };
    const { error } = await supabase.from('coupons').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Cupom criado');
    setCreating(false);
    setForm({ code: '', description: '', discount_type: 'percent', discount_value: 10, applicable_plans: [], max_uses: null, expires_at: '', active: true });
    load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(c.active ? 'Desativado' : 'Ativado');
    load();
  };

  const deleteCoupon = async (c: Coupon) => {
    if (!confirm(`Deletar o cupom ${c.code}?`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deletado');
    load();
  };

  const statusOf = (c: Coupon) => {
    if (!c.active) return { label: 'Inativo', color: 'text-text-muted', bg: 'bg-white/10' };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: 'Expirado', color: 'text-red-400', bg: 'bg-red-500/15' };
    if (c.max_uses && c.uses_count >= c.max_uses) return { label: 'Esgotado', color: 'text-accent-gold', bg: 'bg-accent-gold/15' };
    return { label: 'Ativo', color: 'text-primary', bg: 'bg-primary/15' };
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={TicketPercent} title="Cupons de desconto" subtitle={`${coupons.filter(c => c.active).length} ativos de ${coupons.length} criados`}
        actions={<button onClick={() => setCreating(true)} className="cta-neon flex items-center gap-2 text-sm !py-2.5"><span className="relative z-10 flex items-center gap-2"><Plus size={14} /> Novo cupom</span></button>}
      />

      {loading ? <div className="min-h-[40vh] flex items-center justify-center"><LoaderRing size={32} /></div> :
       coupons.length === 0 ? <div className="holo-card p-12 text-center text-text-muted">Nenhum cupom criado ainda.</div> :
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c, i) => {
            const s = statusOf(c);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="holo-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <code className="font-mono font-bold text-lg tracking-wider">{c.code}</code>
                    {c.description && <p className="text-xs text-text-muted mt-1">{c.description}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                </div>

                <div className="text-3xl font-display font-bold text-gradient mb-3">
                  {c.discount_type === 'percent' ? `${c.discount_value}%` : formatBRL(c.discount_value)} off
                </div>

                <div className="space-y-1 text-xs text-text-muted mb-4">
                  <div>Usos: <span className="text-text-primary font-mono">{c.uses_count}{c.max_uses ? `/${c.max_uses}` : ' / ∞'}</span></div>
                  <div>Expira: <span className="text-text-primary">{c.expires_at ? formatDate(c.expires_at) : 'Nunca'}</span></div>
                  <div>Planos: <span className="text-text-primary">{c.applicable_plans?.length ? c.applicable_plans.join(', ') : 'Todos'}</span></div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => toggleActive(c)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1.5">
                    {c.active ? <><PowerOff size={12} /> Desativar</> : <><Power size={12} className="text-primary" /> Ativar</>}
                  </button>
                  <button onClick={() => deleteCoupon(c)} className="text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="holo-card holo-permanent relative w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setCreating(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5"><X size={18} /></button>
            <h3 className="text-xl font-display font-bold mb-6">Novo cupom</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-text-muted mb-2">Código</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DEV50" maxLength={30} className="input-dsl font-mono uppercase" /></div>
              <div><label className="block text-sm text-text-muted mb-2">Descrição (opcional)</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Desconto de lançamento" className="input-dsl" /></div>

              <div>
                <label className="block text-sm text-text-muted mb-2">Tipo de desconto</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({ ...form, discount_type: 'percent' })} className={`px-4 py-3 rounded-xl text-sm font-medium ${form.discount_type === 'percent' ? 'bg-primary/10 border border-primary/40 text-primary' : 'bg-white/5 border border-white/10'}`}>Percentual (%)</button>
                  <button onClick={() => setForm({ ...form, discount_type: 'fixed' })} className={`px-4 py-3 rounded-xl text-sm font-medium ${form.discount_type === 'fixed' ? 'bg-primary/10 border border-primary/40 text-primary' : 'bg-white/5 border border-white/10'}`}>Valor fixo (R$)</button>
                </div>
              </div>

              <div><label className="block text-sm text-text-muted mb-2">Valor do desconto {form.discount_type === 'percent' ? '(%)' : '(R$)'}</label>
                <input type="number" min={0} step={form.discount_type === 'percent' ? 1 : 0.01} value={form.discount_value} onChange={e => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })} className="input-dsl font-mono" /></div>

              <div>
                <label className="block text-sm text-text-muted mb-2">Planos aplicáveis (vazio = todos)</label>
                <div className="flex flex-wrap gap-2">
                  {PLAN_CODES.map(p => (
                    <button key={p} onClick={() => togglePlan(p)} className={`text-xs px-3 py-1.5 rounded-lg transition-all ${form.applicable_plans.includes(p) ? 'bg-primary text-void' : 'bg-white/5 text-text-muted'}`}>{p}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-text-muted mb-2">Limite de usos</label>
                  <input type="number" min={0} value={form.max_uses || ''} onChange={e => setForm({ ...form, max_uses: e.target.value ? parseInt(e.target.value) : null })} placeholder="∞" className="input-dsl" /></div>
                <div><label className="block text-sm text-text-muted mb-2">Expira em</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="input-dsl" /></div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <button onClick={() => setCreating(false)} className="cta-ghost">Cancelar</button>
                <button onClick={save} className="cta-neon"><span className="relative z-10">Criar cupom</span></button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
