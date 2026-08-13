import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { AdminProfile } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';

export default function AkunPage() {
  const [rows, setRows] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<AdminProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_profiles').select('*').order('created_at');
    setRows((data as AdminProfile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmToggle() {
    if (!target) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('fn_toggle_admin_active', {
      p_user_id: target.user_id,
      p_is_active: !target.is_active,
    });
    setActionLoading(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', `Akun ${target.name} ${target.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`);
    setTarget(null);
    load();
  }

  return (
    <AdminLayout title="Manajemen Akun Superadmin">
      <div className="bg-canvas border-l-[3px] border-l-info border border-hairline p-md mb-md text-body-sm text-ink">
        Karena hanya ada satu role internal (Superadmin), pembuatan akun baru <strong>tidak</strong> disediakan lewat
        formulir di panel ini — signup publik ke sistem admin adalah risiko keamanan. Buat akun baru lewat{' '}
        <strong>Supabase Dashboard → Authentication → Add User</strong>, lalu wajibkan akun tersebut mengaktifkan MFA
        saat login pertama. Lihat README.md.
      </div>

      <div className="bg-canvas border border-hairline">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada akun Superadmin lain" />
        ) : (
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-surface-1 text-ink-muted text-left">
                <th className="px-md py-sm font-normal">Nama</th>
                <th className="px-md py-sm font-normal">Email</th>
                <th className="px-md py-sm font-normal">Dibuat</th>
                <th className="px-md py-sm font-normal">Status</th>
                <th className="px-md py-sm font-normal">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-b border-hairline">
                  <td className="px-md py-sm text-ink">
                    {row.name} {row.user_id === user?.id && <span className="text-caption text-ink-subtle">(Anda)</span>}
                  </td>
                  <td className="px-md py-sm text-ink-muted font-mono text-mono-data">{row.email}</td>
                  <td className="px-md py-sm text-ink-muted">{formatDate(row.created_at)}</td>
                  <td className="px-md py-sm">
                    <span className={row.is_active ? 'text-success' : 'text-ink-subtle'}>
                      {row.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-md py-sm">
                    <Button
                      variant={row.is_active ? 'danger' : 'tertiary'}
                      compact
                      disabled={row.user_id === user?.id}
                      onClick={() => setTarget(row)}
                    >
                      {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`${target?.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun ini?`}
        subtitle={target?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button variant={target?.is_active ? 'danger' : 'primary'} onClick={confirmToggle} loading={actionLoading}>
              Ya, Lanjutkan
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-ink-muted">Tindakan ini tercatat di jejak audit sistem.</p>
      </Modal>
    </AdminLayout>
  );
}
