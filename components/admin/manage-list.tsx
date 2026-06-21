"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil, Trash2, Plus, Check, X, GraduationCap, UserCheck, UserPlus, Users } from "lucide-react"

interface Person {
  id: string
  name: string
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
  const [loading, setLoading] = useState(false)

  // Choice modal
  const [choiceOpen, setChoiceOpen] = useState(false)

  // Bulk add
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)

  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const bulkRef = useRef<HTMLTextAreaElement>(null)

  const apiBase = type === "guru" ? "/api/teachers" : "/api/evaluators"
  const label = type === "guru" ? "Guru" : "Penilai"
  const Icon = type === "guru" ? GraduationCap : UserCheck

  useEffect(() => {
    if (addingNew && addInputRef.current) addInputRef.current.focus()
  }, [addingNew])

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  useEffect(() => {
    if (bulkMode && bulkRef.current) bulkRef.current.focus()
  }, [bulkMode])

  function openChoice() {
    setChoiceOpen(true)
  }

  function chooseSingle() {
    setChoiceOpen(false)
    startAdd()
  }

  function chooseBulk() {
    setChoiceOpen(false)
    setBulkMode(true)
    setBulkText("")
    setAddingNew(false)
    setEditingId(null)
  }

  function cancelBulk() {
    setBulkMode(false)
    setBulkText("")
  }

  const bulkLines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean)

  async function handleAdd() {
    if (!inputValue.trim()) return
    setLoading(true)
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputValue.trim() }),
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
          body: JSON.stringify({ name }),
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
        body: JSON.stringify({ name: inputValue.trim() }),
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
    const confirmed = window.confirm(
      `Hapus ${person.name}? Semua penilaian terkait akan ikut terhapus.`
    )
    if (!confirmed) return
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
    }
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setInputValue(person.name)
    setAddingNew(false)
    setBulkMode(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setInputValue("")
  }

  function startAdd() {
    setAddingNew(true)
    setInputValue("")
    setEditingId(null)
    setBulkMode(false)
  }

  function cancelAdd() {
    setAddingNew(false)
    setInputValue("")
  }

  return (
    <>
      {/* ── Choice modal ── */}
      {choiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setChoiceOpen(false)}
        >
          <div
            className="rounded-2xl p-6 flex flex-col gap-4 mx-4"
            style={{
              width: 320,
              backgroundColor: "#FFFFFF",
              boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="font-black text-base" style={{ color: "#2C1A08" }}>
                Tambah {label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#78716C" }}>
                Pilih mode penambahan data
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={chooseSingle}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors"
                style={{
                  backgroundColor: "rgba(196,151,42,0.07)",
                  border: "1px solid rgba(196,151,42,0.22)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(196,151,42,0.15)" }}
                >
                  <UserPlus size={16} style={{ color: "#C4972A" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#2C1A08" }}>Satu Data</p>
                  <p className="text-xs" style={{ color: "#78716C" }}>
                    Input satu {label.toLowerCase()} dengan form
                  </p>
                </div>
              </button>

              <button
                onClick={chooseBulk}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors"
                style={{
                  backgroundColor: "rgba(196,151,42,0.07)",
                  border: "1px solid rgba(196,151,42,0.22)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(196,151,42,0.15)" }}
                >
                  <Users size={16} style={{ color: "#C4972A" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#2C1A08" }}>Banyak Data</p>
                  <p className="text-xs" style={{ color: "#78716C" }}>
                    Input beberapa {label.toLowerCase()} sekaligus
                  </p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setChoiceOpen(false)}
              className="text-xs text-center py-1"
              style={{ color: "#9CA3AF" }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(44,26,8,0.06) 0%, rgba(196,151,42,0.08) 100%)",
            border: "1px solid rgba(196,151,42,0.15)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(196,151,42,0.12)" }}
            >
              <Icon size={16} style={{ color: "#C4972A" }} />
            </div>
            <div>
              <span className="font-bold text-sm" style={{ color: "#2C1A08" }}>
                {type === "guru" ? "Data Guru" : "Data Penilai"}
              </span>
            </div>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(196,151,42,0.15)", color: "#C4972A" }}
            >
              {people.length}
            </span>
          </div>
          <button
            onClick={openChoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{
              background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
              color: "#1C1409",
              boxShadow: "0 2px 6px rgba(196,151,42,0.35)",
            }}
          >
            <Plus size={13} />
            Tambah
          </button>
        </div>

        {/* Single add form */}
        {addingNew && (
          <div
            className="animate-in flex flex-col gap-2 p-3 rounded-xl"
            style={{
              backgroundColor: "rgba(196,151,42,0.06)",
              border: "1px solid rgba(196,151,42,0.25)",
            }}
          >
            <p className="text-xs font-semibold" style={{ color: "#5C3D11" }}>
              Tambah {label} baru
            </p>
            <input
              ref={addInputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
                if (e.key === "Escape") cancelAdd()
              }}
              placeholder="Masukkan nama lengkap..."
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
              style={{
                borderColor: "rgba(196,151,42,0.35)",
                backgroundColor: "#FFFFFF",
                color: "#1C1917",
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={loading || !inputValue.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                  color: "#1C1409",
                }}
              >
                <Check size={13} />
                Simpan
              </button>
              <button
                onClick={cancelAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
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
            className="animate-in flex flex-col gap-2 p-3 rounded-xl"
            style={{
              backgroundColor: "rgba(196,151,42,0.06)",
              border: "1px solid rgba(196,151,42,0.25)",
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: "#5C3D11" }}>
                Tambah banyak {label.toLowerCase()} sekaligus
              </p>
              {bulkLines.length > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(196,151,42,0.15)", color: "#C4972A" }}
                >
                  {bulkLines.length} data
                </span>
              )}
            </div>
            <textarea
              ref={bulkRef}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Nama ${label} 1\nNama ${label} 2\nNama ${label} 3\n...`}
              rows={6}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
              style={{
                borderColor: "rgba(196,151,42,0.35)",
                backgroundColor: "#FFFFFF",
                color: "#1C1917",
                lineHeight: "1.7",
              }}
            />
            <p className="text-[10px]" style={{ color: "#9CA3AF" }}>
              Satu baris = satu data · Baris kosong diabaikan
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkAdd}
                disabled={bulkLoading || bulkLines.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                  color: "#1C1409",
                }}
              >
                <Check size={13} />
                {bulkLoading ? "Menyimpan..." : `Simpan ${bulkLines.length > 0 ? bulkLines.length : ""} Data`}
              </button>
              <button
                onClick={cancelBulk}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
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
            <span className="text-5xl">{type === "guru" ? "👨‍🏫" : "👤"}</span>
            <p className="text-sm font-medium" style={{ color: "#78716C" }}>
              Belum ada data {label.toLowerCase()}
            </p>
            <button
              onClick={openChoice}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                color: "#1C1409",
              }}
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
                className="animate-in flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                style={{
                  backgroundColor: isEditing ? "rgba(196,151,42,0.06)" : "rgba(255,255,255,0.7)",
                  border: isEditing
                    ? "1px solid rgba(196,151,42,0.3)"
                    : "1px solid rgba(231,221,208,0.7)",
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitial(person.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={editInputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(person.id)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        placeholder="Masukkan nama lengkap..."
                        className="w-full px-2.5 py-1.5 rounded-lg text-sm border outline-none"
                        style={{
                          borderColor: "rgba(196,151,42,0.35)",
                          backgroundColor: "#FFFFFF",
                          color: "#1C1917",
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(person.id)}
                          disabled={loading || !inputValue.trim()}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                          style={{
                            background: "linear-gradient(135deg, #C4972A 0%, #E8B84B 100%)",
                            color: "#1C1409",
                          }}
                        >
                          <Check size={11} />
                          Simpan
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                        >
                          <X size={11} />
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-sm truncate" style={{ color: "#1C1917" }}>
                        {person.name}
                      </p>
                      <p className="text-xs" style={{ color: "#78716C" }}>
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: "#78716C" }}
                      title="Edit"
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(92,61,17,0.08)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                      }
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(person)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
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
