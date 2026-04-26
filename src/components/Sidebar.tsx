import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Key, FileKey, Users, UserCog, Trophy, ShoppingBag, TicketPercent,
  DownloadCloud, ScrollText, Settings as SettingsIcon, LogOut, CalendarRange, ArrowDownToLine,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const groups = [
  { label: 'Visão geral', items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Revendedores',
    items: [
      { to: '/resellers', label: 'Revendedores', icon: UserCog },
      { to: '/ranking', label: 'Ranking', icon: Trophy },
      { to: '/reseller-purchases', label: 'Vendas via revenda', icon: ShoppingBag },
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
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] z-40">
      <Link to="/dashboard" className="h-14 flex items-center gap-2.5 px-4 border-b border-[var(--color-border)]">
        <div className="h-7 w-7 rounded-md overflow-hidden">
          <img src="/logo.png" alt="DSL" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">DSL Admin</div>
          <div className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest">Licenças</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 mb-1.5 text-[10px] font-semibold text-[var(--color-text-dim)] uppercase tracking-widest">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) =>
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all ' +
                    (isActive
                      ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]/50')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <it.icon size={15} className={isActive ? 'text-[var(--color-primary)]' : ''} />
                      <span className="truncate">{it.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-2.5 px-1 py-1.5 mb-2">
          <div className="size-8 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-xs font-semibold text-[var(--color-primary)]">
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--color-text-muted)] truncate">{user?.email}</div>
            <div className="text-[10px] text-[var(--color-primary)] font-medium uppercase tracking-wider">Admin</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={13} /> Sair
        </button>
      </div>
    </aside>
  );
}
