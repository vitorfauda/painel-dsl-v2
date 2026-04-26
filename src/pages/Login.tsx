import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { LoaderRing } from '@/components/LoaderRing';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    setLoading(false);
    if (error) { toast.error('Credenciais inválidas'); return; }
    toast.success('Bem-vindo, admin');
    nav('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="grain" />
      <div className="mesh-blob" style={{ width: 500, height: 500, top: '10%', left: '20%', background: '#22c55e' }} />
      <div className="mesh-blob" style={{ width: 400, height: 400, bottom: '10%', right: '10%', background: '#22d3ee' }} />

      <div className="holo-card holo-permanent p-8 sm:p-10 w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="h-14 w-14 rounded-2xl overflow-hidden">
              <img src="/logo.png" alt="DSL" className="h-full w-full object-contain" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/50 blur-xl -z-10" />
          </div>
          <h1 className="text-3xl font-display font-bold">Painel Admin</h1>
          <p className="text-text-muted text-sm mt-1">Dev Sem Limites · Licenças</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-2">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input {...register('email')} type="email" placeholder="admin@devsemlimites.site" className={`input-dsl pl-10 ${errors.email ? 'error' : ''}`} />
            </div>
            {errors.email && <div className="text-xs text-red-400 mt-1">{errors.email.message}</div>}
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input {...register('password')} type="password" placeholder="••••••••" className={`input-dsl pl-10 ${errors.password ? 'error' : ''}`} />
            </div>
            {errors.password && <div className="text-xs text-red-400 mt-1">{errors.password.message}</div>}
          </div>

          <button type="submit" disabled={loading} className="cta-neon w-full flex items-center justify-center gap-2 mt-2">
            {loading ? <LoaderRing size={20} /> : <span className="relative z-10 flex items-center gap-2">Entrar <ArrowRight size={18} /></span>}
          </button>
        </form>

        <div className="text-center text-xs text-text-dim mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          Acesso restrito · Apenas administradores autorizados
        </div>
      </div>
    </div>
  );
}
