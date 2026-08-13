import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MfaInput } from '../../components/ui/MfaInput';
import { Button } from '../../components/ui/Button';

export default function MfaChallengePage() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp.find((f) => f.status === 'verified');
      setFactorId(totp?.id ?? null);
    });
  }, []);

  async function handleVerify(value: string) {
    if (!factorId) return;
    setError(null);
    setLoading(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setLoading(false);
      setError(challengeError?.message ?? 'Gagal membuat tantangan MFA.');
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: value,
    });
    setLoading(false);
    if (verifyError) {
      setError('Kode tidak valid. Coba lagi.');
      setCode('');
      return;
    }
    window.location.href = '/admin/dashboard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-md">
      <div className="w-full max-w-[420px] bg-canvas border border-hairline p-xxl">
        <h1 className="text-headline text-ink mb-xxs">Verifikasi Dua Faktor</h1>
        <p className="text-body-sm text-ink-muted mb-lg">
          Masukkan kode 6 digit dari aplikasi authenticator Anda.
        </p>

        <div className="flex flex-col items-center gap-md">
          <MfaInput value={code} onChange={setCode} onComplete={handleVerify} disabled={loading || !factorId} />
          {error && <p className="text-body-sm text-error">{error}</p>}
          <Button onClick={() => handleVerify(code)} disabled={code.length !== 6 || loading} loading={loading} className="w-full">
            Verifikasi
          </Button>
        </div>
      </div>
    </div>
  );
}
