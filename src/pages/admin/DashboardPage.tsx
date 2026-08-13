import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../lib/utils';

interface Counts {
  totalAsn: number;
  sudahTerbit: number;
  diAntrian: number;
  h3Expired: number;
}

interface SegregationAlert {
  pendaftaran_id: string;
  nomor_referensi: string;
  nama: string;
  sertifikat_id: string;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [alerts, setAlerts] = useState<SegregationAlert[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<{ expired: number; warning_h3: number } | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const [totalAsn, sudahTerbit, diAntrian, h3Expired, alertRows] = await Promise.all([
      supabase.from('pendaftaran_tte').select('id', { count: 'exact', head: true }),
      supabase.from('sertifikat_tte').select('id', { count: 'exact', head: true }),
      supabase.from('pendaftaran_tte').select('id', { count: 'exact', head: true }).eq('status_verifikasi', 'MENUNGGU_VERIFIKASI'),
      supabase.from('sertifikat_tte').select('id', { count: 'exact', head: true }).in('status_sertifikat', ['WARNING_H3', 'EXPIRED']),
      supabase.from('v_segregation_alerts').select('pendaftaran_id, nomor_referensi, nama, sertifikat_id'),
    ]);

    setCounts({
      totalAsn: totalAsn.count ?? 0,
      sudahTerbit: sudahTerbit.count ?? 0,
      diAntrian: diAntrian.count ?? 0,
      h3Expired: h3Expired.count ?? 0,
    });
    setAlerts((alertRows.data as SegregationAlert[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRunScheduler() {
    setRunning(true);
    const { data, error } = await supabase.rpc('fn_run_scheduler');
    setRunning(false);
    if (error) {
      showToast('error', `Gagal menjalankan scheduler: ${error.message}`);
      return;
    }
    setLastRun(data as { expired: number; warning_h3: number });
    showToast('success', 'Scheduler berhasil dijalankan.');
    load();
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatCard label="Total ASN (Data Masuk)" value={counts?.totalAsn ?? 0} loading={!counts} />
        <StatCard label="Sudah Terbit" value={counts?.sudahTerbit ?? 0} loading={!counts} />
        <StatCard label="Di Antrian" value={counts?.diAntrian ?? 0} loading={!counts} />
        <StatCard label="H-3 Expired" value={counts?.h3Expired ?? 0} warning loading={!counts} />
      </div>

      <div className="bg-canvas border border-hairline p-lg mb-lg">
        <div className="flex items-center justify-between flex-wrap gap-sm">
          <div>
            <h2 className="text-card-title text-ink mb-xxs">Scheduler Harian H-3 / Kedaluwarsa</h2>
            <p className="text-body-sm text-ink-muted">
              Produksi: berjalan otomatis tiap hari via Laravel Task Scheduler (ARCHITECTURE.md §10). Untuk demo ini,
              jalankan manual untuk mensimulasikan hasilnya secara instan.
            </p>
          </div>
          <Button variant="tertiary" onClick={handleRunScheduler} loading={running}>
            Jalankan Scheduler
          </Button>
        </div>
        {lastRun && (
          <p className="text-body-sm text-ink mt-md">
            Hasil terakhir: {lastRun.expired} sertifikat ditandai EXPIRED, {lastRun.warning_h3} ditandai WARNING_H3.
          </p>
        )}
      </div>

      <div className="bg-canvas border border-hairline p-lg">
        <h2 className="text-card-title text-ink mb-xxs">Peringatan Segregation of Duty</h2>
        <p className="text-body-sm text-ink-muted mb-md">
          SECURITY.md §6.4 — record di mana akun yang sama menyetujui Tahap 1 dan Tahap 2 untuk pendaftar yang sama.
        </p>
        {alerts.length === 0 ? (
          <p className="text-body-sm text-ink-subtle">Tidak ada peringatan saat ini.</p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {alerts.map((a) => (
              <li key={a.sertifikat_id} className="border-l-[3px] border-l-warning bg-surface-1 px-md py-sm text-body-sm text-ink">
                {a.nama} ({a.nomor_referensi}) — Tahap 1 &amp; Tahap 2 disetujui oleh akun yang sama.
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-caption text-ink-subtle mt-md">Terakhir dimuat: {formatDateTime(new Date().toISOString())}</p>
    </AdminLayout>
  );
}
