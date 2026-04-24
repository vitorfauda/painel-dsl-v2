import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FileKey, User, Mail, Phone, Package, Clock, Check, Copy, Zap, Send } from 'lucide-react';
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
  const [generated, setGenerated] = useState<{ key: string; planName: string; testDuration?: string; sentToWhatsapp?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Modo: 'normal' (form completo) ou 'test' (form simples + envio WA direto)
  const [mode, setMode] = useState<'normal' | 'test'>('test');

  const [form, setForm] = useState({
    planId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    maxActivations: 1,
    testMinutes: 10,
    testNote: '',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('plans').select('*').eq('active', true).order('duration_days', { ascending: true, nullsFirst: false });
      setPlans((data || []) as Plan[]);
      // Default: plano de teste se existir, senão o primeiro
      if (data && data.length > 0) {
        const teste = (data as any[]).find(p => p.code === 'teste');
        setForm(f => ({ ...f, planId: (teste || data[0]).id }));
      }
    })();
  }, []);

  const selectedPlan = plans.find(p => p.id === form.planId);
  const testPlan = plans.find(p => p.code === 'teste');

  // ===== Envio rápido de teste =====
  const submitTest = async () => {
    if (!form.customerPhone || form.customerPhone.replace(/\D/g, '').length < 10) {
      toast.error('WhatsApp inválido');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-license', {
        body: {
          phone: form.customerPhone.replace(/\D/g, ''),
          minutes: form.testMinutes,
          note: form.testNote || '',
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Falha ao gerar teste');

      setGenerated({
        key: data.license_key,
        planName: 'Teste',
        testDuration: data.duration,
        sentToWhatsapp: !data.warning,
      });

      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success('Teste enviado por WhatsApp!');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ===== Submit normal =====
  const submitNormal = async () => {
    if (!form.planId) { toast.error('Escolha um plano'); return; }
    if (!form.customerEmail) { toast.error('Email obrigatório'); return; }
    setLoading(true);
    try {
      const phoneDigits = form.customerPhone.replace(/\D/g, '');
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

      let expiresAt: string | null = null;
      if (selectedPlan?.code === 'teste') {
        expiresAt = new Date(Date.now() + form.testMinutes * 60 * 1000).toISOString();
      } else if (selectedPlan?.duration_days) {
        expiresAt = new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data: lic, error: licErr } = await supabase.from('licenses').insert({
        customer_id: customerId,
        plan_id: form.planId,
        status: 'active',
        expires_at: expiresAt,
        max_activations: Number(form.maxActivations) || 3,
        mercadopago_payment_id: 'manual',
      }).select('id, license_key').single();
      if (licErr) throw new Error(licErr.message);

      // Envia via WhatsApp se tiver telefone
      let sentWa = false;
      if (phoneDigits) {
        try {
          const { data: sendData } = await supabase.functions.invoke('send-license-whatsapp', {
            body: { license_id: lic.id },
          });
          sentWa = !!sendData?.ok;
        } catch (e) {
          console.error('send-license-whatsapp error:', e);
        }
      }

      setGenerated({
        key: lic.license_key,
        planName: selectedPlan?.name || '',
        sentToWhatsapp: sentWa,
      });
      toast.success(sentWa ? 'Licença emitida e enviada no WhatsApp!' : 'Licença emitida!');
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

  // ===== TELA DE SUCESSO =====
  if (generated) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader
          icon={FileKey}
          title={generated.sentToWhatsapp ? 'Teste enviado!' : 'Licença emitida'}
          subtitle={generated.sentToWhatsapp ? `WhatsApp disparado — ${generated.testDuration}` : 'Copie a chave e repasse pro cliente'}
        />
        <div className="holo-card holo-permanent p-8 max-w-2xl">
          {generated.sentToWhatsapp && (
            <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Send size={16} className="text-primary" />
              </div>
              <div className="text-sm">
                <div className="font-semibold text-primary">Mensagem enviada no WhatsApp</div>
                <div className="text-xs text-text-muted">Cliente recebeu a chave + link de download + instruções</div>
              </div>
            </div>
          )}

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
            <div className="text-xs text-text-muted mt-2">
              Plano: <span className="text-primary font-semibold">{generated.planName}</span>
              {generated.testDuration && <> · Duração: <span className="text-primary font-semibold">{generated.testDuration}</span></>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              setGenerated(null);
              setForm({ ...form, customerName: '', customerEmail: '', customerPhone: '', testNote: '' });
            }} className="cta-ghost flex-1">Enviar outro</button>
            <button onClick={() => nav('/licenses')} className="cta-neon flex-1"><span className="relative z-10">Ver licenças</span></button>
          </div>
        </div>
      </div>
    );
  }

  // ===== FORM =====
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader icon={FileKey} title="Emitir licença" subtitle="Criação manual + envio via WhatsApp" />

      {/* Toggle Modo */}
      <div className="inline-flex gap-1 p-1 rounded-xl bg-white/5 mb-6">
        <button
          onClick={() => setMode('test')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            mode === 'test' ? 'bg-primary text-void' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Zap size={14} /> Teste rápido
        </button>
        <button
          onClick={() => setMode('normal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            mode === 'normal' ? 'bg-primary text-void' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <FileKey size={14} /> Manual (plano completo)
        </button>
      </div>

      {mode === 'test' ? (
        // =========== MODO TESTE RÁPIDO ===========
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
          <section className="holo-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-xl bg-accent-cyan/15 border border-accent-cyan/35 flex items-center justify-center">
                <Zap size={18} className="text-accent-cyan" />
              </div>
              <div>
                <h3 className="font-display font-bold">Envio de teste via WhatsApp</h3>
                <p className="text-xs text-text-muted">Basta o WhatsApp do cliente. O resto é automático.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="WhatsApp do cliente" icon={Phone}>
                <input
                  value={form.customerPhone}
                  onChange={e => setForm({ ...form, customerPhone: maskPhone(e.target.value) })}
                  maxLength={15}
                  placeholder="(27) 99999-9999"
                  className="input-dsl pl-10"
                  autoFocus
                />
              </Field>

              <Field label="Duração do teste (minutos)" icon={Clock}>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={form.testMinutes}
                  onChange={e => setForm({ ...form, testMinutes: parseInt(e.target.value) || 10 })}
                  className="input-dsl pl-10 font-mono"
                />
              </Field>

              {/* Atalhos */}
              <div className="flex flex-wrap gap-2">
                {[10, 30, 60, 120, 240].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, testMinutes: m })}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                      form.testMinutes === m ? 'bg-primary text-void font-semibold' : 'bg-white/5 text-text-muted hover:bg-white/10'
                    }`}
                  >
                    {m < 60 ? `${m}min` : `${m/60}h`}
                  </button>
                ))}
              </div>

              <Field label="Observação interna (opcional)">
                <input
                  value={form.testNote}
                  onChange={e => setForm({ ...form, testNote: e.target.value })}
                  placeholder="ex: teste pra lead do grupo X"
                  className="input-dsl"
                />
              </Field>

              <button onClick={submitTest} disabled={loading || !form.customerPhone} className="cta-neon w-full flex items-center justify-center gap-2 mt-2">
                {loading ? <LoaderRing size={18} /> : (
                  <span className="relative z-10 flex items-center gap-2">
                    <Send size={16} /> Gerar e enviar no WhatsApp
                  </span>
                )}
              </button>
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 self-start">
            <div className="holo-card p-5">
              <h4 className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-3">O que o cliente recebe</h4>
              <div className="space-y-2 text-xs text-text-muted">
                <div className="flex items-start gap-2"><Check size={12} className="text-primary mt-0.5 shrink-0" /> Chave de licença formatada</div>
                <div className="flex items-start gap-2"><Check size={12} className="text-primary mt-0.5 shrink-0" /> Link pra baixar a extensão (Drive)</div>
                <div className="flex items-start gap-2"><Check size={12} className="text-primary mt-0.5 shrink-0" /> Duração do teste + data/hora de expiração</div>
                <div className="flex items-start gap-2"><Check size={12} className="text-primary mt-0.5 shrink-0" /> Passo a passo de instalação</div>
                <div className="flex items-start gap-2"><Check size={12} className="text-primary mt-0.5 shrink-0" /> Link pro suporte via WhatsApp</div>
              </div>
              {!testPlan && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  ⚠️ Plano "teste" não encontrado no banco. Crie um plano com <code className="font-mono">code='teste'</code> antes.
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        // =========== MODO NORMAL ===========
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
          <div className="space-y-6">
            <section className="holo-card p-6">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2"><User size={16} className="text-primary" /> Cliente</h3>
              <div className="space-y-3">
                <Field label="Nome"><input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="João Silva" className="input-dsl" /></Field>
                <Field label="Email *" icon={Mail}><input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="joao@email.com" className="input-dsl pl-10" /></Field>
                <Field label="WhatsApp" icon={Phone}><input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: maskPhone(e.target.value) })} placeholder="(27) 99999-9999" maxLength={15} className="input-dsl pl-10" /></Field>
              </div>
            </section>

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

              {selectedPlan?.code === 'teste' && (
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

          <aside className="lg:sticky lg:top-6 self-start">
            <div className="holo-card holo-permanent p-6">
              <h3 className="font-display font-bold mb-4">Resumo</h3>
              <div className="space-y-3 text-sm mb-6">
                <Row label="Cliente" value={form.customerName || form.customerEmail || '—'} />
                <Row label="Plano" value={selectedPlan?.name || '—'} />
                <Row label="Duração" value={selectedPlan?.code === 'teste' ? `${form.testMinutes} min` : selectedPlan?.duration_days ? `${selectedPlan.duration_days} dias` : selectedPlan ? 'Vitalícia' : '—'} />
                <Row label="Ativações" value={form.maxActivations} />
                <div className="h-px my-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <Row label="Valor estimado" value={selectedPlan ? formatBRL(selectedPlan.price_cents) : '—'} bold />
              </div>
              <button onClick={submitNormal} disabled={loading} className="cta-neon w-full flex items-center justify-center gap-2">
                {loading ? <LoaderRing size={18} /> : <span className="relative z-10">Emitir licença</span>}
              </button>
            </div>
          </aside>
        </div>
      )}
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
