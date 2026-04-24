import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, User, Shield, Bell, LogOut, ToggleLeft, TicketPercent, Power } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LoaderRing } from '@/components/LoaderRing';

type Tab = 'profile' | 'features' | 'notifications' | 'security';

export default function Settings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');

  const [pwd, setPwd] = useState({ next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  // Feature flags
  const [flags, setFlags] = useState({ coupons_enabled: false });
  const [flagsLoading, setFlagsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_config')
        .select('key, value').in('key', ['coupons_enabled']);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      setFlags({ coupons_enabled: map.coupons_enabled === 'true' });
      setFlagsLoading(false);
    })();
  }, []);

  const toggleFlag = async (key: keyof typeof flags) => {
    const newValue = !flags[key];
    setFlags({ ...flags, [key]: newValue });
    const { error } = await supabase.from('app_config').upsert({
      key,
      value: newValue ? 'true' : 'false',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    if (error) {
      toast.error(error.message);
      setFlags({ ...flags, [key]: !newValue });
      return;
    }
    toast.success(`${newValue ? 'Habilitado' : 'Desabilitado'}`);
  };

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

  const handleSignOut = async () => { await signOut(); nav('/login'); };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
      <PageHeader icon={SettingsIcon} title="Configurações" subtitle="Preferências da conta e do sistema" />

      <div className="grid md:grid-cols-[200px_1fr] gap-6">
        <aside className="flex md:flex-col gap-1 overflow-x-auto">
          {([
            ['profile', 'Perfil', User],
            ['features', 'Funcionalidades', ToggleLeft],
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

          {tab === 'features' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-2">Funcionalidades</h2>
              <p className="text-sm text-text-muted mb-6">Liga e desliga recursos sem precisar mexer no código.</p>

              {flagsLoading ? (
                <div className="py-8 flex justify-center"><LoaderRing size={24} /></div>
              ) : (
                <FeatureToggle
                  icon={TicketPercent}
                  title="Cupons de desconto"
                  desc="Quando ligado, o campo de cupom aparece no checkout em pay.devsemlimites.site e permite o cliente aplicar descontos."
                  note="Desabilitado por padrão. Ative durante campanhas específicas."
                  value={flags.coupons_enabled}
                  onToggle={() => toggleFlag('coupons_enabled')}
                />
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Notificações</h2>
              <div className="p-8 rounded-xl bg-white/5 text-center text-text-muted text-sm">
                <Bell size={32} className="mx-auto mb-3 text-text-dim" />
                Em breve: notificações em tempo real de vendas e eventos críticos.
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

function FeatureToggle({ icon: Icon, title, desc, note, value, onToggle }: any) {
  return (
    <div className="holo-card p-5 flex gap-4 items-start">
      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: value ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${value ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}` }}
      >
        <Icon size={18} className={value ? 'text-primary' : 'text-text-muted'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h4 className="font-semibold">{title}</h4>
          <button
            onClick={onToggle}
            role="switch"
            aria-checked={value}
            className={`relative h-6 w-11 rounded-full transition-all shrink-0 ${value ? 'bg-primary' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-lg ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <p className="text-xs text-text-muted leading-relaxed mb-1">{desc}</p>
        {note && <p className="text-[10px] text-text-dim italic">{note}</p>}
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <div className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-primary animate-pulse' : 'bg-text-dim'}`} />
          <span className={value ? 'text-primary font-semibold' : 'text-text-dim'}>
            {value ? 'Habilitado' : 'Desabilitado'}
          </span>
        </div>
      </div>
    </div>
  );
}
