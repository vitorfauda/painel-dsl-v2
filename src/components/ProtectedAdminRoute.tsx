import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoaderRing } from './LoaderRing';
import { ShieldAlert } from 'lucide-react';

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderRing size={40} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="holo-card holo-permanent p-10 text-center max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Acesso negado</h1>
          <p className="text-text-muted text-sm mb-6">Essa área é exclusiva pra administradores.</p>
          <a href="/login" className="cta-ghost inline-block">Voltar pro login</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
