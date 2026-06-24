"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, Check, X, GraduationCap, UserCheck, UserPlus, Users, User } from "lucide-react"

interface Person {
  id: string
  name: string
  role?: string
  evaluationCount: number
}

interface Props {
  people: Person[]
  type: "guru" | "penilai"
}

const AVATAR_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
]

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

export function ManageList({ people, type }: Props) {
  const router = useRouter()
  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [roleValue, setRoleValue] = useState<"guru" | "staff">("guru")
  const [loading, setLoading] = useState(false)

  const [choiceOpen, setChoiceOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)

  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkRole, setBulkRole] = useState<"guru" | "staff">("guru")
  const [bulkLoading, setBulkLoading] = useState(false)

  const [mounted, setMounted] = useState(false)

  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const bulkRef = useRef<HTMLTextAreaElement>(null)

  const apiBase = type === "guru" ? "/api/teachers" : "/api/evaluators"
  const label = type === "guru" ? "Guru" : "Penilai"
  const Icon = type === "guru" ? GraduationCap : UserCheck

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (addingNew && addInputRef.current) addInputRef.current.focus()
  }, [addingNew])

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  useEffect(() => {
    if (bulkMode && bulkRef.current) bulkRef.current.focus()
  }, [bulkMode])

  function openChoice() { setChoiceOpen(true) }
  function chooseSingle() { setChoiceOpen(false); startAdd() }
  function chooseBulk() {
    setChoiceOpen(false)
    setBulkMode(true)
    setBulkText("")
    setAddingNew(false)
    setEditingId(null)
  }
  function cancelBulk() { setBulkMode(false); setBulkText("") }

  const bulkLines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean)

  async function handleAdd() {
    if (!inputValue.trim()) return
    setLoading(true)
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputValue.trim(), role: type === "guru" ? roleValue : undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Gagal menambahkan data")
      } else {
        toast.success(`${label} berhasil ditambahkan`)
        setAddingNew(false)
        setInputValue("")
        router.refresh()
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkAdd() {
    if (bulkLines.length === 0) return
    setBulkLoading(true)
    let success = 0
    let fail = 0
    for (const name of bulkLines) {
      try {
        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role: type === "guru" ? bulkRole : undefined }),
        })
        if (res.ok) success++
        else fail++
      } catch {
        fail++
      }
    }
    setBulkLoading(false)
    setBulkMode(false)
    setBulkText("")
    if (success > 0) toast.success(`${success} ${label} berhasil ditambahkan`)
    if (fail > 0) toast.error(`${fail} data gagal ditambahkan (mungkin nama duplikat)`)
    router.refresh()
  }

  async function handleEdit(id: string) {
    if (!inputValue.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputValue.trim(), role: type === "guru" ? roleValue : undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Gagal mengubah data")
      } else {
        toast.success(`${label} berhasil diubah`)
        setEditingId(null)
        setInputValue("")
        router.refresh()
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(person: Person) {
    try {
      const res = await fetch(`${apiBase}/${person.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Gagal menghapus data")
      } else {
        toast.success(`${person.name} berhasil dihapus`)
        router.refresh()
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan")
    } finally {
      setDeleteTarget(null)
    }
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setInputValue(person.name)
    setRoleValue((person.role === "staff" ? "staff" : "guru") as "guru" | "staff")
    setAddingNew(false)
    setBulkMode(false)
  }

  function cancelEdit() { setEditingId(null); setInputValue("") }

  function startAdd() {
    setAddingNew(true)
    setInputValue("")
    setEditingId(null)
    setBulkMode(false)
  }

  function cancelAdd() { setAddingNew(false); setInputValue("") }

  function RoleToggle({ value, onChange }: { value: "guru" | "staff"; onChange: (v: "guru" | "staff") => void }) {
    return (
      <div className="flex items-center gap-0.5 p-0.5 rounded-md" style={{ backgroundColor: "#E2E8F0" }}>
        {(["guru", "staff"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
            style={
              value === r
                ? { backgroundColor: "#0F2540", color: "#FFFFFF" }
                : { backgroundColor: "transparent", color: "#64748B" }
            }
          >
            {r === "guru" ? "Guru" : "Staf"}
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Choice modal */}
      {mounted && choiceOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.40)" }}
          onClick={() => setChoiceOpen(false)}
        >
          <div
            className="rounded-xl p-6 flex flex-col gap-4 mx-4"
            style={{
              width: 320,
              backgroundColor: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="font-semibold text-base" style={{ color: "#1A2233" }}>
                Tambah {label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                Pilih mode penambahan data
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={chooseSingle}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #DDE3EC",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(196,151,42,0.12)" }}
                >
                  <UserPlus size={15} style={{ color: "#C4972A" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1A2233" }}>Satu Data</p>
                  <p className="text-xs" style={{ color: "#64748B" }}>
                    Input satu {label.toLowerCase()} dengan form
                  </p>
                </div>
              </button>

              <button
                onClick={chooseBulk}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #DDE3EC",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(196,151,42,0.12)" }}
                >
                  <Users size={15} style={{ color: "#C4972A" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1A2233" }}>Banyak Data</p>
                  <p className="text-xs" style={{ color: "#64748B" }}>
                    Input beberapa {label.toLowerCase()} sekaligus
                  </p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setChoiceOpen(false)}
              className="text-xs text-center py-1"
              style={{ color: "#94A3B8" }}
            >
              Batal
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirm modal */}
      {mounted && deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.40)" }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="rounded-xl p-6 flex flex-col gap-4 mx-4"
            style={{
              width: 340,
              backgroundColor: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(239,68,68,0.08)" }}
              >
                <Trash2 size={18} style={{ color: "#EF4444" }} />
              </div>
              <div>
                <p className="font-semibold text-base" style={{ color: "#1A2233" }}>
                  Hapus {label}?
                </p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#64748B" }}>
                  <span className="font-medium" style={{ color: "#1A2233" }}>
                    {deleteTarget.name}
                  </span>{" "}
                  akan dihapus secara permanen.
                  {deleteTarget.evaluationCount > 0 && (
                    <span style={{ color: "#EF4444" }}>
                      {" "}Termasuk {deleteTarget.evaluationCount} penilaian terkait.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "#F1F4F8", color: "#374151" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "#EF4444", color: "#FFFFFF" }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="flex flex-col gap-3">
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{
            backgroundColor: "#F8FAFC",
            border: "1px solid #DDE3EC",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ backgroundColor: "rgba(196,151,42,0.10)" }}
            >
              <Icon size={14} style={{ color: "#C4972A" }} />
            </div>
            <span className="font-medium text-sm" style={{ color: "#1A2233" }}>
              {type === "guru" ? "Data Guru" : "Data Penilai"}
            </span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(196,151,42,0.12)", color: "#C4972A" }}
            >
              {people.length}
            </span>
          </div>
          <button
            onClick={openChoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: "#1E3A5F",
              color: "#FFFFFF",
            }}
          >
            <Plus size={13} />
            Tambah
          </button>
        </div>

        {/* Single add form */}
        {addingNew && (
          <div
            className="animate-in flex flex-col gap-2 p-3 rounded-lg"
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #DDE3EC",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium" style={{ color: "#1E3A5F" }}>
                Tambah {label} baru
              </p>
              {type === "guru" && <RoleToggle value={roleValue} onChange={setRoleValue} />}
            </div>
            <input
              ref={addInputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
                if (e.key === "Escape") cancelAdd()
              }}
              placeholder="Masukkan nama lengkap..."
              className="w-full px-3 py-2 rounded-md text-sm border outline-none transition-colors"
              style={{
                borderColor: "#DDE3EC",
                backgroundColor: "#FFFFFF",
                color: "#1A2233",
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={loading || !inputValue.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
              >
                <Check size={13} />
                Simpan
              </button>
              <button
                onClick={cancelAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ backgroundColor: "#F1F4F8", color: "#64748B" }}
              >
                <X size={13} />
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Bulk add form */}
        {bulkMode && (
          <div
            className="animate-in flex flex-col gap-2 p-3 rounded-lg"
            style={{
              backgroundColor: "#F8FAFC",
              border: "1px solid #DDE3EC",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium" style={{ color: "#1E3A5F" }}>
                Tambah banyak {label.toLowerCase()} sekaligus
              </p>
              {type === "guru" && <RoleToggle value={bulkRole} onChange={setBulkRole} />}
            </div>
            {bulkLines.length > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full self-start"
                style={{ backgroundColor: "rgba(196,151,42,0.12)", color: "#C4972A" }}
              >
                {bulkLines.length} data
              </span>
            )}
            <textarea
              ref={bulkRef}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Nama ${label} 1\nNama ${label} 2\nNama ${label} 3\n...`}
              rows={6}
              className="w-full px-3 py-2 rounded-md text-sm border outline-none resize-none"
              style={{
                borderColor: "#DDE3EC",
                backgroundColor: "#FFFFFF",
                color: "#1A2233",
                lineHeight: "1.7",
              }}
            />
            <p className="text-[10px]" style={{ color: "#94A3B8" }}>
              Satu baris = satu data · Baris kosong diabaikan
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkAdd}
                disabled={bulkLoading || bulkLines.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
              >
                <Check size={13} />
                {bulkLoading ? "Menyimpan..." : `Simpan ${bulkLines.length > 0 ? bulkLines.length : ""} Data`}
              </button>
              <button
                onClick={cancelBulk}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ backgroundColor: "#F1F4F8", color: "#64748B" }}
              >
                <X size={13} />
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {people.length === 0 && !addingNew && !bulkMode && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#EDF0F5" }}
            >
              {type === "guru"
                ? <GraduationCap size={22} style={{ color: "#94A3B8" }} />
                : <User size={22} style={{ color: "#94A3B8" }} />
              }
            </div>
            <p className="text-sm font-medium text-slate-500">
              Belum ada data {label.toLowerCase()}
            </p>
            <button
              onClick={openChoice}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white"
              style={{ backgroundColor: "#1E3A5F" }}
            >
              <Plus size={14} />
              Tambah {label}
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex flex-col gap-1.5">
          {people.map((person, idx) => {
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
            const isEditing = editingId === person.id

            return (
              <div
                key={person.id}
                className="animate-in flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: isEditing ? "#F8FAFC" : "rgba(255,255,255,0.8)",
                  border: isEditing ? "1px solid #DDE3EC" : "1px solid rgba(221,227,236,0.6)",
                  animationDelay: `${idx * 35}ms`,
                }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitial(person.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-1.5">
                      {type === "guru" && (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium" style={{ color: "#1E3A5F" }}>Edit {label}</p>
                          <RoleToggle value={roleValue} onChange={setRoleValue} />
                        </div>
                      )}
                      <input
                        ref={editInputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(person.id)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        placeholder="Masukkan nama lengkap..."
                        className="w-full px-2.5 py-1.5 rounded-md text-sm border outline-none"
                        style={{
                          borderColor: "#DDE3EC",
                          backgroundColor: "#FFFFFF",
                          color: "#1A2233",
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(person.id)}
                          disabled={loading || !inputValue.trim()}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-50"
                          style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
                        >
                          <Check size={11} />
                          Simpan
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                          style={{ backgroundColor: "#F1F4F8", color: "#64748B" }}
                        >
                          <X size={11} />
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: "#1A2233" }}>
                          {person.name}
                        </p>
                        {type === "guru" && (
                          <span
                            className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={
                              person.role === "staff"
                                ? { backgroundColor: "rgba(59,130,246,0.10)", color: "#3B82F6" }
                                : { backgroundColor: "rgba(196,151,42,0.10)", color: "#B8860B" }
                            }
                          >
                            {person.role === "staff" ? "Staf" : "Guru"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "#64748B" }}>
                        {person.evaluationCount > 0
                          ? `${person.evaluationCount} penilaian`
                          : "Belum ada penilaian"}
                      </p>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(person)}
                      className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                      style={{ color: "#64748B" }}
                      title="Edit"
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(30,58,95,0.07)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                      }
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(person)}
                      className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                      style={{ color: "#EF4444" }}
                      title="Hapus"
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.08)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
