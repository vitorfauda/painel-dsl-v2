import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, User, Shield, Bell, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Tab = 'profile' | 'notifications' | 'security';

export default function Settings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');

  const [pwd, setPwd] = useState({ next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const changePwd = async () => {
    if (pwd.next !== pwd.confirm) { toast.error('Senhas não coincidem'); return; }
    if (pwd.next.length < 8) { toast.error('Mínimo 8 caracteres'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Senha atualizada');
    setPwd({ next: '', confirm: '' });
  };

  const handleSignOut = async () => {
    await signOut();
    nav('/login');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
      <PageHeader icon={SettingsIcon} title="Configurações" subtitle="Preferências da conta de admin" />

      <div className="grid md:grid-cols-[200px_1fr] gap-6">
        <aside className="flex md:flex-col gap-1 overflow-x-auto">
          {([
            ['profile', 'Perfil', User],
            ['notifications', 'Notificações', Bell],
            ['security', 'Segurança', Shield],
          ] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k as Tab)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === k ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-white/5'
            }`}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </aside>

        <div className="holo-card p-6">
          {tab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Perfil</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center text-2xl font-bold text-void">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold">{user?.email}</div>
                  <div className="text-xs text-primary">Administrador</div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-2">Email</label>
                <input value={user?.email || ''} disabled className="input-dsl" />
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-2">ID do usuário</label>
                <input value={user?.id || ''} disabled className="input-dsl font-mono text-xs" />
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Notificações</h2>
              <p className="text-sm text-text-muted mb-4">Em breve: notificações em tempo real de vendas, pagamentos e sinais críticos.</p>
              <div className="p-8 rounded-xl bg-white/5 text-center text-text-muted text-sm">
                <Bell size={32} className="mx-auto mb-3 text-text-dim" />
                Módulo em desenvolvimento
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Segurança</h2>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Alterar senha</h3>
                <div><label className="block text-xs text-text-muted mb-1">Nova senha</label><input type="password" value={pwd.next} onChange={e => setPwd({ ...pwd, next: e.target.value })} className="input-dsl" /></div>
                <div><label className="block text-xs text-text-muted mb-1">Confirmar nova senha</label><input type="password" value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} className="input-dsl" /></div>
                <button onClick={changePwd} disabled={saving} className="cta-neon mt-2"><span className="relative z-10">{saving ? 'Salvando...' : 'Alterar senha'}</span></button>
              </div>

              <div className="h-px my-6" style={{ background: 'rgba(255,255,255,0.06)' }} />

              <div>
                <h3 className="font-semibold text-sm mb-3 text-red-400">Zona de perigo</h3>
                <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-sm">
                  <LogOut size={14} /> Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
