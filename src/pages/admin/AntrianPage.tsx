import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { PendaftaranTte, Skpd } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TextArea, SelectInput } from '../../components/ui/Input';
import { MaskedData } from '../../components/ui/MaskedData';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';

const PAGE_SIZE = 10;

export default function AntrianPage() {
  const [rows, setRows] = useState<PendaftaranTte[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [skpdList, setSkpdList] = useState<Skpd[]>([]);
  const [skpdFilter, setSkpdFilter] = useState('');

  const [actionTarget, setActionTarget] = useState<PendaftaranTte | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('pendaftaran_tte')
      .select('id, nomor_referensi, nama, nik_masked, nip_masked, pangkat, no_hp, skpd_id, skpd:skpd_id(id, nama_skpd), status_email, email_existing, email_usulan, status_verifikasi, rejection_reason, created_at', {
        count: 'exact',
      })
      .eq('status_verifikasi', 'MENUNGGU_VERIFIKASI')
      .order('created_at', { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (skpdFilter) query = query.eq('skpd_id', skpdFilter);

    const { data, count } = await query;
    setRows((data as unknown as PendaftaranTte[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, skpdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase.from('skpd').select('id, nama_skpd, kode_skpd, is_active, created_at').order('nama_skpd').then(({ data }) => setSkpdList((data as Skpd[]) ?? []));
  }, []);

  function openApprove(row: PendaftaranTte) {
    setActionTarget(row);
    setActionType('approve');
  }
  function openReject(row: PendaftaranTte) {
    setActionTarget(row);
    setActionType('reject');
    setRejectReason('');
  }
  function closeModal() {
    setActionTarget(null);
    setActionType(null);
  }

  async function confirmApprove() {
    if (!actionTarget) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('fn_approve_tahap1', { p_id: actionTarget.id, p_ip: null });
    setActionLoading(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', `Pendaftaran ${actionTarget.nama} disetujui.`);
    closeModal();
    load();
  }

  async function confirmReject() {
    if (!actionTarget) return;
    if (rejectReason.trim().length < 5) {
      showToast('error', 'Alasan penolakan wajib diisi (minimal 5 karakter).');
      return;
    }
    setActionLoading(true);
    const { error } = await supabase.rpc('fn_reject_tahap1', { p_id: actionTarget.id, p_reason: rejectReason.trim(), p_ip: null });
    setActionLoading(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', `Pendaftaran ${actionTarget.nama} ditolak.`);
    closeModal();
    load();
  }

  return (
    <AdminLayout title="Antrian Verifikasi (Tahap 1)">
      <div className="bg-canvas border border-hairline">
        <div className="p-md border-b border-hairline flex flex-wrap gap-sm items-center">
          <SelectInput
            value={skpdFilter}
            onChange={(e) => {
              setSkpdFilter(e.target.value);
              setPage(1);
            }}
            className="max-w-[280px]"
          >
            <option value="">Semua SKPD</option>
            {skpdList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama_skpd}
              </option>
            ))}
          </SelectInput>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="Antrian kosong" description="Tidak ada pendaftaran yang menunggu verifikasi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-surface-1 text-ink-muted text-left">
                  <th className="px-md py-sm font-normal">Nama</th>
                  <th className="px-md py-sm font-normal">NIK</th>
                  <th className="px-md py-sm font-normal">NIP</th>
                  <th className="px-md py-sm font-normal">SKPD</th>
                  <th className="px-md py-sm font-normal">Tanggal Daftar</th>
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
                    <td className="px-md py-sm">
                      <MaskedData pendaftaranId={row.id} field="nip" maskedValue={row.nip_masked} />
                    </td>
                    <td className="px-md py-sm text-ink-muted">{row.skpd?.nama_skpd ?? '—'}</td>
                    <td className="px-md py-sm text-ink-muted">{formatDate(row.created_at)}</td>
                    <td className="px-md py-sm">
                      <div className="flex gap-xs">
                        <Button variant="tertiary" compact onClick={() => openApprove(row)}>
                          Setujui
                        </Button>
                        <Button variant="danger" compact onClick={() => openReject(row)}>
                          Tolak
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      <Modal
        open={actionType === 'approve'}
        onClose={closeModal}
        title="Setujui pendaftaran ini?"
        subtitle={actionTarget ? `${actionTarget.nama} — akan lanjut ke Verifikasi Tahap 2 (Penerbitan Sertifikat).` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Batal
            </Button>
            <Button variant="primary" onClick={confirmApprove} loading={actionLoading}>
              Ya, Setujui
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-ink-muted">
          Keputusan ini akan tercatat (siapa &amp; kapan) di jejak audit sistem.
        </p>
      </Modal>

      <Modal
        open={actionType === 'reject'}
        onClose={closeModal}
        title="Tolak pendaftaran ini?"
        subtitle={actionTarget ? actionTarget.nama : ''}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Batal
            </Button>
            <Button variant="danger" onClick={confirmReject} loading={actionLoading}>
              Ya, Tolak
            </Button>
          </>
        }
      >
        <TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Alasan penolakan (wajib diisi, akan disampaikan Superadmin ke ASN di luar sistem)"
          autoFocus
        />
      </Modal>
    </AdminLayout>
  );
}
