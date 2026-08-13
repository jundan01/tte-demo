import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { SertifikatTte, StatusSertifikat } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SelectInput } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, daysUntil } from '../../lib/utils';

const PAGE_SIZE = 10;

export default function MonitoringH3Page() {
  const [rows, setRows] = useState<SertifikatTte[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusSertifikat | ''>('');
  const [target, setTarget] = useState<SertifikatTte | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('sertifikat_tte')
      .select(
        'id, pendaftaran_tte_id, tanggal_terbit, tanggal_expired, status_sertifikat, created_at, pendaftaran:pendaftaran_tte_id(id, nama, nomor_referensi, nik_masked, skpd:skpd_id(nama_skpd))',
        { count: 'exact' }
      )
      .order('tanggal_expired', { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (statusFilter) query = query.eq('status_sertifikat', statusFilter);

    const { data, count } = await query;
    setRows((data as unknown as SertifikatTte[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmMarkPerluPerpanjang() {
    if (!target) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('fn_mark_perlu_perpanjang', { p_sertifikat_id: target.id });
    setActionLoading(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', 'Status ditandai Perlu Diperpanjang.');
    setTarget(null);
    load();
  }

  return (
    <AdminLayout title="Monitoring H-3 &amp; Kedaluwarsa">
      <div className="bg-canvas border border-hairline">
        <div className="p-md border-b border-hairline">
          <SelectInput
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusSertifikat | '');
              setPage(1);
            }}
            className="max-w-[280px]"
          >
            <option value="">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="WARNING_H3">H-3 (Segera Kedaluwarsa)</option>
            <option value="EXPIRED">Kedaluwarsa</option>
            <option value="PERLU_PERPANJANG">Perlu Diperpanjang</option>
          </SelectInput>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada sertifikat" description="Belum ada sertifikat yang mendekati kedaluwarsa." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-surface-1 text-ink-muted text-left">
                  <th className="px-md py-sm font-normal">Nama</th>
                  <th className="px-md py-sm font-normal">SKPD</th>
                  <th className="px-md py-sm font-normal">Tgl Terbit</th>
                  <th className="px-md py-sm font-normal">Tgl Expired</th>
                  <th className="px-md py-sm font-normal">Sisa Hari</th>
                  <th className="px-md py-sm font-normal">Status</th>
                  <th className="px-md py-sm font-normal">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const remaining = daysUntil(row.tanggal_expired);
                  return (
                    <tr key={row.id} className="border-b border-hairline">
                      <td className="px-md py-sm text-ink">{row.pendaftaran?.nama ?? '—'}</td>
                      <td className="px-md py-sm text-ink-muted">{row.pendaftaran?.skpd?.nama_skpd ?? '—'}</td>
                      <td className="px-md py-sm text-ink-muted">{formatDate(row.tanggal_terbit)}</td>
                      <td className="px-md py-sm text-ink-muted">{formatDate(row.tanggal_expired)}</td>
                      <td className="px-md py-sm text-ink-muted">{remaining >= 0 ? `${remaining} hari` : `Lewat ${Math.abs(remaining)} hari`}</td>
                      <td className="px-md py-sm">
                        <StatusBadge status={row.status_sertifikat} />
                      </td>
                      <td className="px-md py-sm">
                        {row.status_sertifikat !== 'PERLU_PERPANJANG' && (
                          <Button variant="tertiary" compact onClick={() => setTarget(row)}>
                            Tandai Perlu Perpanjang
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Tandai sebagai Perlu Diperpanjang?"
        subtitle={target?.pendaftaran?.nama}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={confirmMarkPerluPerpanjang} loading={actionLoading}>
              Ya, Tandai
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-ink-muted">
          Gunakan saat proses perpanjangan sertifikat sedang berjalan (FR-14). Tindakan ini tercatat di jejak audit.
        </p>
      </Modal>
    </AdminLayout>
  );
}
