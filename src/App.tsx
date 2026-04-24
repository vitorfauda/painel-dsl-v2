import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Resellers from '@/pages/Resellers';
import Ranking from '@/pages/Ranking';
import ResellerPurchases from '@/pages/ResellerPurchases';
import ComingSoon from '@/pages/ComingSoon';

const qc = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{ style: { background: '#0a0f1a', border: '1px solid rgba(34,197,94,0.2)', color: '#f8fafc' } }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedAdminRoute><Layout /></ProtectedAdminRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/resellers" element={<Resellers />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/reseller-purchases" element={<ResellerPurchases />} />

              {/* Rodada B — placeholders */}
              <Route path="/licenses" element={<ComingSoon title="Licenças" subtitle="Lista completa de licenças emitidas" />} />
              <Route path="/issue-license" element={<ComingSoon title="Emitir licença" subtitle="Crie uma licença manualmente" />} />
              <Route path="/customers" element={<ComingSoon title="Clientes" subtitle="Base de clientes cadastrados" />} />
              <Route path="/coupons" element={<ComingSoon title="Cupons" subtitle="Gerenciar códigos de desconto" />} />
              <Route path="/extension-version" element={<ComingSoon title="Versão da extensão" subtitle="Publicar nova versão" />} />
              <Route path="/audit" element={<ComingSoon title="Log de auditoria" subtitle="Histórico de eventos do sistema" />} />
              <Route path="/settings" element={<ComingSoon title="Configurações" subtitle="Ajustes gerais" />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
