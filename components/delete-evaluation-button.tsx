"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

interface Props {
  evaluationId: string
  teacherId: string
}

export function DeleteEvaluationButton({ evaluationId, teacherId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Hapus penilaian ini? Tindakan ini tidak dapat dibatalkan.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Penilaian berhasil dihapus")
      router.refresh()
    } catch {
      toast.error("Gagal menghapus penilaian")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={loading}
      className="p-1.5 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500 disabled:opacity-40"
      title="Hapus penilaian">
      <Trash2 size={13} />
    </button>
  )
}
