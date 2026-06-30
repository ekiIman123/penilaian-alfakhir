"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Save, Upload, X, Building2, Calendar, UserCog, ImageIcon, PenLine } from "lucide-react"

interface OrgSettingsForm {
  yayasanName: string
  schoolName: string
  address: string
  phone: string
  city: string
  periodLabel: string
  kepalaSekolah: string
  kepalaTitle: string
  kepalaSignatureBase64: string | null
  signer2Name: string
  signer2Title: string
  signer2SignatureBase64: string | null
  ketuaName: string
  ketuaTitle: string
  ketuaSignatureBase64: string | null
  logoBase64: string | null
}

const FIELD_STYLE = {
  borderColor: "#DDE3EC",
  backgroundColor: "#FFFFFF",
  color: "#1A2233",
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-lg mb-4"
      style={{ backgroundColor: "#F8FAFC", border: "1px solid #DDE3EC" }}
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(196,151,42,0.12)" }}>
        <Icon size={14} style={{ color: "#C4972A" }} />
      </div>
      <span className="font-semibold text-sm" style={{ color: "#1A2233" }}>{title}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "#64748B" }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
      style={FIELD_STYLE}
    />
  )
}

function SignatureUpload({
  value,
  onChange,
  label,
}: {
  value: string | null
  onChange: (v: string | null) => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar PNG/JPG")
      return
    }
    if (file.size > 300 * 1024) {
      toast.error("Ukuran tanda tangan maks. 300 KB")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "#64748B" }}>{label}</label>
      <div
        className="rounded-lg overflow-hidden flex flex-col"
        style={{ border: "1px dashed #DDE3EC", backgroundColor: "#F8FAFC" }}
      >
        {/* Preview */}
        <div className="h-14 flex items-center justify-center px-3">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Tanda tangan" className="max-h-12 max-w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-50">
              <PenLine size={16} style={{ color: "#94A3B8" }} />
              <span className="text-[10px]" style={{ color: "#94A3B8" }}>Belum ada</span>
            </div>
          )}
        </div>
        {/* Actions */}
        <div
          className="flex items-center justify-center gap-1.5 px-2 py-1.5"
          style={{ borderTop: "1px dashed #DDE3EC" }}
        >
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
            style={{ backgroundColor: "#EDF0F5", color: "#374151" }}
          >
            <Upload size={9} />
            Upload
          </button>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null); if (ref.current) ref.current.value = "" }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
              style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
            >
              <X size={9} />
              Hapus
            </button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
    </div>
  )
}

