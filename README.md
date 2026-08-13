# TTE Cirebon — Demo Sistem Monitoring TTE & Email Dinas

Demo internal untuk **Sistem Dashboard Monitoring TTE & Pelayanan Email Dinas**,
Bidang Persandian Kota Cirebon. Dibangun mengikuti alur bisnis, skema data, dan
kontrol keamanan yang sudah didefinisikan di `PRD.md`, `ARCHITECTURE.md`,
`SCHEMA.md`, `SECURITY.md`, dan `DESIGN.md`.

**Stack demo ini:** React + Vite + TypeScript + Tailwind (token `DESIGN.md`) +
Supabase (Postgres + Auth + RLS). Ini **bukan** implementasi Laravel yang
dispesifikasikan di `ARCHITECTURE.md` — lihat bagian "Perbedaan dari Spesifikasi
Produksi" di bawah untuk penyesuaian yang disengaja.

---

## 1. Setup — Sudah Otomatis di Bolt

Project ini sudah terhubung ke database Supabase yang aktif. Skema database
(tabel, RLS, fungsi bisnis, data SKPD contoh) sudah diterapkan. File `.env`
sudah berisi kredensial yang benar.

Akun Superadmin demo sudah dibuat:
- **Email:** `admin@cirebonkota.go.id`
- **Password:** `CirebonTTE2026!`

Login pertama kali akan mengarahkan ke halaman **Aktivasi MFA** (wajib —
SECURITY.md §6.2) sebelum bisa mengakses Panel Superadmin.

## 2. Jalankan secara lokal

```bash
npm install
npm run dev
```

- Portal Publik (form pendaftaran): `http://localhost:5173/`
- Login Superadmin: `http://localhost:5173/login`

## 5. Import ke Bolt

Cara termudah: buka [bolt.new](https://bolt.new), lalu:

- **Opsi A — Upload folder:** seret seluruh folder proyek ini (setelah
  di-unzip) ke jendela chat Bolt. Bolt akan mendeteksi ini sebagai proyek
  Vite + React dan langsung menjalankan `npm install`.
- **Opsi B — Via GitHub:** push folder ini ke repo GitHub baru, lalu di Bolt
  pilih **Import from GitHub** dan tempel URL repo-nya.

Setelah proyek terbuka di Bolt:
1. Buat file `.env` di root proyek (Bolt punya file explorer bawaan) dan isi
   sesuai langkah 3 di atas — **atau** gunakan integrasi Supabase bawaan Bolt
   ("Connect to Supabase" di panel kanan atas) jika tersedia, lalu jalankan
   `supabase/schema.sql` lewat SQL Editor Supabase seperti langkah 1.
2. Bolt otomatis menjalankan `npm run dev` — preview langsung tampil di panel
   kanan.

---

## Perbedaan dari Spesifikasi Produksi (disengaja & didokumentasikan)

Demo ini dibuat seiring alur bisnis penuh, tapi beberapa hal disesuaikan
karena keterbatasan platform (Bolt/Supabase tanpa backend Laravel terpisah).
**Jangan dipakai sebagai pengganti implementasi Laravel produksi** — lihat
juga catatan panjang di bagian atas `supabase/schema.sql`.

| Area | Spesifikasi Produksi | Demo Ini |
| :--- | :--- | :--- |
| Enkripsi NIK/NIP | Laravel `encrypted` cast (AES) di app layer, `APP_KEY` di `.env` Laravel | `pgcrypto` (AES) di level Postgres + blind-index HMAC-SHA256 — pola yang **sama**, lapisan eksekusi berbeda (SECURITY.md §7.1) |
| CAPTCHA | Google reCAPTCHA v2/v3, diverifikasi server-side dengan secret key (FR-01a) | CAPTCHA aritmatika sederhana, client-side — **bukan pengganti aman untuk produksi**, hanya mensimulasikan adanya gerbang CAPTCHA di alur |
| Scheduler H-3 harian | Laravel Task Scheduler (cron) — ARCHITECTURE.md §10 | Tombol manual "Jalankan Scheduler" di Dashboard untuk demo instan, ditambah contoh `pg_cron` opsional di `schema.sql` |
| Pembuatan akun Superadmin baru | Endpoint admin terautentikasi di backend Laravel | Lewat Supabase Dashboard saja (signup publik dinonaktifkan) — lihat §2 di atas |
| MFA | Laravel Fortify TOTP | Supabase Auth MFA (TOTP) — **sungguhan**, bukan simulasi UI; sesi tidak naik ke `aal2` sampai kode OTP diverifikasi, dan seluruh RLS/RPC sensitif mensyaratkan `aal2` |

## Struktur Proyek

```
supabase/schema.sql       — skema DB lengkap: tabel, RLS, fungsi bisnis
src/lib/                  — klien Supabase, util
src/types/                — tipe domain (selaras SCHEMA.md §6-7)
src/contexts/              — AuthContext (sesi + MFA), ToastContext
src/components/ui/         — komponen dasar mengikuti DESIGN.md §7
src/components/layout/     — chrome Portal Publik & Panel Superadmin
src/pages/public/          — Portal Publik (form pendaftaran)
src/pages/auth/            — Login, MFA Enroll, MFA Challenge
src/pages/admin/           — Dashboard, Antrian, Penerbitan, Monitoring H-3,
                              Export, SKPD, Akun
```

## Traceability Singkat

| Halaman | FR Terkait |
| :--- | :--- |
| Portal Publik | FR-01–03, FR-02a |
| Antrian (Tahap 1) | FR-05–08 |
| Penerbitan (Tahap 2) | FR-09–11 |
| Monitoring H-3 | FR-12–14 |
| Export Laporan | FR-15–17 |
| Manajemen SKPD | FR-18 |
| Manajemen Akun | FR-19 |
| Login + MFA | FR-21 |
