import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Skpd } from '../../types';
import { Field, SelectInput, TextInput } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type JenisLaporan = 'ditolak' | 'berhasil';

export default function ExportPage() {
  const [skpdList, setSkpdList] = useState<Skpd[]>([]);
  const [jenis, setJenis] = useState<JenisLaporan>('berhasil');
  const [skpdId, setSkpdId] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalAkhir, setTanggalAkhir] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    supabase.from('skpd').select('id, nama_skpd, kode_skpd, is_active, created_at').order('nama_skpd').then(({ data }) => setSkpdList((data as Skpd[]) ?? []));
  }, []);

  async function fetchRows() {
    if (jenis === 'ditolak') {
      let query = supabase
        .from('pendaftaran_tte')
        .select('nama, nip_masked, rejection_reason, verified_at, skpd:skpd_id(nama_skpd)')
        .eq('status_verifikasi', 'DITOLAK')
        .order('verified_at', { ascending: false });
      if (skpdId) query = query.eq('skpd_id', skpdId);
      if (tanggalMulai) query = query.gte('verified_at', tanggalMulai);
      if (tanggalAkhir) query = query.lte('verified_at', tanggalAkhir + 'T23:59:59');
      const { data } = await query;
      return (data ?? []).map((r: any) => ({
        Nama: r.nama,
        NIP: r.nip_masked,
        SKPD: r.skpd?.nama_skpd ?? '—',
        'Alasan Ditolak': r.rejection_reason ?? '—',
        'Tanggal Keputusan': formatDate(r.verified_at),
      }));
    }

    let query = supabase
      .from('sertifikat_tte')
      .select('tanggal_terbit, tanggal_expired, status_sertifikat, pendaftaran:pendaftaran_tte_id(nama, nip_masked, skpd_id, skpd:skpd_id(nama_skpd))')
      .order('tanggal_terbit', { ascending: false });
    if (tanggalMulai) query = query.gte('tanggal_terbit', tanggalMulai);
    if (tanggalAkhir) query = query.lte('tanggal_terbit', tanggalAkhir);
    const { data } = await query;
    let rows = (data ?? []) as any[];
    if (skpdId) rows = rows.filter((r) => r.pendaftaran?.skpd_id === skpdId);
    return rows.map((r) => ({
      Nama: r.pendaftaran?.nama ?? '—',
      NIP: r.pendaftaran?.nip_masked ?? '—',
      SKPD: r.pendaftaran?.skpd?.nama_skpd ?? '—',
      'Tanggal Terbit': formatDate(r.tanggal_terbit),
      'Tanggal Expired': formatDate(r.tanggal_expired),
      Status: r.status_sertifikat,
    }));
  }

  async function logExport(format: 'excel' | 'pdf', jumlahBaris: number) {
    await supabase.rpc('fn_log_export', {
      p_jenis: jenis,
      p_filter: { skpd_id: skpdId || null, tanggal_mulai: tanggalMulai || null, tanggal_akhir: tanggalAkhir || null, format },
      p_jumlah_baris: jumlahBaris,
    });
  }

  async function handleExportExcel() {
    setLoading(true);
    const rows = await fetchRows();
    setLoading(false);
    if (rows.length === 0) {
      showToast('error', 'Tidak ada data untuk filter yang dipilih.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `laporan-${jenis}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    await logExport('excel', rows.length);
    showToast('success', `Laporan Excel berhasil diunduh (${rows.length} baris).`);
  }

  async function handleExportPdf() {
    setLoading(true);
    const rows = await fetchRows();
    setLoading(false);
    if (rows.length === 0) {
      showToast('error', 'Tidak ada data untuk filter yang dipilih.');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(`Laporan Pendaftaran TTE — ${jenis === 'ditolak' ? 'Ditolak' : 'Berhasil'}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Diunduh: ${new Date().toLocaleString('id-ID')} — Bidang Persandian Kota Cirebon`, 14, 21);
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: 26,
      head: [headers],
      body: rows.map((r) => headers.map((h) => String((r as Record<string, string>)[h]))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 98, 254] },
    });
    doc.save(`laporan-${jenis}-${new Date().toISOString().slice(0, 10)}.pdf`);
    await logExport('pdf', rows.length);
    showToast('success', `Laporan PDF berhasil diunduh (${rows.length} baris).`);
  }

  return (
    <AdminLayout title="Export Laporan">
      <div className="bg-canvas border border-hairline p-lg max-w-2xl">
        <p className="text-body-sm text-ink-muted mb-lg">
          Setiap export tercatat di jejak audit keamanan (siapa, kapan, filter apa, berapa baris) — SECURITY.md §7.3.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-lg">
          <Field label="Jenis Laporan" htmlFor="jenis">
            <SelectInput id="jenis" value={jenis} onChange={(e) => setJenis(e.target.value as JenisLaporan)}>
              <option value="berhasil">Rekap Berhasil (dengan data sertifikat)</option>
              <option value="ditolak">Rekap Ditolak</option>
            </SelectInput>
          </Field>
          <Field label="SKPD" htmlFor="skpd">
            <SelectInput id="skpd" value={skpdId} onChange={(e) => setSkpdId(e.target.value)}>
              <option value="">Semua SKPD</option>
              {skpdList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_skpd}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Tanggal Mulai" htmlFor="mulai">
            <TextInput id="mulai" type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
          </Field>
          <Field label="Tanggal Akhir" htmlFor="akhir">
            <TextInput id="akhir" type="date" value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)} />
          </Field>
        </div>

        <div className="flex gap-sm flex-wrap">
          <Button variant="tertiary" onClick={handleExportExcel} loading={loading}>
            Export Excel
          </Button>
          <Button variant="tertiary" onClick={handleExportPdf} loading={loading}>
            Export PDF
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
