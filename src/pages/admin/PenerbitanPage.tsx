import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { PendaftaranTte } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Input';
import { MaskedData } from '../../components/ui/MaskedData';
import { useToast } from '../../contexts/ToastContext';

export default function PenerbitanPage() {
  const [rows, setRows] = useState<PendaftaranTte[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<PendaftaranTte | null>(null);
  const [tanggalTerbit, setTanggalTerbit] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('v_pendaftaran_siap_tahap2')
      .select('id, nomor_referensi, nama, nik_masked, nip_masked, skpd_id, skpd:skpd_id(id, nama_skpd), status_email, email_existing, email_usulan, verified_at')
      .order('verified_at', { ascending: true });
    setRows((data as unknown as PendaftaranTte[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openModal(row: PendaftaranTte) {
    setTarget(row);
    setTanggalTerbit(new Date().toISOString().slice(0, 10));
  }

  async function confirmIssue() {
    if (!target || !tanggalTerbit) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('fn_issue_sertifikat', {
      p_pendaftaran_id: target.id,
      p_tanggal_terbit: tanggalTerbit,
      p_ip: null,
    });
    setActionLoading(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', `Sertifikat untuk ${target.nama} berhasil diterbitkan.`);
    setTarget(null);
    load();
  }

  return (
    <AdminLayout title="Penerbitan Sertifikat (Tahap 2)">
      <div className="bg-canvas border border-hairline">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Tidak ada pendaftaran menunggu penerbitan"
            description="Pendaftaran yang sudah disetujui di Tahap 1 dan siap diterbitkan akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-surface-1 text-ink-muted text-left">
                  <th className="px-md py-sm font-normal">Nama</th>
                  <th className="px-md py-sm font-normal">NIK</th>
                  <th className="px-md py-sm font-normal">SKPD</th>
                  <th className="px-md py-sm font-normal">Email Dinas</th>
                  <th className="px-md py-sm font-normal">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-hairline">
                    <td className="px-md py-sm text-ink">{row.nama}</td>
                    <td className="px-md py-sm">
                      <MaskedData pendaftaranId={row.id} field="nik" maskedValue={row.nik_masked} />
                    </td>
                    <td className="px-md py-sm text-ink-muted">{row.skpd?.nama_skpd ?? '—'}</td>
                    <td className="px-md py-sm text-ink-muted font-mono text-mono-data">
                      {row.email_existing ?? row.email_usulan ?? '—'}
                    </td>
                    <td className="px-md py-sm">
                      <Button variant="primary" compact onClick={() => openModal(row)}>
                        Input Tanggal Terbit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Terbitkan Sertifikat TTE"
        subtitle={target ? `${target.nama} — pastikan email dinas sudah dikonfirmasi aktif sebelum melanjutkan.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={confirmIssue} loading={actionLoading} disabled={!tanggalTerbit}>
              Terbitkan
            </Button>
          </>
        }
      >
        <Field label="Tanggal Terbit" required htmlFor="tanggal_terbit" hint="Tanggal kedaluwarsa dihitung otomatis: terbit + 2 tahun">
          <TextInput
            id="tanggal_terbit"
            type="date"
            value={tanggalTerbit}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setTanggalTerbit(e.target.value)}
          />
        </Field>
      </Modal>
    </AdminLayout>
  );
}
