import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="relative min-h-screen">
      <div className="grain" />
      <Sidebar />
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0 relative z-[2]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
