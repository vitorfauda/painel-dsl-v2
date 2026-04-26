import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Key,
  FileKey,
  Users,
  UserCog,
  Trophy,
  ShoppingBag,
  TicketPercent,
  DownloadCloud,
  ShieldCheck,
  ScrollText,
  Settings as SettingsIcon,
  LogOut,
  CalendarRange,
  ArrowDownToLine,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const groups = [
  {
    label: 'Visão geral',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Revendedores',
    items: [
      { to: '/resellers', label: 'Revendedores', icon: UserCog },
      { to: '/ranking', label: 'Ranking', icon: Trophy },
      { to: '/reseller-purchases', label: 'Compras', icon: ShoppingBag },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { to: '/subscriptions', label: 'Assinaturas', icon: CalendarRange },
      { to: '/customers', label: 'Clientes', icon: Users },
      { to: '/transfers', label: 'Saques', icon: ArrowDownToLine },
    ],
  },
  {
    label: 'Licenças',
    items: [
      { to: '/licenses', label: 'Licenças', icon: Key },
      { to: '/issue-license', label: 'Emitir licença', icon: FileKey },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { to: '/coupons', label: 'Cupons', icon: TicketPercent },
      { to: '/extension-version', label: 'Versão extensão', icon: DownloadCloud },
      { to: '/audit', label: 'Auditoria', icon: ScrollText },
      { to: '/settings', label: 'Configurações', icon: SettingsIcon },
    ],
  },
];

export function Sidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r backdrop-blur-xl z-40" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(5,7,13,0.85)' }}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="relative">
          <div className="h-9 w-9 rounded-xl overflow-hidden">
            <img src="/logo.png" alt="DSL" className="h-full w-full object-contain" />
          </div>
          <div className="absolute inset-0 rounded-xl bg-primary/40 blur-md -z-10" />
        </div>
        <div>
          <div className="font-display font-bold leading-tight">DSL Admin</div>
          <div className="text-[10px] text-text-dim uppercase tracking-widest">Licenças</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-3 mb-2 text-[10px] font-semibold text-text-dim uppercase tracking-widest">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent'
                    }`
                  }
                >
                  <it.icon size={16} />
                  {it.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-text-muted truncate">{user?.email}</div>
            <div className="text-[10px] text-primary font-semibold">Admin</div>
          </div>
        </div>
        <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  );
}
