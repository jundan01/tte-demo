import { FormEvent, useState } from 'react';
import { Field, TextInput } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError('Email atau kata sandi salah.');
    }
    // Navigasi ditangani otomatis oleh App.tsx berdasarkan status sesi & MFA.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-md">
      <div className="w-full max-w-[420px] bg-canvas border border-hairline p-xxl">
        <div className="w-10 h-10 bg-primary flex items-center justify-center text-on-primary text-body-emphasis mb-md">
          C
        </div>
        <h1 className="text-headline text-ink mb-xxs">Panel Superadmin</h1>
        <p className="text-body-sm text-ink-muted mb-lg">Sistem Monitoring TTE — Bidang Persandian Kota Cirebon</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <Field label="Email" required htmlFor="email">
            <TextInput
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Kata Sandi" required htmlFor="password">
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && (
            <div className="border-l-[3px] border-l-error bg-canvas px-md py-sm text-body-sm text-ink" role="alert">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full mt-xs">
            Masuk
          </Button>
        </form>

        <p className="text-caption text-ink-subtle mt-lg">
          Akun hanya dapat dibuat oleh administrator lewat Supabase Dashboard — lihat README.md.
        </p>
      </div>
    </div>
  );
}
