import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface MaskedDataProps {
  pendaftaranId: string;
  field: 'nik' | 'nip';
  maskedValue: string;
}

/**
 * Menampilkan NIK/NIP ter-mask secara default. Klik ikon mata memicu
 * fn_reveal_pii (RPC) yang mendekripsi nilai penuh DAN mencatat
 * security_audit_logs (action=view_nik/view_nip) — SECURITY.md §7.2,
 * DESIGN.md §7 "state eksplisit tampilkan penuh".
 */
export function MaskedData({ pendaftaranId, field, maskedValue }: MaskedDataProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('fn_reveal_pii', {
      p_pendaftaran_id: pendaftaranId,
      p_field: field,
    });
    setLoading(false);
    if (error) {
      showToast('error', `Gagal menampilkan ${field.toUpperCase()} penuh: ${error.message}`);
      return;
    }
    setRevealed(data as string);
  }

  return (
    <span className="inline-flex items-center gap-xs font-mono text-mono-data text-ink">
      {revealed ?? maskedValue}
      <button
        type="button"
        onClick={handleReveal}
        disabled={loading}
        aria-label={revealed ? `Sembunyikan ${field.toUpperCase()}` : `Tampilkan ${field.toUpperCase()} penuh`}
        className="text-ink-subtle hover:text-primary disabled:opacity-50"
        title={revealed ? 'Sembunyikan' : 'Tampilkan penuh (tercatat di audit log)'}
      >
        {revealed ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.8 21.8 0 015.06-6.06M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a21.8 21.8 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
