import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AdminProfile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AdminProfile | null;
  loading: boolean;
  /** true jika user sudah lolos password TAPI belum lolos MFA (aal1 -> perlu aal2) */
  needsMfaChallenge: boolean;
  /** true jika user login TAPI belum pernah mendaftarkan factor TOTP sama sekali (wajib — SECURITY.md §6.2) */
  needsMfaEnrollment: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMfaChallenge, setNeedsMfaChallenge] = useState(false);
  const [needsMfaEnrollment, setNeedsMfaEnrollment] = useState(false);

  const evaluateMfaState = useCallback(async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = (factors?.totp ?? []).some((f) => f.status === 'verified');

    if (!hasVerifiedTotp) {
      // Wajib MFA untuk seluruh akun superadmin (SECURITY.md §6.2) — belum
      // pernah enroll sama sekali -> minta enroll dulu sebelum lanjut.
      setNeedsMfaEnrollment(true);
      setNeedsMfaChallenge(false);
      return;
    }
    setNeedsMfaEnrollment(false);
    setNeedsMfaChallenge(aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2');
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('admin_profiles').select('*').eq('user_id', userData.user.id).maybeSingle();
    setProfile(data as AdminProfile | null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        await evaluateMfaState();
        await refreshProfile();
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await evaluateMfaState();
        await refreshProfile();
      } else {
        setProfile(null);
        setNeedsMfaChallenge(false);
        setNeedsMfaEnrollment(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [evaluateMfaState, refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, needsMfaChallenge, needsMfaEnrollment, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}

/** Dipanggil dari halaman MFA setelah verify sukses, agar App re-evaluasi aal2. */
export async function refreshMfaAssurance() {
  await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
}
