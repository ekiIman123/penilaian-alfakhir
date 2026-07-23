"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Lock, Eye, EyeOff, Plus, Pencil, Trash2, X,
  Loader2, Users, ShieldCheck, RefreshCw, KeyRound,
} from "lucide-react"
import { createPortal } from "react-dom"
import { toast } from "sonner"

const ACCESS_CODE = "semogabahagia"

const ROLE_OPTIONS = [
  { value: "staff",        label: "Staf" },
  { value: "koordinator",  label: "Koordinator" },
  { value: "supervisor",   label: "Supervisor" },
  { value: "pm",           label: "Project Manager" },
  { value: "management",   label: "Management" },
  { value: "ceo",          label: "CEO" },
  { value: "founder",      label: "General Manager" },
  { value: "superadmin",   label: "Super Admin" },
]
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]))

interface Employee  { id: string; name: string; role: string; divisi: string | null; createdAt: string }
interface Evaluator { id: string; name: string; role: string; divisi: string | null; accessCode: string | null; createdAt: string }

// ─── Shared primitives ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(15,37,64,0.55)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#E2E8F0" }}>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-blue-400"
const inpStyle = { borderColor: "#DDE3EC" }

function DeleteConfirm({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <Modal title="Konfirmasi Hapus" onClose={onCancel}>
      <p className="text-sm text-gray-600">
        Hapus <strong className="text-gray-800">{name}</strong>?{" "}
        Data penilaian terkait juga akan ikut terhapus.
      </p>
      <div className="flex gap-2 justify-end mt-5">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border text-gray-600"
          style={{ borderColor: "#DDE3EC" }}
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white flex items-center gap-2"
          style={{ backgroundColor: "#DC2626", opacity: loading ? 0.7 : 1 }}
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Hapus
        </button>
      </div>
    </Modal>
  )
}

// ─── Employee Tab ──────────────────────────────────────────────────────────────

function EmployeeTab({ slug }: { slug: string }) {
  const [rows, setRows]       = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [saving, setSaving]   = useState(false)
  const [delLoading, setDelLoading] = useState(false)
  const [form, setForm]       = useState({ name: "", role: "staff", divisi: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lembaga/${slug}/employees`)
      if (res.ok) setRows(await res.json())
    } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { load() }, [load])

  function openAdd()         { setForm({ name: "", role: "staff", divisi: "" }); setAdding(true) }
  function openEdit(e: Employee) { setForm({ name: e.name, role: e.role, divisi: e.divisi ?? "" }); setEditing(e) }
  function closeForm()       { setAdding(false); setEditing(null) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editing
        ? `/api/lembaga/${slug}/employees/${editing.id}`
        : `/api/lembaga/${slug}/employees`
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { toast.error(await res.text()); return }
      toast.success(editing ? "Data karyawan diperbarui" : "Karyawan berhasil ditambahkan")
      closeForm(); load()
    } finally { setSaving(false) }
  }

  async function del() {
    if (!deleting) return
    setDelLoading(true)
    try {
      const res = await fetch(`/api/lembaga/${slug}/employees/${deleting.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Gagal menghapus data"); return }
      toast.success("Karyawan dihapus")
      setDeleting(null); load()
    } finally { setDelLoading(false) }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "#EDF0F5" }}>
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: "#64748B" }} />
          <span className="text-sm font-semibold text-gray-700">
            Karyawan
            <span className="ml-1.5 text-xs font-normal text-gray-400">({rows.length} orang)</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #1E3A5F, #2A4F7A)" }}
          >
            <Plus size={12} /> Tambah
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-14 flex justify-center">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-sm text-gray-400">Belum ada karyawan</div>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["#", "Nama", "Jabatan", "Divisi", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td className="px-4 py-3 text-xs text-gray-400 tabular-nums w-8">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{e.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}>
                      {ROLE_LABEL[e.role] ?? e.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{e.divisi ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 text-right w-20">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleting(e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(adding || editing) && (
        <Modal title={editing ? `Edit — ${editing.name}` : "Tambah Karyawan"} onClose={closeForm}>
          <div className="space-y-4">
            <Field label="Nama Lengkap">
              <input
                className={inp} style={inpStyle}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nama lengkap"
                autoFocus
              />
            </Field>
            <Field label="Jabatan">
              <select
                className={inp} style={inpStyle}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Divisi (opsional)">
              <input
                className={inp} style={inpStyle}
                value={form.divisi}
                onChange={(e) => setForm((f) => ({ ...f, divisi: e.target.value }))}
                placeholder="Contoh: Administrasi"
              />
            </Field>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={closeForm} className="px-4 py-2 text-sm rounded-lg border text-gray-600" style={{ borderColor: "#DDE3EC" }}>
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1E3A5F, #2A4F7A)" }}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editing ? "Simpan Perubahan" : "Tambah Karyawan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <DeleteConfirm
          name={deleting.name}
          onConfirm={del}
          onCancel={() => setDeleting(null)}
          loading={delLoading}
        />
      )}
    </>
  )
}

