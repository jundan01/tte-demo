import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MfaInput } from '../../components/ui/MfaInput';
import { Button } from '../../components/ui/Button';

export default function MfaEnrollPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.mfa
      .enroll({ factorType: 'totp', friendlyName: `superadmin-${Date.now()}` })
      .then(({ data, error: enrollError }) => {
        if (enrollError) {
          setInitError(enrollError.message);
          return;
        }
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
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
    // Sesi otomatis naik ke aal2; AuthContext akan mendeteksi perubahan ini
    // lewat onAuthStateChange dan mengarahkan ke Dashboard.
    window.location.href = '/admin/dashboard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-md">
      <div className="w-full max-w-[480px] bg-canvas border border-hairline p-xxl">
        <h1 className="text-headline text-ink mb-xxs">Aktifkan Autentikasi Dua Faktor</h1>
        <p className="text-body-sm text-ink-muted mb-lg">
          Wajib untuk seluruh akun Superadmin (SECURITY.md §6.2). Pindai kode QR berikut dengan aplikasi
          authenticator (Google Authenticator, Authy, dsb), lalu masukkan kode 6 digit yang muncul.
        </p>

        {initError && <p className="text-body-sm text-error mb-md">{initError}</p>}

        {qrCode && (
          <div className="flex flex-col items-center mb-lg">
            <div className="border border-hairline p-md bg-white">
              <img src={qrCode} alt="Kode QR untuk aplikasi authenticator" width={200} height={200} />
            </div>
            {secret && (
              <p className="text-caption text-ink-muted mt-sm text-center">
                Tidak bisa memindai? Masukkan kunci manual: <br />
                <span className="font-mono text-mono-data">{secret}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-md">
          <MfaInput value={code} onChange={setCode} onComplete={handleVerify} disabled={loading || !factorId} />
          {error && <p className="text-body-sm text-error">{error}</p>}
          <Button onClick={() => handleVerify(code)} disabled={code.length !== 6 || loading} loading={loading} className="w-full">
            Verifikasi &amp; Aktifkan
          </Button>
        </div>
      </div>
    </div>
  );
}