export function SettingsForm({ initial }: { initial: OrgSettingsForm }) {
  const [form, setForm] = useState<OrgSettingsForm>(initial)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function set(key: keyof OrgSettingsForm, value: string | null) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (PNG, JPG, SVG)")
      return
    }
    if (file.size > 500 * 1024) {
      toast.error("Ukuran logo maks. 500 KB")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => { set("logoBase64", ev.target?.result as string) }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")
      toast.success("Pengaturan berhasil disimpan")
    } catch {
      toast.error("Terjadi kesalahan, coba lagi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Identitas Lembaga */}
      <div className="card p-5">
        <SectionHeader icon={Building2} title="Identitas Lembaga" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nama Yayasan">
            <Input value={form.yayasanName} onChange={(v) => set("yayasanName", v)} placeholder="YAYASAN AL FAKHIR" />
          </Field>
          <Field label="Nama Sekolah">
            <Input value={form.schoolName} onChange={(v) => set("schoolName", v)} placeholder="SMP AL FAKHIR JAKARTA SELATAN" />
          </Field>
          <Field label="Alamat">
            <Input value={form.address} onChange={(v) => set("address", v)} placeholder="Jl. Ciledug Raya, Jakarta Selatan" />
          </Field>
          <Field label="Nomor Telepon">
            <Input value={form.phone} onChange={(v) => set("phone", v)} placeholder="(021) XXXX-XXXX" />
          </Field>
          <Field label="Kota (untuk tanda tangan)">
            <Input value={form.city} onChange={(v) => set("city", v)} placeholder="Jakarta" />
          </Field>
        </div>
      </div>

      {/* Periode Penilaian */}
      <div className="card p-5">
        <SectionHeader icon={Calendar} title="Periode Penilaian" />
        <div className="max-w-md">
          <Field label="Label Periode">
            <Input value={form.periodLabel} onChange={(v) => set("periodLabel", v)} placeholder="Semester Ganjil 2025/2026" />
          </Field>
          <p className="mt-2 text-xs" style={{ color: "#94A3B8" }}>
            Ditampilkan pada kop surat dan identitas laporan PDF.
          </p>
        </div>
      </div>

      {/* Pejabat Penandatangan */}
      <div className="card p-5">
        <SectionHeader icon={UserCog} title="Pejabat Penandatangan" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          {/* Signer 1 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#1E3A5F" }}>Penandatangan 1</p>
            <Field label="Nama">
              <Input value={form.kepalaSekolah} onChange={(v) => set("kepalaSekolah", v)} placeholder="Deny Rahmat, S.Sos.I" />
            </Field>
            <Field label="Jabatan">
              <Input value={form.kepalaTitle} onChange={(v) => set("kepalaTitle", v)} placeholder="Kepala SMP Islam Modern Al Fakhir" />
            </Field>
            <SignatureUpload
              label="Tanda Tangan (PNG, maks. 300 KB)"
              value={form.kepalaSignatureBase64}
              onChange={(v) => set("kepalaSignatureBase64", v)}
            />
          </div>
          {/* Signer 2 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#1E3A5F" }}>Penandatangan 2</p>
            <Field label="Nama">
              <Input value={form.signer2Name} onChange={(v) => set("signer2Name", v)} placeholder="Anggraini, A.Md" />
            </Field>
            <Field label="Jabatan">
              <Input value={form.signer2Title} onChange={(v) => set("signer2Title", v)} placeholder="Deputi Litbang & SDM Al Fakhir" />
            </Field>
            <SignatureUpload
              label="Tanda Tangan (PNG, maks. 300 KB)"
              value={form.signer2SignatureBase64}
              onChange={(v) => set("signer2SignatureBase64", v)}
            />
          </div>
          {/* Signer 3 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#1E3A5F" }}>Penandatangan 3</p>
            <Field label="Nama">
              <Input value={form.ketuaName} onChange={(v) => set("ketuaName", v)} placeholder="Deni Irawan, M.Pd" />
            </Field>
            <Field label="Jabatan">
              <Input value={form.ketuaTitle} onChange={(v) => set("ketuaTitle", v)} placeholder="Owner & Founder Al Fakhir" />
            </Field>
            <SignatureUpload
              label="Tanda Tangan (PNG, maks. 300 KB)"
              value={form.ketuaSignatureBase64}
              onChange={(v) => set("ketuaSignatureBase64", v)}
            />
          </div>
        </div>
        <p className="mt-4 text-xs" style={{ color: "#94A3B8" }}>
          Gambar tanda tangan akan muncul di atas garis tanda tangan pada laporan PDF. Gunakan PNG dengan latar belakang putih atau transparan.
        </p>
      </div>

      {/* Logo Lembaga */}
      <div className="card p-5">
        <SectionHeader icon={ImageIcon} title="Logo Lembaga" />
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div
            className="w-28 h-28 rounded-lg flex items-center justify-center shrink-0"
            style={{ border: "2px dashed #DDE3EC", backgroundColor: "#F8FAFC" }}
          >
            {form.logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoBase64} alt="Logo" className="w-full h-full object-contain rounded-lg p-1" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImageIcon size={22} style={{ color: "#CBD5E1" }} />
                <span className="text-[10px] text-center" style={{ color: "#94A3B8" }}>Belum ada logo</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: "#1E3A5F" }}>
              Upload logo lembaga (PNG, JPG, SVG) · Maks. 500 KB
            </p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Logo akan ditampilkan di sisi kiri kop surat pada laporan PDF.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: "#1E3A5F" }}
              >
                <Upload size={14} />
                Pilih Gambar
              </button>
              {form.logoBase64 && (
                <button
                  type="button"
                  onClick={() => { set("logoBase64", null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                >
                  <X size={13} />
                  Hapus
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60 text-white"
          style={{ backgroundColor: "#1E3A5F", boxShadow: "0 2px 8px rgba(15,37,64,0.22)" }}
        >
          <Save size={15} />
          {loading ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>
    </div>
  )
}