// ─── Evaluator Tab ─────────────────────────────────────────────────────────────

function EvaluatorTab({ slug }: { slug: string }) {
  const [rows, setRows]         = useState<Evaluator[]>([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [editing, setEditing]   = useState<Evaluator | null>(null)
  const [deleting, setDeleting] = useState<Evaluator | null>(null)
  const [saving, setSaving]     = useState(false)
  const [delLoading, setDelLoading] = useState(false)
  const [showCode, setShowCode] = useState<Record<string, boolean>>({})
  const [form, setForm]         = useState({ name: "", role: "supervisor", divisi: "", accessCode: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lembaga/${slug}/evaluators`)
      if (res.ok) setRows(await res.json())
    } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm({ name: "", role: "supervisor", divisi: "", accessCode: "" }); setAdding(true)
  }
  function openEdit(e: Evaluator) {
    setForm({ name: e.name, role: e.role, divisi: e.divisi ?? "", accessCode: e.accessCode ?? "" }); setEditing(e)
  }
  function closeForm() { setAdding(false); setEditing(null) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editing
        ? `/api/lembaga/${slug}/evaluators/${editing.id}`
        : `/api/lembaga/${slug}/evaluators`
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { toast.error(await res.text()); return }
      toast.success(editing ? "Data penilai diperbarui" : "Penilai berhasil ditambahkan")
      closeForm(); load()
    } finally { setSaving(false) }
  }

  async function del() {
    if (!deleting) return
    setDelLoading(true)
    try {
      const res = await fetch(`/api/lembaga/${slug}/evaluators/${deleting.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Gagal menghapus data"); return }
      toast.success("Penilai dihapus")
      setDeleting(null); load()
    } finally { setDelLoading(false) }
  }

  function toggleShowCode(id: string) {
    setShowCode((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      {/* Toolbar */}
      <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "#EDF0F5" }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: "#64748B" }} />
          <span className="text-sm font-semibold text-gray-700">
            Penilai / Management
            <span className="ml-1.5 text-xs font-normal text-gray-400">({rows.length} orang)</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #C4972A, #E8B84B)", color: "#1C1409" }}
          >
            <Plus size={12} /> Tambah
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-14 flex justify-center">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-sm text-gray-400">Belum ada penilai</div>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                {["#", "Nama", "Jabatan", "Divisi", "Kode Akses", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td className="px-4 py-3 text-xs text-gray-400 tabular-nums w-8">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{e.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                      {ROLE_LABEL[e.role] ?? e.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{e.divisi ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {e.accessCode ? (
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: "#F1F5F9", color: "#475569" }}>
                          {showCode[e.id] ? e.accessCode : "••••••••"}
                        </code>
                        <button
                          onClick={() => toggleShowCode(e.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showCode[e.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right w-20">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleting(e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(adding || editing) && (
        <Modal title={editing ? `Edit — ${editing.name}` : "Tambah Penilai"} onClose={closeForm}>
          <div className="space-y-4">
            <Field label="Nama Lengkap">
              <input
                className={inp} style={inpStyle}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nama lengkap"
                autoFocus
              />
            </Field>
            <Field label="Jabatan">
              <select
                className={inp} style={inpStyle}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Divisi (opsional)">
              <input
                className={inp} style={inpStyle}
                value={form.divisi}
                onChange={(e) => setForm((f) => ({ ...f, divisi: e.target.value }))}
                placeholder="Contoh: SDM"
              />
            </Field>
            <Field label="Kode Akses Login">
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className={inp} style={{ ...inpStyle, paddingLeft: "2rem" }}
                  value={form.accessCode}
                  onChange={(e) => setForm((f) => ({ ...f, accessCode: e.target.value }))}
                  placeholder="Kode untuk login"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Kode ini digunakan untuk masuk ke dashboard penilaian</p>
            </Field>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={closeForm} className="px-4 py-2 text-sm rounded-lg border text-gray-600" style={{ borderColor: "#DDE3EC" }}>
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1E3A5F, #2A4F7A)" }}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editing ? "Simpan Perubahan" : "Tambah Penilai"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <DeleteConfirm
          name={deleting.name}
          onConfirm={del}
          onCancel={() => setDeleting(null)}
          loading={delLoading}
        />
      )}
    </>
  )
}

// ─── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pwd, setPwd]   = useState("")
  const [show, setShow] = useState(false)
  const [err, setErr]   = useState(false)

  function tryUnlock() {
    if (pwd === ACCESS_CODE) { onUnlock() }
    else { setErr(true); setPwd("") }
  }

  return (
    <div className="card p-14 flex flex-col items-center gap-5">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "#F1F4F8" }}
      >
        <Lock size={22} style={{ color: "#64748B" }} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800">Area Terbatas</p>
        <p className="text-sm mt-1 text-gray-500">Masukkan kunci akses untuk mengelola data anggota</p>
      </div>
      <div className="flex gap-2">
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setErr(false) }}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            placeholder="Kunci akses…"
            autoFocus
            className="px-3 py-2.5 text-sm rounded-lg border pr-10 focus:outline-none"
            style={{ borderColor: err ? "#EF4444" : "#DDE3EC", width: 220 }}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={tryUnlock}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white"
          style={{ background: "linear-gradient(135deg, #1E3A5F, #2A4F7A)" }}
        >
          Buka
        </button>
      </div>
      {err && <p className="text-xs text-red-500 -mt-2">Kunci akses salah</p>}
    </div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export function MemberManagement({ lembagaSlug }: { lembagaSlug: string }) {
  const [unlocked, setUnlocked] = useState(false)
  const [subTab, setSubTab]     = useState<"karyawan" | "penilai">("karyawan")

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="card overflow-hidden">
      {/* Sub-tabs */}
      <div className="flex border-b" style={{ borderColor: "#DDE3EC" }}>
        {(["karyawan", "penilai"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="px-5 py-3 text-sm font-semibold flex items-center gap-2 transition-colors"
            style={{
              color: subTab === t ? "#1E3A5F" : "#94A3B8",
              borderBottom: subTab === t ? "2px solid #C4972A" : "2px solid transparent",
            }}
          >
            {t === "karyawan" ? <Users size={13} /> : <ShieldCheck size={13} />}
            {t === "karyawan" ? "Karyawan" : "Penilai / Management"}
          </button>
        ))}
      </div>

      {subTab === "karyawan" && <EmployeeTab slug={lembagaSlug} />}
      {subTab === "penilai"  && <EvaluatorTab slug={lembagaSlug} />}
    </div>
  )
}
