import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FileKey, User, Mail, Phone, Package, Clock, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { LoaderRing } from '@/components/LoaderRing';
import { PageHeader } from '@/components/PageHeader';
import { maskPhone, copyToClipboard, formatBRL } from '@/lib/utils';

type Plan = {
  id: string;
  code: string;
  name: string;
  duration_days: number | null;
  max_activations: number;
  price_cents: number;
};

export default function IssueLicense() {
  const nav = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ key: string; planName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    planId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    maxActivations: 1,
    testMinutes: 10,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('plans').select('*').eq('active', true).order('duration_days', { ascending: true, nullsFirst: false });
      setPlans((data || []) as Plan[]);
      if (data && data.length > 0) setForm(f => ({ ...f, planId: (data as any)[0].id }));
    })();
  }, []);

  const selectedPlan = plans.find(p => p.id === form.planId);
  const isTest = selectedPlan?.code === 'teste';

  const submit = async () => {
    if (!form.planId) { toast.error('Escolha um plano'); return; }
    if (!form.customerEmail) { toast.error('Email obrigatório'); return; }
    setLoading(true);
    try {
      const phoneDigits = form.customerPhone.replace(/\D/g, '');

      // Upsert customer por phone (ou cria novo se sem phone)
      let customerId: string | null = null;
      if (phoneDigits) {
        const { data: existing } = await supabase.from('customers').select('id').eq('phone', phoneDigits).maybeSingle();
        if (existing) {
          customerId = existing.id;
          await supabase.from('customers').update({ name: form.customerName, email: form.customerEmail }).eq('id', customerId);
        } else {
          const { data: newCust, error } = await supabase.from('customers').insert({
            name: form.customerName || form.customerEmail.split('@')[0],
            email: form.customerEmail,
            phone: phoneDigits,
          }).select('id').single();
          if (error) throw new Error(error.message);
          customerId = newCust.id;
        }
      } else {
        const { data: existing } = await supabase.from('customers').select('id').eq('email', form.customerEmail).maybeSingle();
        if (existing) {
          customerId = existing.id;
          await supabase.from('customers').update({ name: form.customerName }).eq('id', customerId);
        } else {
          const { data: newCust, error } = await supabase.from('customers').insert({
            name: form.customerName || form.customerEmail.split('@')[0],
            email: form.customerEmail,
          }).select('id').single();
          if (error) throw new Error(error.message);
          customerId = newCust.id;
        }
      }

      // Calcula expires_at
      let expiresAt: string | null = null;
      if (isTest) {
        expiresAt = new Date(Date.now() + form.testMinutes * 60 * 1000).toISOString();
      } else if (selectedPlan?.duration_days) {
        expiresAt = new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000).toISOString();
      }

      // Cria licença (license_key gerado por trigger)
      const { data: lic, error: licErr } = await supabase.from('licenses').insert({
        customer_id: customerId,
        plan_id: form.planId,
        status: 'active',
        expires_at: expiresAt,
        max_activations: Number(form.maxActivations) || 1,
        mercadopago_payment_id: 'manual',
      }).select('license_key').single();
      if (licErr) throw new Error(licErr.message);

      setGenerated({ key: lic.license_key, planName: selectedPlan?.name || '' });
      toast.success('Licença emitida!');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    await copyToClipboard(generated.key);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('Copiado!');
  };

  if (generated) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader icon={FileKey} title="Licença emitida" subtitle="Copie a chave e repasse pro cliente" />
        <div className="holo-card holo-permanent p-8 max-w-2xl">
          <div className="mb-6">
            <div className="text-[10px] text-text-dim uppercase tracking-widest font-semibold mb-2">Chave gerada</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-4 rounded-xl bg-void/50 border text-sm break-all font-mono" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                {generated.key}
              </code>
              <button onClick={handleCopy} className="cta-ghost !px-4 !py-4 shrink-0">
                {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="text-xs text-text-muted mt-2">Plano: <span className="text-primary font-semibold">{generated.planName}</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setGenerated(null); setForm({ ...form, customerName: '', customerEmail: '', customerPhone: '' }); }} className="cta-ghost flex-1">Emitir outra</button>
            <button onClick={() => nav('/licenses')} className="cta-neon flex-1"><span className="relative z-10">Ver licenças</span></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={FileKey} title="Emitir licença" subtitle="Criação manual de uma licença" />

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
        <div className="space-y-6">
          {/* Cliente */}
          <section className="holo-card p-6">
            <h3 className="font-display font-bold mb-4 flex items-center gap-2"><User size={16} className="text-primary" /> Cliente</h3>
            <div className="space-y-3">
              <Field label="Nome"><input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="João Silva" className="input-dsl" /></Field>
              <Field label="Email *" icon={Mail}><input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="joao@email.com" className="input-dsl pl-10" /></Field>
              <Field label="WhatsApp" icon={Phone}><input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: maskPhone(e.target.value) })} placeholder="(27) 99999-9999" maxLength={15} className="input-dsl pl-10" /></Field>
            </div>
          </section>

          {/* Plano */}
          <section className="holo-card p-6">
            <h3 className="font-display font-bold mb-4 flex items-center gap-2"><Package size={16} className="text-primary" /> Plano</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {plans.map(p => (
                <button key={p.id} onClick={() => setForm({ ...form, planId: p.id })} className={`text-left p-4 rounded-xl border transition-all ${
                  form.planId === p.id ? 'bg-primary/10 border-primary/40' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{p.name}</span>
                    {form.planId === p.id && <Check size={14} className="text-primary" />}
                  </div>
                  <div className="text-xs text-text-muted">
                    {p.duration_days ? `${p.duration_days} dias` : 'Vitalícia'} · {formatBRL(p.price_cents)}
                  </div>
                </button>
              ))}
            </div>

            {isTest && (
              <div className="mt-4">
                <Field label="Duração do teste (minutos)" icon={Clock}>
                  <input type="number" min={1} value={form.testMinutes} onChange={e => setForm({ ...form, testMinutes: parseInt(e.target.value) || 10 })} className="input-dsl pl-10" />
                </Field>
              </div>
            )}

            <div className="mt-4">
              <Field label="Máx. ativações">
                <input type="number" min={1} value={form.maxActivations} onChange={e => setForm({ ...form, maxActivations: parseInt(e.target.value) || 1 })} className="input-dsl" />
              </Field>
            </div>
          </section>
        </div>

        {/* Resumo */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="holo-card holo-permanent p-6">
            <h3 className="font-display font-bold mb-4">Resumo</h3>
            <div className="space-y-3 text-sm mb-6">
              <Row label="Cliente" value={form.customerName || form.customerEmail || '—'} />
              <Row label="Plano" value={selectedPlan?.name || '—'} />
              <Row label="Duração" value={isTest ? `${form.testMinutes} min` : selectedPlan?.duration_days ? `${selectedPlan.duration_days} dias` : selectedPlan ? 'Vitalícia' : '—'} />
              <Row label="Ativações" value={form.maxActivations} />
              <div className="h-px my-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <Row label="Valor estimado" value={selectedPlan ? formatBRL(selectedPlan.price_cents) : '—'} bold />
            </div>
            <button onClick={submit} disabled={loading} className="cta-neon w-full flex items-center justify-center gap-2">
              {loading ? <LoaderRing size={18} /> : <span className="relative z-10">Emitir licença</span>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: any) {
  return (
    <div>
      <label className="block text-sm text-text-muted mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim z-10" />}
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={bold ? 'font-bold text-primary' : 'font-medium'}>{value}</span>
    </div>
  );
}
