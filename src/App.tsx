import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import PendaftaranPage from './pages/public/PendaftaranPage';
import LoginPage from './pages/auth/LoginPage';
import MfaEnrollPage from './pages/auth/MfaEnrollPage';
import MfaChallengePage from './pages/auth/MfaChallengePage';
import DashboardPage from './pages/admin/DashboardPage';
import AntrianPage from './pages/admin/AntrianPage';
import PenerbitanPage from './pages/admin/PenerbitanPage';
import MonitoringH3Page from './pages/admin/MonitoringH3Page';
import ExportPage from './pages/admin/ExportPage';
import SkpdPage from './pages/admin/SkpdPage';
import AkunPage from './pages/admin/AkunPage';

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Memuat" />
    </div>
  );
}

/** Menjaga rute /admin/*: wajib login + wajib sudah lolos MFA (aal2) + akun aktif. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, needsMfaEnrollment, needsMfaChallenge, profile, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (needsMfaEnrollment) return <Navigate to="/mfa/enroll" replace />;
  if (needsMfaChallenge) return <Navigate to="/mfa/challenge" replace />;

  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1 px-md text-center">
        <div className="max-w-md">
          <h1 className="text-headline text-ink mb-xs">Akun Dinonaktifkan</h1>
          <p className="text-body text-ink-muted mb-md">
            Akun Anda telah dinonaktifkan oleh administrator. Hubungi sesama Superadmin bila ini keliru.
          </p>
          <button onClick={() => signOut()} className="text-primary underline text-body-sm">
            Kembali ke halaman masuk
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Mencegah pengguna yang sudah login penuh (aal2) mengunjungi /login kembali. */
function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { session, loading, needsMfaChallenge, needsMfaEnrollment } = useAuth();
  if (loading) return <FullPageLoader />;
  if (session && !needsMfaChallenge && !needsMfaEnrollment) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}

function MfaRouteGuard({ children, mode }: { children: ReactNode; mode: 'enroll' | 'challenge' }) {
  const { session, loading, needsMfaEnrollment, needsMfaChallenge } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (mode === 'enroll' && !needsMfaEnrollment) return <Navigate to={needsMfaChallenge ? '/mfa/challenge' : '/admin/dashboard'} replace />;
  if (mode === 'challenge' && !needsMfaChallenge) return <Navigate to={needsMfaEnrollment ? '/mfa/enroll' : '/admin/dashboard'} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  useEffect(() => {
    document.title =
      location.pathname === '/' ? 'Pendaftaran TTE — Bidang Persandian Kota Cirebon' : 'Panel Superadmin — TTE Cirebon';
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<PendaftaranPage />} />

      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/mfa/enroll"
        element={
          <MfaRouteGuard mode="enroll">
            <MfaEnrollPage />
          </MfaRouteGuard>
        }
      />
      <Route
        path="/mfa/challenge"
        element={
          <MfaRouteGuard mode="challenge">
            <MfaChallengePage />
          </MfaRouteGuard>
        }
      />

      <Route path="/admin/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/admin/antrian" element={<ProtectedRoute><AntrianPage /></ProtectedRoute>} />
      <Route path="/admin/penerbitan" element={<ProtectedRoute><PenerbitanPage /></ProtectedRoute>} />
      <Route path="/admin/monitoring-h3" element={<ProtectedRoute><MonitoringH3Page /></ProtectedRoute>} />
      <Route path="/admin/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
      <Route path="/admin/skpd" element={<ProtectedRoute><SkpdPage /></ProtectedRoute>} />
      <Route path="/admin/akun" element={<ProtectedRoute><AkunPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
