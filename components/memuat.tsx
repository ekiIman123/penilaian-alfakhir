/**
 * Kerangka halaman yang muncul seketika saat berpindah menu.
 *
 * Seluruh halaman lembaga dirender di server dan bergantung pada sesi, jadi
 * Next tidak bisa menyiapkannya lebih dulu. Tanpa kerangka ini, mengklik menu
 * membuat layar diam di halaman lama sampai seluruh data tiba — tidak ada
 * tanda apa pun bahwa aplikasi sedang bekerja, dan orang menekan menunya lagi.
 *
 * Kehadiran berkas loading juga membuat Next mau melakukan prefetch sebagian
 * pada rute dinamis: rangka dan tata letaknya diambil lebih dulu saat tautan
 * terlihat di layar, sehingga perpindahan terasa langsung.
 */

function Balok({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md animate-pulse ${className}`}
      style={{ backgroundColor: "rgba(15,37,64,0.09)" }}
    />
  )
}

export function KerangkaHalaman({ baris = 6 }: { baris?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Memuat halaman…</span>

      {/* Judul halaman */}
      <div className="space-y-2.5">
        <Balok className="h-7 w-56" />
        <Balok className="h-4 w-80 max-w-full" />
      </div>

      {/* Bilah periode */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center gap-3"
        style={{ border: "1px solid rgba(15,37,64,0.10)" }}
      >
        <Balok className="h-9 w-44" />
        <Balok className="h-9 w-32" />
        <div className="ml-auto flex gap-2">
          <Balok className="h-9 w-24" />
          <Balok className="h-9 w-24" />
        </div>
      </div>

      {/* Daftar isi */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid rgba(15,37,64,0.10)" }}
      >
        <div
          className="px-4 py-3 flex items-center gap-4"
          style={{ backgroundColor: "rgba(15,37,64,0.04)" }}
        >
          <Balok className="h-4 w-40" />
          <Balok className="h-4 w-24 ml-auto" />
          <Balok className="h-4 w-16" />
        </div>
        {Array.from({ length: baris }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-4 flex items-center gap-4"
            style={{
              borderTop: "1px solid rgba(15,37,64,0.06)",
              // Baris terbawah sedikit lebih pudar — kerangka tidak berpura-pura
              // tahu persis ada berapa baris.
              opacity: 1 - i * (0.5 / Math.max(baris, 1)),
            }}
          >
            <Balok className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Balok className="h-4 w-1/3 min-w-[7rem]" />
              <Balok className="h-3 w-1/5 min-w-[5rem]" />
            </div>
            <Balok className="h-6 w-20 shrink-0 hidden sm:block" />
            <Balok className="h-6 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
