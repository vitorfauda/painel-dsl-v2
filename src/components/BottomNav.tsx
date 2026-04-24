import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserCog, Key, Trophy, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LogOut, ShoppingBag, FileKey, Users, TicketPercent, DownloadCloud,
  ScrollText, Settings as SettingsIcon, X,
} from 'lucide-react';

const primary = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/resellers', label: 'Revenda', icon: UserCog },
  { to: '/licenses', label: 'Licenças', icon: Key },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
];

const moreLinks = [
  { to: '/reseller-purchases', label: 'Compras', icon: ShoppingBag },
  { to: '/issue-license', label: 'Emitir licença', icon: FileKey },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/coupons', label: 'Cupons', icon: TicketPercent },
  { to: '/extension-version', label: 'Versão extensão', icon: DownloadCloud },
  { to: '/audit', label: 'Auditoria', icon: ScrollText },
  { to: '/settings', label: 'Configurações', icon: SettingsIcon },
];

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(5,7,13,0.9)' }}>
        <div className="grid grid-cols-5 h-16">
          {primary.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-primary' : 'text-text-muted'}`
            }>
              <l.icon size={18} />
              {l.label}
            </NavLink>
          ))}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center justify-center gap-1 text-xs text-text-muted">
            <Menu size={18} />
            Mais
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(5,7,13,0.97)' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="font-bold">Mais opções</span>
            <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {moreLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5">
                <l.icon size={18} /> {l.label}
              </Link>
            ))}
            <button onClick={() => { signOut(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 mt-4">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}
