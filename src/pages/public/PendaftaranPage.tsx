import { FormEvent, useEffect, useState } from 'react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicChrome';
import { Field, TextInput, SelectInput } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { Skpd, StatusEmail } from '../../types';
import { generateCaptcha } from '../../lib/utils';

interface FormState {
  nama: string;
  nik: string;
  nip: string;
  pangkat: string;
  no_hp: string;
  skpd_id: string;
  status_email: StatusEmail | '';
  email_existing: string;
  captchaAnswer: string;
}

const initialForm: FormState = {
  nama: '',
  nik: '',
  nip: '',
  pangkat: '',
  no_hp: '',
  skpd_id: '',
  status_email: '',
  email_existing: '',
  captchaAnswer: '',
};

export default function PendaftaranPage() {
  const [skpdList, setSkpdList] = useState<Skpd[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());

  useEffect(() => {
    supabase
      .from('skpd')
      .select('id, nama_skpd, kode_skpd, is_active, created_at')
      .eq('is_active', true)
      .order('nama_skpd')
      .then(({ data }) => setSkpdList((data as Skpd[]) ?? []));
  }, []);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.nama.trim()) next.nama = 'Nama wajib diisi.';
    if (!/^\d{16}$/.test(form.nik)) next.nik = 'NIK harus tepat 16 digit angka.';
    if (!/^\d{18}$/.test(form.nip)) next.nip = 'NIP harus tepat 18 digit angka.';
    if (!form.pangkat.trim()) next.pangkat = 'Pangkat/Golongan wajib diisi.';
    if (!/^0[0-9]{8,14}$/.test(form.no_hp)) next.no_hp = 'Nomor HP tidak valid (contoh: 081234567890).';
    if (!form.skpd_id) next.skpd_id = 'SKPD wajib dipilih.';
    if (!form.status_email) next.status_email = 'Status email dinas wajib dipilih.';
    if (form.status_email === 'SUDAH_PUNYA' && !form.email_existing.trim()) {
      next.email_existing = 'Email dinas wajib diisi karena Anda memilih "Sudah Punya".';
    }
    if (Number(form.captchaAnswer) !== captcha.answer) {
      next.captchaAnswer = 'Jawaban CAPTCHA tidak tepat.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    const { error } = await supabase.rpc('fn_submit_pendaftaran', {
      p_nama: form.nama.trim(),
      p_nik: form.nik,
      p_nip: form.nip,
      p_no_hp: form.no_hp,
      p_pangkat: form.pangkat.trim(),
      p_skpd_id: form.skpd_id,
      p_status_email: form.status_email,
      p_email_existing: form.status_email === 'SUDAH_PUNYA' ? form.email_existing.trim() : null,
      p_captcha_ok: true,
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      setCaptcha(generateCaptcha());
      setForm((f) => ({ ...f, captchaAnswer: '' }));
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex justify-center px-md py-xl">
        <div className="w-full max-w-[640px]">
          {success ? (
            <div className="bg-canvas border border-hairline p-xl text-center">
              <div className="w-12 h-12 mx-auto mb-md bg-success flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-card-title text-ink mb-xs">Data Anda telah kami terima</h1>
              <p className="text-body text-ink-muted">
                Terima kasih. Pendaftaran TTE Anda akan diproses oleh Bidang Persandian. Hasil verifikasi akan
                disampaikan langsung kepada Anda melalui kontak/WhatsApp yang telah Anda daftarkan.
              </p>
            </div>
          ) : (
            <div className="bg-canvas border border-hairline p-xl">
              <h1 className="text-display-md text-ink mb-xxs">Pendaftaran TTE</h1>
              <p className="text-body text-ink-muted mb-lg">
                Formulir pendaftaran Tanda Tangan Elektronik (TTE) untuk ASN Kota Cirebon. Pastikan seluruh data diisi
                dengan benar sebelum mengirim.
              </p>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-md">
                <Field label="Nama Lengkap" required error={errors.nama} htmlFor="nama">
                  <TextInput
                    id="nama"
                    value={form.nama}
                    error={!!errors.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    autoComplete="name"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <Field label="NIK" required hint="16 digit angka" error={errors.nik} htmlFor="nik">
                    <TextInput
                      id="nik"
                      inputMode="numeric"
                      maxLength={16}
                      value={form.nik}
                      error={!!errors.nik}
                      onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, '') })}
                    />
                  </Field>
                  <Field label="NIP" required hint="18 digit angka" error={errors.nip} htmlFor="nip">
                    <TextInput
                      id="nip"
                      inputMode="numeric"
                      maxLength={18}
                      value={form.nip}
                      error={!!errors.nip}
                      onChange={(e) => setForm({ ...form, nip: e.target.value.replace(/\D/g, '') })}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <Field label="Pangkat/Golongan" required error={errors.pangkat} htmlFor="pangkat">
                    <TextInput
                      id="pangkat"
                      value={form.pangkat}
                      error={!!errors.pangkat}
                      onChange={(e) => setForm({ ...form, pangkat: e.target.value })}
                    />
                  </Field>
                  <Field label="Nomor HP/WhatsApp" required hint="Untuk dihubungi hasil verifikasi" error={errors.no_hp} htmlFor="no_hp">
                    <TextInput
                      id="no_hp"
                      inputMode="tel"
                      value={form.no_hp}
                      error={!!errors.no_hp}
                      onChange={(e) => setForm({ ...form, no_hp: e.target.value.replace(/[^\d]/g, '') })}
                      placeholder="081234567890"
                    />
                  </Field>
                </div>

                <Field label="SKPD / Unit Kerja" required error={errors.skpd_id} htmlFor="skpd_id">
                  <SelectInput
                    id="skpd_id"
                    value={form.skpd_id}
                    error={!!errors.skpd_id}
                    onChange={(e) => setForm({ ...form, skpd_id: e.target.value })}
                  >
                    <option value="">— Pilih SKPD —</option>
                    {skpdList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_skpd}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Status Email Dinas" required error={errors.status_email} htmlFor="status_email">
                  <SelectInput
                    id="status_email"
                    value={form.status_email}
                    error={!!errors.status_email}
                    onChange={(e) => setForm({ ...form, status_email: e.target.value as StatusEmail })}
                  >
                    <option value="">— Pilih —</option>
                    <option value="SUDAH_PUNYA">Sudah Punya Email Dinas</option>
                    <option value="BELUM_PUNYA">Belum Punya (usulkan otomatis)</option>
                  </SelectInput>
                </Field>

                {form.status_email === 'SUDAH_PUNYA' && (
                  <Field
                    label="Email Dinas Aktif"
                    required
                    hint="Format: nama@cirebonkota.go.id"
                    error={errors.email_existing}
                    htmlFor="email_existing"
                  >
                    <TextInput
                      id="email_existing"
                      type="email"
                      value={form.email_existing}
                      error={!!errors.email_existing}
                      onChange={(e) => setForm({ ...form, email_existing: e.target.value })}
                      placeholder="nama@cirebonkota.go.id"
                    />
                  </Field>
                )}

                {form.status_email === 'BELUM_PUNYA' && (
                  <p className="text-caption text-ink-muted -mt-xs">
                    Usulan username email dinas akan dibuatkan otomatis oleh sistem berdasarkan nama Anda.
                  </p>
                )}

                <div className="border border-dashed border-hairline p-md bg-surface-1">
                  <Field
                    label={`Verifikasi: berapa hasil dari ${captcha.question}?`}
                    required
                    error={errors.captchaAnswer}
                    htmlFor="captcha"
                    hint="CAPTCHA demo — produksi memakai Google reCAPTCHA v2/v3 (FR-01a)"
                  >
                    <TextInput
                      id="captcha"
                      inputMode="numeric"
                      value={form.captchaAnswer}
                      error={!!errors.captchaAnswer}
                      onChange={(e) => setForm({ ...form, captchaAnswer: e.target.value })}
                      className="max-w-[120px]"
                    />
                  </Field>
                </div>

                {submitError && (
                  <div className="border-l-[3px] border-l-error bg-canvas px-md py-sm text-body-sm text-ink" role="alert">
                    {submitError}
                  </div>
                )}

                <Button type="submit" loading={submitting} className="w-full mt-xs">
                  Kirim Pendaftaran
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
