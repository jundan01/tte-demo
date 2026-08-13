import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Skpd } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';

export default function SkpdPage() {
  const [rows, setRows] = useState<Skpd[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Skpd | 'new' | null>(null);
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('skpd').select('id, nama_skpd, kode_skpd, is_active, created_at').order('nama_skpd');
    setRows((data as Skpd[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing('new');
    setNama('');
    setKode('');
  }
  function openEdit(row: Skpd) {
    setEditing(row);
    setNama(row.nama_skpd);
    setKode(row.kode_skpd ?? '');
  }

  async function handleSave() {
    if (!nama.trim()) {
      showToast('error', 'Nama SKPD wajib diisi.');
      return;
    }
    setSaving(true);
    const payload = { nama_skpd: nama.trim(), kode_skpd: kode.trim() || null };
    const { error } =
      editing === 'new'
        ? await supabase.from('skpd').insert(payload)
        : await supabase.from('skpd').update(payload).eq('id', (editing as Skpd).id);
    setSaving(false);
    if (error) {
      showToast('error', error.message);
      return;
    }
    showToast('success', 'Data SKPD tersimpan.');
    setEditing(null);
    load();
  }

  async function toggleActive(row: Skpd) {
    const { error } = await supabase.from('skpd').update({ is_active: !row.is_active }).eq('id', row.id);
    if (error) {
      showToast('error', error.message);
      return;
    }
    load();
  }

  return (
    <AdminLayout title="Manajemen SKPD">
      <div className="flex justify-end mb-md">
        <Button onClick={openNew}>Tambah SKPD</Button>
      </div>

      <div className="bg-canvas border border-hairline">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada data SKPD" />
        ) : (
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-surface-1 text-ink-muted text-left">
                <th className="px-md py-sm font-normal">Nama SKPD</th>
                <th className="px-md py-sm font-normal">Kode</th>
                <th className="px-md py-sm font-normal">Status</th>
                <th className="px-md py-sm font-normal">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-hairline">
                  <td className="px-md py-sm text-ink">{row.nama_skpd}</td>
                  <td className="px-md py-sm text-ink-muted">{row.kode_skpd ?? '—'}</td>
                  <td className="px-md py-sm">
                    <span className={row.is_active ? 'text-success' : 'text-ink-subtle'}>
                      {row.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-md py-sm">
                    <div className="flex gap-xs">
                      <Button variant="ghost" compact onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="ghost" compact onClick={() => toggleActive(row)}>
                        {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Tambah SKPD' : 'Edit SKPD'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          <Field label="Nama SKPD" required htmlFor="nama_skpd">
            <TextInput id="nama_skpd" value={nama} onChange={(e) => setNama(e.target.value)} />
          </Field>
          <Field label="Kode SKPD" htmlFor="kode_skpd" hint="Opsional">
            <TextInput id="kode_skpd" value={kode} onChange={(e) => setKode(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </AdminLayout>
  );
}
