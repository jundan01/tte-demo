// Tipe domain — mencerminkan enum & tabel di SCHEMA.md §6-§7

export type StatusEmail = 'SUDAH_PUNYA' | 'BELUM_PUNYA';
export type StatusVerifikasi = 'MENUNGGU_VERIFIKASI' | 'DISETUJUI' | 'DITOLAK';
export type SumberData = 'MANDIRI' | 'SOSIALISASI';
export type StatusSertifikat = 'AKTIF' | 'WARNING_H3' | 'EXPIRED' | 'PERLU_PERPANJANG';

export interface Skpd {
  id: string;
  nama_skpd: string;
  kode_skpd: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PendaftaranTte {
  id: string;
  nomor_referensi: string;
  nama: string;
  nik_masked: string;
  nip_masked: string;
  pangkat: string;
  no_hp: string;
  skpd_id: string;
  skpd?: Skpd;
  status_email: StatusEmail;
  email_existing: string | null;
  email_usulan: string | null;
  email_sesuai_aturan: boolean | null;
  status_verifikasi: StatusVerifikasi;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  sumber_data: SumberData;
  created_at: string;
  updated_at: string;
}

export interface SertifikatTte {
  id: string;
  pendaftaran_tte_id: string;
  pendaftaran?: PendaftaranTte;
  tanggal_terbit: string;
  tanggal_expired: string;
  status_sertifikat: StatusSertifikat;
  verified_by_tahap2: string;
  verified_at_tahap2: string;
  tanggal_perpanjangan_diajukan: string | null;
  created_at: string;
}

export interface AdminProfile {
  user_id: string;
  name: string;
  email: string;
  skpd_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SecurityAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
