-- =====================================================================
-- SCHEMA.sql — Sistem Dashboard Monitoring TTE & Pelayanan Email Dinas
-- Bidang Persandian Kota Cirebon — DEMO (Supabase / PostgreSQL)
--
-- Diturunkan dari SCHEMA.md v1.3.0, SECURITY.md v1.2.0, ARCHITECTURE.md v1.3.0.
--
-- CATATAN PENTING SOAL KESETARAAN DENGAN SPEK PRODUKSI:
-- Skema ini MENGIKUTI SCHEMA.md sebagai rujukan final (bukan enum lama di
-- ARCHITECTURE.md §11 yang sudah ditandai inkonsistensi, konsisten dengan
-- keputusan yang sama di DESIGN.md §3).
--
-- Perbedaan yang SENGAJA dari desain produksi Laravel (didokumentasikan,
-- bukan diam-diam disederhanakan):
--   1. Enkripsi NIK/NIP: produksi memakai Laravel `encrypted` cast (AES,
--      app-level, key di .env aplikasi). Demo ini memakai pgcrypto
--      (pgp_sym_encrypt/decrypt) di level database + blind-index HMAC-SHA256
--      (nik_hash/nip_hash), pola yang SAMA seperti SECURITY.md §7.1, hanya
--      lapisan eksekusinya di Postgres, bukan di app Laravel, karena demo ini
--      tidak punya backend app server sendiri (murni Supabase + frontend).
--      Kunci enkripsi disimpan di tabel `app_secrets` yang TIDAK punya RLS
--      policy sama sekali (tidak bisa dibaca dari anon/authenticated),
--      hanya bisa diakses oleh fungsi SECURITY DEFINER di bawah.
--   2. CAPTCHA: FR-01a mensyaratkan Google reCAPTCHA v2/v3 (verifikasi server-side
--      dengan secret key). Demo ini TIDAK punya server backend untuk menyimpan
--      RECAPTCHA_SECRET_KEY dengan aman, sehingga captcha diganti captcha
--      aritmatika sederhana (client-side) — DITANDAI JELAS di UI sebagai
--      simulasi, BUKAN pengganti yang aman untuk produksi.
--   3. Scheduler harian (FR-12, ARCHITECTURE.md §10): produksi memakai Laravel
--      Task Scheduler. Demo ini menyediakan fungsi `fn_run_scheduler()` yang
--      bisa dijalankan manual dari tombol di Dashboard (mensimulasikan hasil
--      cron harian secara instan untuk keperluan demo), DAN contoh perintah
--      pg_cron (dikomentari, opsional) bila project Supabase Anda mengaktifkan
--      ekstensi pg_cron.
--   4. Pembuatan akun Superadmin baru: TIDAK diimplementasikan sebagai form
--      signup di frontend (signup publik ke tabel auth Supabase adalah risiko
--      keamanan untuk sistem admin). Akun baru dibuat lewat Supabase Dashboard
--      (Authentication → Add User) — lihat README.md.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES — SCHEMA.md §6
-- ---------------------------------------------------------------------
do $$ begin
  create type status_email_t as enum ('SUDAH_PUNYA', 'BELUM_PUNYA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_verifikasi_t as enum ('MENUNGGU_VERIFIKASI', 'DISETUJUI', 'DITOLAK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sumber_data_t as enum ('MANDIRI', 'SOSIALISASI');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_sertifikat_t as enum ('AKTIF', 'WARNING_H3', 'EXPIRED', 'PERLU_PERPANJANG');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. app_secrets — kunci enkripsi, TIDAK ADA RLS POLICY = tidak bisa
--    dibaca langsung oleh anon/authenticated, hanya via fungsi definer.
-- ---------------------------------------------------------------------
create table if not exists app_secrets (
  key_name  text primary key,
  key_value text not null
);
alter table app_secrets enable row level security;
-- Sengaja TIDAK dibuat policy apa pun di sini (fail closed — SECURITY.md §1).

-- Ganti nilai ini sebelum go-live demo. Setara peran `APP_KEY` Laravel.
insert into app_secrets (key_name, key_value)
values ('encryption_key', 'GANTI_DENGAN_STRING_ACAK_PANJANG_SEBELUM_DEPLOY')
on conflict (key_name) do nothing;

-- ---------------------------------------------------------------------
-- 3. skpd — SCHEMA.md §7.1
-- ---------------------------------------------------------------------
create table if not exists skpd (
  id          uuid primary key default gen_random_uuid(),
  nama_skpd   text not null,
  kode_skpd   text unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_skpd_nama on skpd (nama_skpd);

-- ---------------------------------------------------------------------
-- 4. admin_profiles — profil untuk akun Superadmin (auth.users bawaan
--    Supabase tidak bisa di-SELECT dari client, jadi kita cerminkan
--    subset kolom yang perlu tampil di UI Manajemen Akun (FR-19)).
-- ---------------------------------------------------------------------
create table if not exists admin_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  skpd_id     uuid references skpd (id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create or replace function handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_profiles (user_id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email), new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_admin_user();

-- ---------------------------------------------------------------------
-- 5. pendaftaran_tte — SCHEMA.md §7.3
--    nik/nip: bytea terenkripsi (pgp_sym_encrypt) + kolom *_hash (HMAC-SHA256,
--    blind index) untuk uniqueness/pencarian + kolom *_masked untuk tampilan
--    default di tabel (format "3204xxxxxxxx1234", DESIGN.md §7).
-- ---------------------------------------------------------------------
create sequence if not exists pendaftaran_ref_seq start 1;

create table if not exists pendaftaran_tte (
  id                     uuid primary key default gen_random_uuid(),
  nomor_referensi        text not null unique, -- internal Superadmin saja — PRD.md §12.1 poin 13
  nama                   text not null,
  nik                    bytea not null,
  nik_hash               text not null,
  nik_masked             text not null,
  nip                    bytea not null,
  nip_hash               text not null,
  nip_masked             text not null,
  pangkat                text not null,
  no_hp                  text not null,
  skpd_id                uuid not null references skpd (id),
  status_email           status_email_t not null,
  email_existing         text,
  email_usulan           text,
  email_sesuai_aturan    boolean,
  status_verifikasi      status_verifikasi_t not null default 'MENUNGGU_VERIFIKASI',
  rejection_reason       text,
  verified_by            uuid references auth.users (id),
  verified_at            timestamptz,
  verified_ip            text,
  sumber_data            sumber_data_t not null default 'MANDIRI',
  captcha_verified       boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_pendaftaran_skpd on pendaftaran_tte (skpd_id);
create index if not exists idx_pendaftaran_status on pendaftaran_tte (status_verifikasi);
create index if not exists idx_pendaftaran_created on pendaftaran_tte (created_at);

-- Partial unique index — SCHEMA.md §7.3: NIK/NIP yang DITOLAK boleh dipakai
-- submit ulang; yang masih MENUNGGU_VERIFIKASI/DISETUJUI tetap terkunci.
create unique index if not exists pendaftaran_tte_nik_hash_active_unique
  on pendaftaran_tte (nik_hash) where status_verifikasi != 'DITOLAK';
create unique index if not exists pendaftaran_tte_nip_hash_active_unique
  on pendaftaran_tte (nip_hash) where status_verifikasi != 'DITOLAK';

-- ---------------------------------------------------------------------
-- 6. sertifikat_tte — SCHEMA.md §7.4
-- ---------------------------------------------------------------------
create table if not exists sertifikat_tte (
  id                              uuid primary key default gen_random_uuid(),
  pendaftaran_tte_id              uuid not null unique references pendaftaran_tte (id),
  tanggal_terbit                  date not null,
  tanggal_expired                 date not null,
  status_sertifikat               status_sertifikat_t not null default 'AKTIF',
  verified_by_tahap2              uuid not null references auth.users (id),
  verified_at_tahap2              timestamptz not null default now(),
  verified_ip_tahap2              text,
  tanggal_perpanjangan_diajukan   date,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index if not exists idx_sertifikat_status on sertifikat_tte (status_sertifikat);
create index if not exists idx_sertifikat_status_expired on sertifikat_tte (status_sertifikat, tanggal_expired);

-- ---------------------------------------------------------------------
-- 7. security_audit_logs — SCHEMA.md §7.5, append-only
-- ---------------------------------------------------------------------
create table if not exists security_audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id),
  action        text not null,
  subject_type  text,
  subject_id    uuid,
  ip_address    text,
  user_agent    text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_user on security_audit_logs (user_id);
create index if not exists idx_audit_action on security_audit_logs (action);
create index if not exists idx_audit_created on security_audit_logs (created_at);
create index if not exists idx_audit_subject on security_audit_logs (subject_type, subject_id);

-- ---------------------------------------------------------------------
-- 7b. fn_is_mfa_verified() — SECURITY.md §6.2 mewajibkan MFA untuk SELURUH
--     akun superadmin. Mengecek auth.uid() saja TIDAK cukup: seorang user
--     yang baru lolos password (sesi aal1) tapi belum verifikasi OTP masih
--     "authenticated" secara role, hanya belum aal2. Fungsi & RLS di bawah
--     memakai helper ini agar endpoint sensitif benar-benar terkunci sampai
--     MFA selesai, bukan hanya dijaga oleh routing di frontend (yang bisa
--     dilewati dengan memanggil Supabase API langsung).
-- ---------------------------------------------------------------------
create or replace function fn_is_mfa_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;
grant execute on function fn_is_mfa_verified to authenticated;

-- =====================================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================================
alter table skpd enable row level security;
alter table admin_profiles enable row level security;
alter table pendaftaran_tte enable row level security;
alter table sertifikat_tte enable row level security;
alter table security_audit_logs enable row level security;

-- skpd: dibaca publik (dropdown form) & superadmin; ditulis hanya superadmin
drop policy if exists skpd_select_all on skpd;
create policy skpd_select_all on skpd for select using (true);
drop policy if exists skpd_write_authenticated on skpd;
create policy skpd_write_authenticated on skpd for all
  using (auth.role() = 'authenticated' and fn_is_mfa_verified())
  with check (auth.role() = 'authenticated' and fn_is_mfa_verified());

-- admin_profiles: hanya superadmin yang SUDAH lolos MFA (aal2) boleh lihat
-- daftar akun (FR-19). Update langsung DIBLOKIR dari client — hanya lewat
-- fn_toggle_admin_active() (SECURITY DEFINER) agar konsisten tercatat di
-- audit log.
drop policy if exists admin_profiles_select on admin_profiles;
create policy admin_profiles_select on admin_profiles for select
  using (auth.role() = 'authenticated' and fn_is_mfa_verified());

-- pendaftaran_tte: TIDAK ADA policy insert untuk anon — insert wajib lewat
-- fn_submit_pendaftaran() (SECURITY DEFINER) supaya pesan error generik
-- (anti-enumerasi, SECURITY.md §5.2) benar-benar ditegakkan di satu tempat.
-- SELECT & UPDATE hanya untuk sesi yang sudah aal2 (MFA wajib, SECURITY.md §6.2).
drop policy if exists pendaftaran_select_authenticated on pendaftaran_tte;
create policy pendaftaran_select_authenticated on pendaftaran_tte for select
  using (auth.role() = 'authenticated' and fn_is_mfa_verified());
-- Update langsung juga diblokir — hanya lewat fn_approve_tahap1/fn_reject_tahap1.

-- sertifikat_tte: dibaca superadmin ber-aal2; ditulis hanya lewat
-- fn_issue_sertifikat / fn_mark_perlu_perpanjang / fn_run_scheduler
-- (semuanya SECURITY DEFINER, masing-masing mengecek aal2 juga).
drop policy if exists sertifikat_select_authenticated on sertifikat_tte;
create policy sertifikat_select_authenticated on sertifikat_tte for select
  using (auth.role() = 'authenticated' and fn_is_mfa_verified());

-- security_audit_logs: superadmin ber-aal2 boleh lihat semua log (dashboard
-- keamanan, SECURITY.md §8.1); insert dibatasi hanya untuk baris milik diri
-- sendiri (dipakai saat reveal NIK/NIP dari UI — fn_reveal_pii sudah mencatat
-- otomatis; kolom ini tetap dibuka untuk kasus insert langsung di masa depan).
drop policy if exists audit_select_authenticated on security_audit_logs;
create policy audit_select_authenticated on security_audit_logs for select
  using (auth.role() = 'authenticated' and fn_is_mfa_verified());
drop policy if exists audit_insert_own on security_audit_logs;
create policy audit_insert_own on security_audit_logs for insert
  with check (auth.uid() = user_id and fn_is_mfa_verified());

-- =====================================================================
-- 9. FUNGSI BISNIS (SECURITY DEFINER) — setiap aksi sensitif + audit log
--    tercatat atomik dalam satu transaksi, selaras prinsip Auditability
--    (SECURITY.md §1) dan DESIGN.md §1 poin 2 ("Aksi sensitif selalu
--    minta konfirmasi eksplisit dengan jejak yang terlihat").
-- =====================================================================

-- 9.1 Generator usulan username email dinas — PRD.md FR-03, ARCHITECTURE.md §6.1
create or replace function fn_generate_email_usulan(p_nama text, p_nip text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 0;
begin
  -- [Asumsi demo] aturan penamaan persis belum dispesifikasikan
  -- (ARCHITECTURE.md §6.1) — pendekatan: nama diringkas huruf kecil tanpa
  -- spasi/simbol; jika bentrok, tambahkan 2 digit terakhir NIP, lalu counter.
  v_base := lower(regexp_replace(p_nama, '[^a-zA-Z]', '', 'g'));
  v_candidate := v_base || '@cirebonkota.go.id';

  while exists (
    select 1 from pendaftaran_tte
    where email_usulan = v_candidate or email_existing = v_candidate
  ) loop
    v_suffix := v_suffix + 1;
    if v_suffix = 1 then
      v_candidate := v_base || right(p_nip, 2) || '@cirebonkota.go.id';
    else
      v_candidate := v_base || right(p_nip, 2) || v_suffix || '@cirebonkota.go.id';
    end if;
  end loop;

  return v_candidate;
end;
$$;

-- 9.2 Submit pendaftaran publik — PRD.md FR-01–03, FR-02a
create or replace function fn_submit_pendaftaran(
  p_nama            text,
  p_nik             text,
  p_nip             text,
  p_no_hp           text,
  p_pangkat         text,
  p_skpd_id         uuid,
  p_status_email    status_email_t,
  p_email_existing  text,
  p_captcha_ok      boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_nik_hash text;
  v_nip_hash text;
  v_email_usulan text;
  v_nomor_ref text;
  v_new_id uuid;
begin
  if p_captcha_ok is distinct from true then
    raise exception 'Verifikasi CAPTCHA gagal. Silakan coba lagi.';
  end if;

  if p_nik !~ '^[0-9]{16}$' then
    raise exception 'NIK harus tepat 16 digit angka.';
  end if;
  if p_nip !~ '^[0-9]{18}$' then
    raise exception 'NIP harus tepat 18 digit angka.';
  end if;
  if p_status_email = 'SUDAH_PUNYA' and (p_email_existing is null or length(trim(p_email_existing)) = 0) then
    raise exception 'Email dinas wajib diisi karena Anda memilih "Sudah Punya".';
  end if;

  select key_value into v_key from app_secrets where key_name = 'encryption_key';

  v_nik_hash := encode(hmac(p_nik, v_key, 'sha256'), 'hex');
  v_nip_hash := encode(hmac(p_nip, v_key, 'sha256'), 'hex');

  -- Cek keunikan (mengecualikan baris DITOLAK) — pesan error SELALU generik
  -- dan SAMA untuk NIK maupun NIP, mencegah enumerasi (SECURITY.md §5.2).
  if exists (
    select 1 from pendaftaran_tte
    where status_verifikasi != 'DITOLAK'
      and (nik_hash = v_nik_hash or nip_hash = v_nip_hash)
  ) then
    raise exception 'NIK/NIP sudah terdata.';
  end if;

  if p_status_email = 'BELUM_PUNYA' then
    v_email_usulan := fn_generate_email_usulan(p_nama, p_nip);
  end if;

  v_nomor_ref := 'REF-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('pendaftaran_ref_seq')::text, 5, '0');

  insert into pendaftaran_tte (
    nomor_referensi, nama, nik, nik_hash, nik_masked, nip, nip_hash, nip_masked,
    pangkat, no_hp, skpd_id, status_email, email_existing, email_usulan,
    captcha_verified
  ) values (
    v_nomor_ref, p_nama,
    pgp_sym_encrypt(p_nik, v_key), v_nik_hash, left(p_nik, 4) || repeat('x', 8) || right(p_nik, 4),
    pgp_sym_encrypt(p_nip, v_key), v_nip_hash, left(p_nip, 4) || repeat('x', 10) || right(p_nip, 4),
    p_pangkat, p_no_hp, p_skpd_id, p_status_email, nullif(trim(p_email_existing), ''), v_email_usulan,
    true
  ) returning id into v_new_id;

  insert into security_audit_logs (user_id, action, subject_type, subject_id, metadata)
  values (null, 'submit_pendaftaran', 'pendaftaran_tte', v_new_id, jsonb_build_object('skpd_id', p_skpd_id));

  -- Sengaja TIDAK mengembalikan nomor_referensi ke pemanggil — kolom ini
  -- murni internal Superadmin (PRD.md §12.1 poin 13).
  return json_build_object('success', true);
end;
$$;

-- Hak eksekusi: publik (anon) boleh submit pendaftaran, superadmin juga boleh
-- (mis. input data sosialisasi lewat form yang sama jika diperlukan).
grant execute on function fn_submit_pendaftaran to anon, authenticated;
grant execute on function fn_generate_email_usulan to anon, authenticated;

-- 9.3 Approve Tahap 1 — PRD.md FR-06, FR-08
create or replace function fn_approve_tahap1(p_id uuid, p_ip text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;

  update pendaftaran_tte
  set status_verifikasi = 'DISETUJUI',
      verified_by = auth.uid(),
      verified_at = now(),
      verified_ip = p_ip,
      updated_at = now()
  where id = p_id and status_verifikasi = 'MENUNGGU_VERIFIKASI';

  if not found then
    raise exception 'Pendaftaran tidak ditemukan atau sudah diproses.';
  end if;

  insert into security_audit_logs (user_id, action, subject_type, subject_id, ip_address)
  values (auth.uid(), 'approve_tahap1', 'pendaftaran_tte', p_id, p_ip);

  return json_build_object('success', true);
end;
$$;
grant execute on function fn_approve_tahap1 to authenticated;

-- 9.4 Reject Tahap 1 — PRD.md FR-06, FR-07
create or replace function fn_reject_tahap1(p_id uuid, p_reason text, p_ip text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'Alasan penolakan wajib diisi (minimal 5 karakter).';
  end if;

  update pendaftaran_tte
  set status_verifikasi = 'DITOLAK',
      rejection_reason = p_reason,
      verified_by = auth.uid(),
      verified_at = now(),
      verified_ip = p_ip,
      updated_at = now()
  where id = p_id and status_verifikasi = 'MENUNGGU_VERIFIKASI';

  if not found then
    raise exception 'Pendaftaran tidak ditemukan atau sudah diproses.';
  end if;

  insert into security_audit_logs (user_id, action, subject_type, subject_id, ip_address, metadata)
  values (auth.uid(), 'reject_tahap1', 'pendaftaran_tte', p_id, p_ip, jsonb_build_object('reason', p_reason));

  return json_build_object('success', true);
end;
$$;
grant execute on function fn_reject_tahap1 to authenticated;

-- 9.5 Penerbitan sertifikat Tahap 2 — PRD.md FR-09–11
create or replace function fn_issue_sertifikat(p_pendaftaran_id uuid, p_tanggal_terbit date, p_ip text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status status_verifikasi_t;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;

  select status_verifikasi into v_status from pendaftaran_tte where id = p_pendaftaran_id for update;
  if v_status is null then
    raise exception 'Pendaftaran tidak ditemukan.';
  end if;
  if v_status != 'DISETUJUI' then
    raise exception 'Pendaftaran belum lolos Verifikasi Tahap 1.';
  end if;
  if exists (select 1 from sertifikat_tte where pendaftaran_tte_id = p_pendaftaran_id) then
    raise exception 'Sertifikat untuk pendaftaran ini sudah pernah diterbitkan.';
  end if;
  if p_tanggal_terbit > current_date then
    raise exception 'Tanggal terbit tidak boleh di masa depan.';
  end if;

  insert into sertifikat_tte (
    pendaftaran_tte_id, tanggal_terbit, tanggal_expired, status_sertifikat,
    verified_by_tahap2, verified_at_tahap2, verified_ip_tahap2
  ) values (
    p_pendaftaran_id, p_tanggal_terbit, p_tanggal_terbit + interval '2 years', 'AKTIF',
    auth.uid(), now(), p_ip
  ) returning id into v_new_id;

  insert into security_audit_logs (user_id, action, subject_type, subject_id, ip_address)
  values (auth.uid(), 'verify_tahap2', 'sertifikat_tte', v_new_id, p_ip);

  return json_build_object('success', true, 'sertifikat_id', v_new_id);
end;
$$;
grant execute on function fn_issue_sertifikat to authenticated;

-- 9.6 Tandai PERLU_PERPANJANG manual — PRD.md FR-14
create or replace function fn_mark_perlu_perpanjang(p_sertifikat_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;

  update sertifikat_tte
  set status_sertifikat = 'PERLU_PERPANJANG', updated_at = now()
  where id = p_sertifikat_id;

  if not found then
    raise exception 'Sertifikat tidak ditemukan.';
  end if;

  insert into security_audit_logs (user_id, action, subject_type, subject_id)
  values (auth.uid(), 'mark_perlu_perpanjang', 'sertifikat_tte', p_sertifikat_id);

  return json_build_object('success', true);
end;
$$;
grant execute on function fn_mark_perlu_perpanjang to authenticated;

-- 9.7 Scheduler harian H-3/EXPIRED — PRD.md FR-12, ARCHITECTURE.md §10
-- Produksi: dijalankan via Laravel Task Scheduler tiap hari. Demo: bisa
-- dipicu manual dari tombol "Jalankan Scheduler" di Dashboard, ATAU
-- dijadwalkan otomatis lewat pg_cron bila ekstensi tersedia (lihat catatan
-- di akhir file).
create or replace function fn_run_scheduler()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count int;
  v_warning_count int;
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;

  update sertifikat_tte
  set status_sertifikat = 'EXPIRED', updated_at = now()
  where status_sertifikat not in ('EXPIRED', 'PERLU_PERPANJANG')
    and tanggal_expired <= current_date;
  get diagnostics v_expired_count = row_count;

  update sertifikat_tte
  set status_sertifikat = 'WARNING_H3', updated_at = now()
  where status_sertifikat not in ('EXPIRED', 'WARNING_H3', 'PERLU_PERPANJANG')
    and tanggal_expired > current_date
    and tanggal_expired <= current_date + interval '3 days';
  get diagnostics v_warning_count = row_count;

  insert into security_audit_logs (user_id, action, metadata)
  values (auth.uid(), 'run_scheduler', jsonb_build_object('expired', v_expired_count, 'warning_h3', v_warning_count));

  return json_build_object('success', true, 'expired', v_expired_count, 'warning_h3', v_warning_count);
end;
$$;
grant execute on function fn_run_scheduler to authenticated;

-- 9.8 Reveal NIK/NIP penuh — DESIGN.md §7 masked-data, SECURITY.md §7.2
-- Setiap pemanggilan tercatat di security_audit_logs (action=view_nik/view_nip).
create or replace function fn_reveal_pii(p_pendaftaran_id uuid, p_field text, p_ip text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_value text;
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;
  if p_field not in ('nik', 'nip') then
    raise exception 'Field tidak valid.';
  end if;

  select key_value into v_key from app_secrets where key_name = 'encryption_key';

  if p_field = 'nik' then
    select pgp_sym_decrypt(nik, v_key) into v_value from pendaftaran_tte where id = p_pendaftaran_id;
  else
    select pgp_sym_decrypt(nip, v_key) into v_value from pendaftaran_tte where id = p_pendaftaran_id;
  end if;

  if v_value is null then
    raise exception 'Data tidak ditemukan.';
  end if;

  insert into security_audit_logs (user_id, action, subject_type, subject_id, ip_address)
  values (auth.uid(), 'view_' || p_field, 'pendaftaran_tte', p_pendaftaran_id, p_ip);

  return v_value;
end;
$$;
grant execute on function fn_reveal_pii to authenticated;

-- 9.9 Toggle aktif/nonaktif akun Superadmin — PRD.md FR-19
create or replace function fn_toggle_admin_active(p_user_id uuid, p_is_active boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;
  if p_user_id = auth.uid() and p_is_active = false then
    raise exception 'Anda tidak dapat menonaktifkan akun Anda sendiri.';
  end if;

  update admin_profiles set is_active = p_is_active where user_id = p_user_id;
  if not found then
    raise exception 'Akun tidak ditemukan.';
  end if;

  insert into security_audit_logs (user_id, action, subject_type, subject_id, metadata)
  values (auth.uid(), 'update_user_active', 'admin_profiles', p_user_id, jsonb_build_object('is_active', p_is_active));

  return json_build_object('success', true);
end;
$$;
grant execute on function fn_toggle_admin_active to authenticated;

-- 9.10 Export laporan — audit trail export massal (SECURITY.md §7.3, FR-17)
-- Dipanggil dari frontend SETELAH data berhasil diambil & file dibuat, murni
-- untuk mencatat jejak (siapa, kapan, filter apa, berapa baris).
create or replace function fn_log_export(p_jenis text, p_filter jsonb, p_jumlah_baris int)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tidak diizinkan.';
  end if;
  if not fn_is_mfa_verified() then
    raise exception 'Aksi ini wajib menyelesaikan verifikasi MFA terlebih dahulu.';
  end if;

  insert into security_audit_logs (user_id, action, metadata)
  values (auth.uid(), 'export_laporan', p_filter || jsonb_build_object('jenis', p_jenis, 'jumlah_baris', p_jumlah_baris));

  return json_build_object('success', true);
end;
$$;
grant execute on function fn_log_export to authenticated;

-- ---------------------------------------------------------------------
-- 10. Alerting segregation-of-duty — SECURITY.md §6.4, §8.1
--     View bantu untuk Dashboard: pendaftaran yang verified_by (Tahap 1)
--     sama dengan verified_by_tahap2 (Tahap 2) pada record yang sama.
-- ---------------------------------------------------------------------
-- View bantu: pendaftaran yang sudah DISETUJUI (Tahap 1) tapi belum punya
-- sertifikat_tte (belum diproses Tahap 2) — dipakai halaman Penerbitan.
-- security_invoker=true WAJIB: tanpa ini, view berjalan dengan hak akses
-- pemilik view (biasanya `postgres`, yang bypass RLS) alih-alih hak akses
-- pengguna yang benar-benar melakukan query — akan membocorkan RLS.
create or replace view v_pendaftaran_siap_tahap2
with (security_invoker = true) as
select p.*
from pendaftaran_tte p
left join sertifikat_tte s on s.pendaftaran_tte_id = p.id
where p.status_verifikasi = 'DISETUJUI' and s.id is null;

grant select on v_pendaftaran_siap_tahap2 to authenticated;

create or replace view v_segregation_alerts
with (security_invoker = true) as
select
  p.id as pendaftaran_id,
  p.nomor_referensi,
  p.nama,
  s.id as sertifikat_id,
  p.verified_by as verified_by_tahap1,
  s.verified_by_tahap2
from pendaftaran_tte p
join sertifikat_tte s on s.pendaftaran_tte_id = p.id
where p.verified_by = s.verified_by_tahap2;

grant select on v_segregation_alerts to authenticated;

-- ---------------------------------------------------------------------
-- 11. SEED DATA — data referensi SKPD contoh (silakan sesuaikan)
-- ---------------------------------------------------------------------
insert into skpd (nama_skpd, kode_skpd) values
  ('Dinas Komunikasi dan Informatika', 'DISKOMINFO'),
  ('Dinas Pendidikan', 'DISDIK'),
  ('Dinas Kesehatan', 'DINKES'),
  ('Badan Kepegawaian dan Pengembangan SDM', 'BKPSDM'),
  ('Sekretariat Daerah', 'SETDA'),
  ('Dinas Pekerjaan Umum dan Penataan Ruang', 'DPUPR')
on conflict (kode_skpd) do nothing;

-- ---------------------------------------------------------------------
-- 12. OPSIONAL — pg_cron untuk scheduler otomatis harian (perlu extension
--     pg_cron diaktifkan lewat Supabase Dashboard → Database → Extensions).
--     Uncomment baris di bawah setelah ekstensi aktif.
-- ---------------------------------------------------------------------
-- select cron.schedule('scheduler-h3-harian', '0 1 * * *', $$select fn_run_scheduler();$$);

-- ===================== SELESAI — schema.sql =====================
