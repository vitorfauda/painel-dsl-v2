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
import Licenses from '@/pages/Licenses';
import IssueLicense from '@/pages/IssueLicense';
import Customers from '@/pages/Customers';
import Coupons from '@/pages/Coupons';
import ExtensionVersion from '@/pages/ExtensionVersion';
import AuditLog from '@/pages/AuditLog';
import Settings from '@/pages/Settings';
import Subscriptions from '@/pages/Subscriptions';
import Transfers from '@/pages/Transfers';

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

              <Route path="/licenses" element={<Licenses />} />
              <Route path="/issue-license" element={<IssueLicense />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/extension-version" element={<ExtensionVersion />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
