export const PENILAI_LIST = [
  "Anggraini, A.Md",
  "Deny Rahmat, S.Sos.I",
  "Arifah Hilyati, S.S., M.Pd",
] as const

export const GURU_LIST = [
  "Aulia Safitri, S.Pd",
  "Ariyanto, SE",
  "Alfiyyah Nur Lail, S.Pd",
  "Ahmad Marzuki Nasution",
  "Dedi Setiadi",
  "Lulu Lutfiyah, S.Pd",
  "Mochamad Asroru Pahala, S.Pd",
  "Muhammad Faisal, S. Sos.",
  "Mutiara Indah Pratiwi, S.Pd.I",
  "Nur Faidah Djaelani, S.Pd",
  "Syarifatu Zahro, S.Pd",
  "Thio Pratama, S. Kom",
  "Nurhidayatii, S.Pd",
  "Giar Hermawan, S.Kom",
] as const

export type ScoreOption = { score: 1 | 2 | 3 | 4; text: string }
export type Criterion = { id: string; label: string; options: ScoreOption[] }
export type Section = {
  id: string
  label: string
  icon: string
  color: string
  lightBg: string
  textColor: string
  maxScore: number
  criteria: Criterion[]
}

export const SECTIONS: Section[] = [
  {
    id: "prestasi",
    label: "PRESTASI",
    icon: "🏆",
    color: "#B45309",
    lightBg: "#FEF3C7",
    textColor: "#92400E",
    maxScore: 12,
    criteria: [
      {
        id: "pencapaian_hasil",
        label: "Pencapaian Hasil",
        options: [
          { score: 4, text: "Berhasil menyelesaikan tugas utama dengan tepat dan akurat dan berhasil menyelesaikan tugas tambahan dengan baik" },
          { score: 3, text: "Berhasil menyelesaikan pekerjaan tugas utama dengan tepat dan akurat tetapi tidak dapat menyelesaikan tugas tambahan dengan baik" },
          { score: 2, text: "Hanya berhasil menyelesaikan salah satu tugas utama atau tugas tambahan saja" },
          { score: 1, text: "Tidak berhasil menyelesaikan tugas utama dan tugas tambahan dengan baik" },
        ],
      },
      {
        id: "manajemen_waktu",
        label: "Manajemen Waktu",
        options: [
          { score: 4, text: "Dapat memanfaatkan waktu kerja secara optimal" },
          { score: 3, text: "Dapat memanfaatkan waktu kerja namun belum optimal" },
          { score: 2, text: "Baru berupaya mengerjakan di akhir waktu" },
          { score: 1, text: "Banyak menganggur" },
        ],
      },
      {
        id: "kreativitas",
        label: "Kreativitas",
        options: [
          { score: 4, text: "Selalu berinisiatif memaksimalkan sumberdaya yang ada" },
          { score: 3, text: "Sering berinisiatif memaksimalkan sumberdaya yang ada" },
          { score: 2, text: "Jarang berinisiatif memaksimalkan sumberdaya yang ada" },
          { score: 1, text: "Tidak pernah berinisiatif memaksimalkan sumberdaya yang ada" },
        ],
      },
    ],
  },
  {
    id: "core_values",
    label: "AL FAKHIR'S CORE VALUES",
    icon: "⭐",
    color: "#1D4ED8",
    lightBg: "#EFF6FF",
    textColor: "#1E40AF",
    maxScore: 20,
    criteria: [
      {
        id: "loyalitas",
        label: "Loyalitas",
        options: [
          { score: 4, text: "Selalu bertanggungjawab terhadap pekerjaan, atasan dan organisasi" },
          { score: 3, text: "Sering bertanggungjawab terhadap pekerjaan, atasan dan organisasi" },
          { score: 2, text: "Jarang bertanggungjawab terhadap pekerjaan, atasan, dan organisasi" },
          { score: 1, text: "Tidak pernah bertanggungjawab dengan pekerjaannya, atasan, organisasi" },
        ],
      },
      {
        id: "disiplin",
        label: "Disiplin",
        options: [
          { score: 4, text: "Selalu hadir di sekolah dan tempat kerja tepat waktu serta mengenakan pakaian kerja sesuai peraturan" },
          { score: 3, text: "Sering hadir di sekolah dan tempat kerja tepat waktu serta mengenakan pakaian kerja sesuai peraturan" },
          { score: 2, text: "Jarang hadir di sekolah dan tempat kerja tepat waktu serta mengenakan pakaian kerja sesuai peraturan" },
          { score: 1, text: "Tidak hadir di sekolah dan tempat kerja tepat waktu serta mengenakan pakaian kerja sesuai peraturan" },
        ],
      },
      {
        id: "komitmen",
        label: "Komitmen",
        options: [
          { score: 4, text: "Selalu terlibat dalam berbagai kegiatan yang ditugaskan oleh lembaga" },
          { score: 3, text: "Sering terlibat dalam berbagai kegiatan yang ditugaskan oleh lembaga" },
          { score: 2, text: "Jarang terlibat dalam kegiatan yang ditugaskan oleh lembaga" },
          { score: 1, text: "Baru terlibat dalam kegiatan setelah mendapat teguran dari atasan" },
        ],
      },
      {
        id: "persatuan",
        label: "Persatuan",
        options: [
          { score: 4, text: "Selalu terlibat dalam berbagai kegiatan yang ditugaskan oleh lembaga" },
          { score: 3, text: "Sering terlibat dalam berbagai kegiatan yang ditugaskan oleh lembaga" },
          { score: 2, text: "Jarang terlibat dalam kegiatan yang ditugaskan oleh lembaga" },
          { score: 1, text: "Baru terlibat dalam kegiatan setelah mendapat teguran dari atasan" },
        ],
      },
      {
        id: "kekompakan",
        label: "Kekompakan",
        options: [
          { score: 4, text: "Selalu kompak dalam berbagai kegiatan baik di dalam tugas yang diberikan oleh lembaga maupun di luar tugas lembaga" },
          { score: 3, text: "Sering terlihat kompak dalam berbagai kegiatan baik di dalam tugas yang diberikan oleh lembaga maupun di luar tugas lembaga" },
          { score: 2, text: "Jarang terlihat kompak dalam berbagai kegiatan baik di dalam tugas yang diberikan oleh lembaga maupun di luar tugas lembaga" },
          { score: 1, text: "Baru terlihat kompak dalam berbagai kegiatan setelah mendapat teguran dari atasan" },
        ],
      },
    ],
  },
  {
    id: "potensi",
    label: "POTENSI",
    icon: "💡",
    color: "#15803D",
    lightBg: "#F0FDF4",
    textColor: "#166534",
    maxScore: 24,
    criteria: [
      {
        id: "kemampuan_mengajar",
        label: "Kemampuan Mengajar",
        options: [
          { score: 4, text: "Memiliki kemampuan mengajar yang sangat baik: menguasai materi, metodologi mengajar, penggunaan media pembelajaran, manajemen kelas, dan aplikasi penilaian yang relevan terhadap siswa" },
          { score: 3, text: "Memiliki kemampuan mengajar yang baik: menguasai materi, metodologi mengajar, penggunaan media pembelajaran, manajemen kelas, dan aplikasi penilaian yang relevan terhadap siswa" },
          { score: 2, text: "Memiliki kemampuan mengajar yang cukup baik: menguasai materi, metodologi mengajar, penggunaan media pembelajaran, manajemen kelas, dan aplikasi penilaian yang relevan terhadap siswa" },
          { score: 1, text: "Kurang memiliki kemampuan mengajar: menguasai materi, metodologi mengajar, penggunaan media pembelajaran, manajemen kelas, dan aplikasi penilaian yang relevan terhadap siswa" },
        ],
      },
      {
        id: "administrasi_pengajaran",
        label: "Administrasi Pengajaran",
        options: [
          { score: 4, text: "Selalu mengumpulkan administrasi pengajaran sesuai standar" },
          { score: 3, text: "Sering mengumpulkan administrasi pengajaran dan sesuai standar" },
          { score: 2, text: "Sering mengumpulkan administrasi pengajaran namun kurang sesuai standar" },
          { score: 1, text: "Sering mengumpulkan administrasi pengajaran tetapi tidak sesuai standar" },
        ],
      },
      {
        id: "kemampuan_mentoring",
        label: "Kemampuan Mentoring",
        options: [
          { score: 4, text: "Selalu memberikan motivasi, perhatian, apresiasi dan nasehat kepada siswa" },
          { score: 3, text: "Sering memberikan motivasi, perhatian, apresiasi dan nasehat kepada siswa" },
          { score: 2, text: "Jarang memberikan motivasi, perhatian, apresiasi dan nasehat kepada siswa" },
          { score: 1, text: "Tidak pernah memberikan motivasi, perhatian, apresiasi dan nasehat kepada siswa" },
        ],
      },
      {
        id: "pemecahan_masalah",
        label: "Pemecahan Masalah",
        options: [
          { score: 4, text: "Mampu mengenali dan menyelesaikan masalah dengan tepat" },
          { score: 3, text: "Mampu mengenali masalah tetapi kurang tepat dalam menyelesaikan masalah" },
          { score: 2, text: "Mampu mengenali masalah tetapi tidak mampu menyelesaikan masalah" },
          { score: 1, text: "Tidak mampu mengenali masalah" },
        ],
      },
      {
        id: "pengembangan_profesionalisme",
        label: "Pengembangan Profesionalisme",
        options: [
          { score: 4, text: "Selalu berusaha mengembangkan potensi diri" },
          { score: 3, text: "Sering berusaha mengembangkan potensi diri" },
          { score: 2, text: "Jarang berusaha mengembangkan potensi diri" },
          { score: 1, text: "Tidak berusaha mengembangkan potensi diri" },
        ],
      },
      {
        id: "kemampuan_manajerial",
        label: "Kemampuan Manajerial",
        options: [
          { score: 4, text: "Selalu bekerjasama dengan tim dalam merencanakan dan melaksanakan program sekolah" },
          { score: 3, text: "Sering bekerjasama dengan tim dalam merencanakan dan melaksanakan program sekolah" },
          { score: 2, text: "Jarang bekerjasama dengan tim dalam merencanakan dan melaksanakan program sekolah" },
          { score: 1, text: "Tidak pernah bekerjasama dengan tim dalam merencanakan dan melaksanakan program sekolah" },
        ],
      },
    ],
  },
  {
    id: "value",
    label: "VALUE",
    icon: "💎",
    color: "#6D28D9",
    lightBg: "#F5F3FF",
    textColor: "#5B21B6",
    maxScore: 28,
    criteria: [
      {
        id: "kemampuan_sosialisasi",
        label: "Kemampuan Sosialisasi",
        options: [
          { score: 4, text: "Selalu membina hubungan baik dengan semua rekan kerja, semua divisi dan siswa sesuai dengan ketentuan lembaga" },
          { score: 3, text: "Sering membina hubungan baik dengan semua rekan kerja, semua divisi dan siswa sesuai dengan ketentuan lembaga" },
          { score: 2, text: "Jarang membina hubungan baik dengan semua rekan kerja, semua divisi dan siswa sesuai dengan ketentuan lembaga" },
          { score: 1, text: "Tidak membina hubungan baik dengan semua rekan kerja, semua divisi dan siswa sesuai dengan ketentuan lembaga" },
        ],
      },
      {
        id: "empati",
        label: "Empati",
        options: [
          { score: 4, text: "Selalu bersikap empati terhadap warga sekolah baik sesama guru, siswa, staf, dan karyawan" },
          { score: 3, text: "Sering bersikap empati terhadap warga sekolah baik kepada sesama guru, siswa, staf, karyawan" },
          { score: 2, text: "Jarang bersikap empati terhadap sesama warga sekolah baik terhadap guru, siswa, staf, karyawan" },
          { score: 1, text: "Tidak sama sekali memiliki sikap empati terhadap warga sekolah baik terhadap guru, siswa, staf, dan karyawan" },
        ],
      },
      {
        id: "toleransi",
        label: "Toleransi",
        options: [
          { score: 4, text: "Selalu menjunjung tinggi nilai toleransi terhadap perbedaan pendapat, sudut pandang dan pengalaman" },
          { score: 3, text: "Sering menjunjung tinggi nilai toleransi terhadap perbedaan pendapat, sudut pandang dan pengalaman" },
          { score: 2, text: "Jarang melakukan nilai toleransi terhadap perbedaan pendapat, sudut pandang dan pengalaman" },
          { score: 1, text: "Tidak sama sekali memiliki sifat toleransi terhadap perbedaan pendapat, sudut pandang dan pengalaman" },
        ],
      },
      {
        id: "kejujuran",
        label: "Kejujuran",
        options: [
          { score: 4, text: "Selalu menyampaikan informasi yang benar dan dapat dipercaya" },
          { score: 3, text: "Sering menyampaikan informasi yang benar dan dapat dipercaya" },
          { score: 2, text: "Jarang menyampaikan informasi yang benar dan dapat dipercaya" },
          { score: 1, text: "Pernah menyampaikan informasi yang tidak dapat dipercaya" },
        ],
      },
      {
        id: "tanggung_jawab",
        label: "Tanggung Jawab",
        options: [
          { score: 4, text: "Memiliki tanggung jawab penuh terhadap pekerjaan yang diamanahkan baik sebagai guru, staf, PIC dan lain-lain" },
          { score: 3, text: "Sering bertanggung jawab atas pekerjaan yang diamanahkan baik sebagai guru, staf, PIC dan lain-lain" },
          { score: 2, text: "Jarang bertanggung jawab atas pekerjaan yang diamanahkan baik sebagai guru, staf, PIC, dan lain-lain" },
          { score: 1, text: "Tidak sama sekali bertanggung jawab atas pekerjaan yang diamanahkan baik sebagai guru, staf, PIC, dan lain-lain" },
        ],
      },
      {
        id: "rasa_hormat",
        label: "Rasa Hormat",
        options: [
          { score: 4, text: "Selalu memiliki rasa hormat kepada manajemen dan yayasan atas keputusan yang ditetapkan" },
          { score: 3, text: "Sering memiliki rasa hormat kepada manajemen dan yayasan atas keputusan yang ditetapkan" },
          { score: 2, text: "Jarang memiliki rasa hormat terhadap manajemen dan yayasan atas keputusan yang ditetapkan" },
          { score: 1, text: "Tidak sama sekali memiliki rasa hormat kepada manajemen dan yayasan atas keputusan yang ditetapkan" },
        ],
      },
      {
        id: "sopan_santun",
        label: "Sopan Santun",
        options: [
          { score: 4, text: "Selalu menjaga etika dalam berbicara, bersikap, dan berperilaku" },
          { score: 3, text: "Sering menjaga etika dalam berbicara, bersikap, dan berperilaku" },
          { score: 2, text: "Jarang menjaga etika dalam berbicara, bersikap, dan berperilaku" },
          { score: 1, text: "Tidak menjaga etika dalam berbicara, bersikap, dan berperilaku" },
        ],
      },
    ],
  },
  {
    id: "spiritual",
    label: "SPIRITUAL",
    icon: "🕌",
    color: "#DC2626",
    lightBg: "#FEF2F2",
    textColor: "#991B1B",
    maxScore: 16,
    criteria: [
      {
        id: "sholat_berjamaah",
        label: "Sholat Berjamaah",
        options: [
          { score: 4, text: "Selalu hadir tepat waktu dan membantu memobilisasi dan menertibkan siswa dalam sholat berjamaah" },
          { score: 3, text: "Sering melakukan sholat berjamaah namun tidak membantu memobilisasi dan menertibkan siswa dalam sholat berjamaah" },
          { score: 2, text: "Jarang melakukan sholat berjamaah dan jarang memobilisasi dan menertibkan siswa dalam sholat berjamaah" },
          { score: 1, text: "Tidak sama sekali hadir dalam sholat berjamaah dan tidak memobilisasi juga menertibkan siswa dalam sholat berjamaah" },
        ],
      },
      {
        id: "sholat_dhuha",
        label: "Sholat Sunnah Dhuha",
        options: [
          { score: 4, text: "Selalu hadir dan melaksanakan sholat tepat waktu dan membantu memobilisasi dan menertibkan siswa dalam sholat dhuha" },
          { score: 3, text: "Sering melakukan sholat dhuha namun tidak membantu memobilisasi dan menertibkan siswa dalam sholat dhuha" },
          { score: 2, text: "Jarang melakukan sholat dhuha dan jarang memobilisasi dan menertibkan siswa dalam sholat dhuha" },
          { score: 1, text: "Tidak sama sekali hadir dalam sholat dhuha dan tidak memobilisasi juga menertibkan siswa dalam sholat dhuha" },
        ],
      },
      {
        id: "tutur_kata",
        label: "Tutur Kata dan Tingkah Laku",
        options: [
          { score: 4, text: "Selalu berucap dengan menggunakan kata yang baik dan sopan, serta selalu bertingkah laku baik kepada sesama guru, staf dan karyawan di sekolah" },
          { score: 3, text: "Sering berucap dengan menggunakan kata yang baik dan sopan, serta sering bertingkah laku baik kepada sesama guru, staf dan karyawan di sekolah" },
          { score: 2, text: "Jarang berucap dengan menggunakan kata yang baik dan sopan, serta jarang bertingkah laku baik kepada sesama guru, staf dan karyawan di sekolah" },
          { score: 1, text: "Tidak sama sekali menggunakan kata yang baik dan sopan, serta tidak bertingkah laku baik kepada sesama guru, staf dan karyawan di sekolah" },
        ],
      },
      {
        id: "busana_penampilan",
        label: "Busana dan Penampilan",
        options: [
          { score: 4, text: "Selalu menggunakan seragam sesuai jadwal yang ditentukan manajemen, tidak memperlihatkan bentuk tubuh, tidak berdandan mencolok dan tidak menggunakan perhiasan berlebihan" },
          { score: 3, text: "Sering menggunakan seragam sesuai jadwal yang ditentukan manajemen, pernah berpakaian yang memperlihatkan bentuk tubuh, pernah berdandan mencolok dan pernah menggunakan perhiasan berlebihan" },
          { score: 2, text: "Jarang menggunakan seragam sesuai jadwal yang ditentukan manajemen, beberapa kali berpakaian memperlihatkan bentuk tubuh, berdandan mencolok dan menggunakan perhiasan berlebihan" },
          { score: 1, text: "Tidak pernah menggunakan seragam sesuai jadwal yang ditentukan manajemen, selalu berpakaian yang memperlihatkan bentuk tubuh, berdandan mencolok dan menggunakan perhiasan berlebihan" },
        ],
      },
    ],
  },
]

// Total: 25 criteria × max 4 = 100 points

export function getAllCriteriaIds(): string[] {
  return SECTIONS.flatMap((s) => s.criteria.map((c) => c.id))
}

export function getSectionById(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id)
}

export const EVALUATOR_COLORS = ["#3B82F6", "#F59E0B", "#10B981"] as const

// avg = rata-rata per kriteria dalam skala 1.0–4.0
export function getScoreGrade(avg: number) {
  if (avg >= 3.4) return { label: "Sangat Baik", color: "#15803D", bg: "#DCFCE7" }
  if (avg >= 2.8) return { label: "Baik", color: "#1D4ED8", bg: "#DBEAFE" }
  if (avg >= 2.2) return { label: "Cukup", color: "#B45309", bg: "#FEF3C7" }
  if (avg >= 1.6) return { label: "Kurang", color: "#C2410C", bg: "#FFEDD5" }
  return { label: "Sangat Kurang", color: "#DC2626", bg: "#FEE2E2" }
}
