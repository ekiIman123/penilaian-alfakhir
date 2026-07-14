"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Pencil, Trash2, Plus, Check, X,
  GraduationCap, UserCheck, UserPlus, Users, User, Briefcase, Search,
  ChevronLeft, ChevronRight,
} from "lucide-react"

interface Person {
  id: string
  name: string
  role?: string
  evaluationCount: number
}

interface Props {
  people: Person[]
  type: "guru" | "staff" | "penilai"
}

const PAGE_SIZES = [10, 25, 50]

export function ManageList({ people, type }: Props) {
  const router = useRouter()
  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)

  const [choiceOpen, setChoiceOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)

  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const [mounted, setMounted] = useState(false)

  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const bulkRef = useRef<HTMLTextAreaElement>(null)

  const apiBase = type === "penilai" ? "/api/evaluators" : "/api/teachers"
  const roleForType = type === "guru" ? "guru" : type === "staff" ? "staff" : undefined
  const label = type === "guru" ? "Guru" : type === "staff" ? "Staf" : "Penilai"
  const Icon = type === "guru" ? GraduationCap : type === "staff" ? Briefcase : User

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

  // Reset page when search changes
  useEffect(() => { setPage(1) }, [search, pageSize])

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
        body: JSON.stringify({ name: inputValue.trim(), role: roleForType }),
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
          body: JSON.stringify({ name, role: roleForType }),
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
        body: JSON.stringify({ name: inputValue.trim(), role: roleForType }),
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

  // Filtering + pagination
  const filtered = search.trim()
    ? people.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : people

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const pageRows = filtered.slice(startIdx, startIdx + pageSize)

  const showStart = filtered.length === 0 ? 0 : startIdx + 1
  const showEnd = Math.min(startIdx + pageSize, filtered.length)

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

      {/* Forms above the table (outside card content area, inside card wrapper) */}
      {addingNew && (
        <div
          className="animate-in flex flex-col gap-2 p-3 mx-5 mt-4 rounded-lg"
          style={{
            backgroundColor: "#F8FAFC",
            border: "1px solid #DDE3EC",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "#1E3A5F" }}>
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

      {bulkMode && (
        <div
          className="animate-in flex flex-col gap-2 p-3 mx-5 mt-4 rounded-lg"
          style={{
            backgroundColor: "#F8FAFC",
            border: "1px solid #DDE3EC",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium" style={{ color: "#1E3A5F" }}>
              Tambah banyak {label.toLowerCase()} sekaligus
            </p>
            {bulkLines.length > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(196,151,42,0.12)", color: "#C4972A" }}
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

      {/* Toolbar: search + add button */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cari ${label.toLowerCase()}...`}
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-sm outline-none transition-colors"
            style={{
              border: "1px solid #DDE3EC",
              backgroundColor: "#F8FAFC",
              color: "#111827",
            }}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={openChoice}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
        >
          <Plus size={13} />
          Tambah
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#F1F4F8", borderBottom: "2px solid #DDE3EC" }}>
              <th
                className="text-left px-5 py-2.5"
                style={{ width: "3rem", color: "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                #
              </th>
              <th
                className="text-left px-3 py-2.5"
                style={{ color: "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Nama
              </th>
              <th
                className="text-center px-3 py-2.5"
                style={{ width: "9rem", color: "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Penilaian
              </th>
              <th
                className="text-right px-5 py-2.5"
                style={{ width: "6rem", color: "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-14">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#EDF0F5" }}
                    >
                      <Icon size={22} style={{ color: "#94A3B8" }} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      {search.trim()
                        ? "Tidak ada hasil pencarian"
                        : `Belum ada data ${label.toLowerCase()}`}
                    </p>
                    {!search.trim() && (
                      <button
                        onClick={openChoice}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                        style={{ backgroundColor: "#1E3A5F" }}
                      >
                        <Plus size={14} />
                        Tambah {label}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((person, idx) => {
                const isEditing = editingId === person.id
                const rank = startIdx + idx + 1

                if (isEditing) {
                  return (
                    <tr key={person.id} style={{ backgroundColor: "#F0F4F9", borderBottom: "1px solid #EDF0F5" }}>
                      <td className="px-5 py-2.5">
                        <span className="text-xs tabular-nums" style={{ color: "#9CA3AF" }}>{rank}</span>
                      </td>
                      <td colSpan={3} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            ref={editInputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEdit(person.id)
                              if (e.key === "Escape") cancelEdit()
                            }}
                            placeholder="Masukkan nama lengkap..."
                            className="flex-1 px-2.5 py-1.5 rounded-md text-sm border outline-none"
                            style={{
                              borderColor: "#DDE3EC",
                              backgroundColor: "#FFFFFF",
                              color: "#1A2233",
                            }}
                          />
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
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={person.id}
                    className="hover:bg-slate-100/60 transition-colors"
                    style={{ borderBottom: "1px solid #EDF0F5" }}
                  >
                    <td className="px-5 py-3">
                      <span className="text-xs tabular-nums" style={{ color: "#9CA3AF" }}>{rank}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-sm" style={{ color: "#111827" }}>{person.name}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {person.evaluationCount > 0 ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: "#BFDBFE", color: "#1E3A8A" }}
                        >
                          {person.evaluationCount}
                        </span>
                      ) : (
                        <span style={{ color: "#6B7280" }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(person)}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                          style={{ color: "#64748B" }}
                          title="Edit"
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(30,58,95,0.07)")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                          }
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(person)}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                          style={{ color: "#EF4444" }}
                          title="Hapus"
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.08)")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div
        className="flex items-center justify-between px-5 py-3 gap-4 flex-wrap"
        style={{ borderTop: "1px solid #EDF0F5" }}
      >
        {/* Left: info text */}
        <span className="text-xs" style={{ color: "#6B7280" }}>
          {filtered.length === 0
            ? "Tidak ada data"
            : `Menampilkan ${showStart}–${showEnd} dari ${filtered.length} data`}
          {search.trim() && filtered.length < people.length && ` (filter dari ${people.length})`}
        </span>

        {/* Right: page size + navigation */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#6B7280" }}>Tampil</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-xs px-2 py-1 rounded-md outline-none"
            style={{
              border: "1px solid #DDE3EC",
              backgroundColor: "#F8FAFC",
              color: "#374151",
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-xs" style={{ color: "#6B7280" }}>baris</span>

          {totalPages > 1 && (
            <>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ border: "1px solid #DDE3EC", backgroundColor: "#F8FAFC", color: "#374151" }}
              >
                <ChevronLeft size={13} />
              </button>

              <span
                className="min-w-[1.75rem] h-7 flex items-center justify-center rounded-md text-xs font-semibold px-2"
                style={{ backgroundColor: "#0F2540", color: "#FFFFFF" }}
              >
                {safePage}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ border: "1px solid #DDE3EC", backgroundColor: "#F8FAFC", color: "#374151" }}
              >
                <ChevronRight size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
