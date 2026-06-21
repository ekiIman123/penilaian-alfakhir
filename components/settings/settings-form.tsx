"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Save, Upload, X, Building2, Calendar, UserCog, ImageIcon } from "lucide-react"

interface OrgSettingsForm {
  yayasanName: string
  schoolName: string
  address: string
  phone: string
  city: string
  periodLabel: string
  kepalaSekolah: string
  ketuaName: string
  ketuaTitle: string
  logoBase64: string | null
}

const FIELD_STYLE = {
  borderColor: "rgba(196,151,42,0.35)",
  backgroundColor: "#FFFFFF",
  color: "#1C1917",
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4"
      style={{
        background: "linear-gradient(135deg, rgba(44,26,8,0.06) 0%, rgba(196,151,42,0.08) 100%)",
        border: "1px solid rgba(196,151,42,0.15)",
      }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(196,151,42,0.12)" }}>
        <Icon size={15} style={{ color: "#C4972A" }} />
      </div>
      <span className="font-bold text-sm" style={{ color: "#2C1A08" }}>{title}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: "#5C3D11" }}>{label}</label>
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
    reader.onload = (ev) => {
      set("logoBase64", ev.target?.result as string)
    }
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
          <p className="mt-2 text-xs" style={{ color: "#9CA3AF" }}>
            Ditampilkan pada kop surat dan identitas laporan PDF.
          </p>
        </div>
      </div>

      {/* Pejabat Penandatangan */}
      <div className="card p-5">
        <SectionHeader icon={UserCog} title="Pejabat Penandatangan" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Nama Kepala Sekolah">
            <Input value={form.kepalaSekolah} onChange={(v) => set("kepalaSekolah", v)} placeholder="Nama lengkap..." />
          </Field>
          <Field label="Nama Ketua">
            <Input value={form.ketuaName} onChange={(v) => set("ketuaName", v)} placeholder="Nama lengkap..." />
          </Field>
          <Field label="Jabatan Ketua">
            <Input value={form.ketuaTitle} onChange={(v) => set("ketuaTitle", v)} placeholder="Ketua Balitbang SDM" />
          </Field>
        </div>
        <p className="mt-3 text-xs" style={{ color: "#9CA3AF" }}>
          Ketiga pihak ini akan muncul pada bagian tanda tangan di laporan PDF.
        </p>
      </div>

      {/* Logo Lembaga */}
      <div className="card p-5">
        <SectionHeader icon={ImageIcon} title="Logo Lembaga" />
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Preview */}
          <div
            className="w-28 h-28 rounded-xl flex items-center justify-center shrink-0"
            style={{ border: "2px dashed rgba(196,151,42,0.35)", backgroundColor: "rgba(196,151,42,0.04)" }}
          >
            {form.logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoBase64} alt="Logo" className="w-full h-full object-contain rounded-xl p-1" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImageIcon size={24} style={{ color: "rgba(196,151,42,0.4)" }} />
                <span className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>Belum ada logo</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: "#5C3D11" }}>
              Upload logo lembaga (PNG, JPG, SVG) · Maks. 500 KB
            </p>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>
              Logo akan ditampilkan di sisi kiri kop surat pada laporan PDF.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                  color: "#1C1409",
                  boxShadow: "0 2px 6px rgba(196,151,42,0.35)",
                }}
              >
                <Upload size={14} />
                Pilih Gambar
              </button>
              {form.logoBase64 && (
                <button
                  type="button"
                  onClick={() => {
                    set("logoBase64", null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                >
                  <X size={13} />
                  Hapus
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #2C1A08 0%, #5C3D11 100%)",
            color: "#C4972A",
            boxShadow: "0 2px 10px rgba(44,26,8,0.35)",
          }}
        >
          <Save size={15} />
          {loading ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>
    </div>
  )
}
