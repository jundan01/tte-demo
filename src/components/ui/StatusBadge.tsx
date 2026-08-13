import { StatusSertifikat, StatusVerifikasi } from '../../types';
import { cx } from '../../lib/utils';

type AnyStatus = StatusVerifikasi | StatusSertifikat;

// DESIGN.md §3 — tabel pemetaan status -> warna aksen (rujukan final: SCHEMA.md §6)
const ACCENT: Record<AnyStatus, { border: string; dot: string; label: string }> = {
  MENUNGGU_VERIFIKASI: { border: 'border-l-ink-subtle', dot: 'bg-ink-subtle', label: 'Menunggu Verifikasi' },
  DISETUJUI: { border: 'border-l-success', dot: 'bg-success', label: 'Disetujui' },
  DITOLAK: { border: 'border-l-error', dot: 'bg-error', label: 'Ditolak' },
  AKTIF: { border: 'border-l-success', dot: 'bg-success', label: 'Aktif' },
  WARNING_H3: { border: 'border-l-warning', dot: 'bg-warning', label: 'H-3 (Segera Kedaluwarsa)' },
  EXPIRED: { border: 'border-l-error', dot: 'bg-error', label: 'Kedaluwarsa' },
  PERLU_PERPANJANG: { border: 'border-l-warning', dot: 'bg-warning', label: 'Perlu Diperpanjang' },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const accent = ACCENT[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-xs rounded-pill border-l-[3px] bg-surface-1 px-[10px] py-[4px] pr-[12px] text-body-emphasis text-ink whitespace-nowrap',
        accent.border
      )}
    >
      {status === 'PERLU_PERPANJANG' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3-6.7M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {accent.label}
    </span>
  );
}
