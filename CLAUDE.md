@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Perintah

```bash
npm run dev      # server pengembangan (Turbopack)
npm run build    # prisma generate + next build
npm run lint     # eslint
npx prisma generate      # setelah mengubah prisma/schema.prisma
npx prisma db push       # sinkronkan skema ke DB (pengembangan saja)
npx tsc --noEmit         # typecheck (prisma/ dikecualikan lewat tsconfig)
```

Tidak ada kerangka pengujian di repositori ini. Verifikasi dilakukan lewat
`npx tsc --noEmit`, `npm run build`, dan menjalankan alurnya di browser.

Perlu `.env.local` berisi `DATABASE_URL` (PostgreSQL). Opsional:
`GROQ_API_KEY` (ringkasan catatan AI), `SESSION_SECRET` (tanda tangan cookie —
**wajib di produksi**), `SUPERADMIN_CODE`, `CRON_SECRET`.

`vercel.json` menjadwalkan `/api/cron/periode` harian: membuka periode saat
jendelanya tiba dan menutup yang lewat tenggat. Penerbitan rapor sengaja tidak
otomatis — itu membekukan angka permanen dan mendahului kalibrasi.

### Migrasi

Repositori ini tidak memakai `prisma/migrations`. Perubahan struktur produksi
dijalankan lewat script idempoten di `prisma/`, berurutan:

```bash
npx tsx prisma/migrate-add-periods.ts            # dimensi periode (wajib duluan)
npx tsx prisma/migrate-identity-and-weights.ts   # akun, penugasan, audit, kode karyawan
npx tsx prisma/migrate-pembatasan-masuk.ts       # tabel percobaan masuk
npx tsx prisma/seed-new-lembaga.ts               # data awal iysa/icgi/iyora
```

## Keamanan — baca sebelum menambah endpoint

Pada 31 Agustus 2026 seluruh data karyawan IYSA dihapus orang luar. Penyebabnya
bukan satu berkas yang lupa dijaga, melainkan pola yang membuat pemeriksaan
akses bersifat opsional. Tiga lapisan berikut ada supaya itu tidak terulang.

**1. Middleware menolak lebih dulu** (`middleware.ts`). Seluruh `/api/*` wajib
membawa cookie sesi yang tanda tangannya sah. Berkas route baru otomatis
terlindungi tanpa penulisnya perlu ingat apa pun. Yang boleh terbuka disebut
satu per satu di `TANPA_SESI` — menambah baris di sana adalah keputusan sadar.

**2. Penjaga per route** (`lib/api-guard.ts`). Middleware hanya tahu "ada sesi
yang sah"; wewenang per peran dan per lembaga butuh basis data, jadi diperiksa
di route. Pilih penjaga sesuai kebutuhan: `jagaLembaga` (cukup sudah masuk),
`jagaPengelola` (supervisor/CEO/PM/manajemen), `jagaPengaturan` (boleh mengubah
anggota dan pengaturan), `jagaPuncak` (manajemen saja), `jagaMasuk` (alur lama).

**3. Pemeriksa otomatis** (`npm run cek:keamanan`). Membaca seluruh `app/api`
dan gagal bila ada handler tanpa pemeriksaan. **Ikut berjalan pada `npm run
build`**, jadi endpoint tanpa penjaga tidak bisa ter-deploy.

Aturan lain yang berlaku:

- **Jangan pernah menulis kredensial di kode.** Git hook `.githooks/pre-commit`
  menolaknya. Pasang sekali: `git config core.hooksPath .githooks`. Kode akses
  dulu tertulis di `prisma/seed-new-lembaga.ts` pada repositori publik — itulah
  yang bocor. Sekarang seed membuat kode acak dan menampilkannya sekali saja.
- **Cookie sesi ditandatangani HMAC** (`lib/session-token.ts`, Web Crypto agar
  bisa diperiksa di Edge maupun Node) dan `httpOnly`. Isinya hanya id; peran
  selalu dibaca ulang dari basis data.
- **Pintu masuk dibatasi** (`lib/rate-limit.ts`): 8 kegagalan per IP dalam 15
  menit, lalu ditahan 15 menit.
- **Tindakan yang mengubah kesepakatan dicatat** (`lib/audit.ts`): penghapusan
  karyawan, perubahan pengaturan, pembukaan kembali periode, penarikan rapor.

## Dua sistem dalam satu basis kode

Aplikasi ini lahir sebagai penilaian guru **SMP Al Fakhir**, lalu diperluas
untuk tiga lembaga IYSA/ICGI/IYORA. Keduanya masih hidup berdampingan:

- **Alur lama** — `app/alfakhir/*`, `app/admin`, `app/form`, `app/teachers`,
  `/api/teachers`, `/api/evaluators`, `/api/reports`. Rubrik `SECTIONS` /
  `STAFF_SECTIONS`, tanpa siklus bulanan, tanpa sesi.
- **Alur lembaga** — `app/[lembaga]/*` (satu pohon rute untuk ketiganya),
  `/api/lembaga/[lembagaSlug]/*`, `/api/periods`, `/api/evaluations/batch`.
  Rubrik `AE_SECTIONS` / `AG_SECTIONS`, siklus bulanan penuh.

Perubahan hampir selalu menyentuh alur lembaga. Jangan hapus alur lama tanpa
diminta, tapi juga jangan menyalin polanya.

## Yang membentuk arsitekturnya

**Periode adalah sumbu utama.** `Evaluation` unik per
`[periodId, evaluatorId, employeeId]`. Setiap query penilaian harus menyertakan
`periodId` — tanpa itu, bulan-bulan tercampur. Ini berlaku juga untuk PDF,
ringkasan AI, dan agregat dashboard.

**Rapor dibekukan, bukan dihitung ulang.** Saat periode jadi `final`,
`lib/period-publish.ts` menyimpan salinan ke `PeriodResult`. Rapor bulan lalu
tidak berubah meski orangnya pindah divisi atau koordinatornya diganti.

**Draf tidak ikut dirata-rata.** Hanya `status: "terkirim"` yang masuk
perhitungan. Draf hanya terlihat oleh penilainya sendiri.

**Tidak mengisi bukan nol.** Penilai yang tidak mengisi dikeluarkan dari
rata-rata, tidak dihitung sebagai nilai terendah. Lihat `rataTertimbang()`.

**Satu orang, banyak jabatan.** `Account` menyatukan beberapa baris `Evaluator`
(Kamal: supervisor IYSA + CEO ICGI; Pak Deni & Bu Anggraini: manajemen di
ketiganya). Semua kode akses lama tetap berlaku dan mengantar ke akun yang sama.

**`getSession(lembaga)` selalu diberi lembaga.** Tanpa argumen ia
mengembalikan jabatan pertama, yang salah untuk pemegang banyak jabatan. Di
route API, ambil dulu entitasnya (periode/karyawan), baru panggil
`getSession(entitas.lembaga)`.

**Penugasan adalah data.** `Assignment` menentukan siapa menilai siapa dan
dengan bobot berapa. Aturan peran di `lib/lembaga-evaluatees.ts` hanya jaring
pengaman ketika seorang penilai belum punya penugasan sama sekali.

**Modul murni vs modul database.** Komponen klien tidak boleh mengimpor modul
yang menyentuh Prisma — Turbopack akan gagal dengan *"does not support external
modules (request: node:module)"*. Pasangan yang sudah dipisah:
`lib/periods.ts` → `lib/period-format.ts`, `lib/progress.ts` →
`lib/reminder-text.ts`. Impor **tipe** saja (`import type`) selalu aman.

## Peta berkas

| Berkas | Isi |
|---|---|
| `lib/rubrics.ts` | Semua rubrik. AE = 5 aspek/15 kriteria/maks 60 (staff); AG = + Leadership & Manajemen Tim, 21 kriteria/maks 84 (pemimpin) |
| `lib/periods.ts` | Siklus periode (butuh DB); status `draf → dibuka → ditutup → final` |
| `lib/period-format.ts` | Label, ambang, jendela pengisian baku (tgl 25–3). Aman untuk klien |
| `lib/weights.ts` | Bobot penilai menurut kedekatan dengan kerja harian; `rataTertimbang()` |
| `lib/eval-rules.ts` | Nilai ekstrem (1, 2, 4) wajib bercatatan; deteksi pola untuk layar cermin |
| `lib/lembaga.ts` | Daftar lembaga, label peran, siapa boleh apa |
| `lib/lembaga-evaluatees.ts` | Siapa menilai siapa (penugasan dulu, aturan peran sebagai cadangan) |
| `lib/overview.ts` | Peta lintas lembaga + baris "perlu perhatian" untuk manajemen |
| `lib/calibration.ts` | Sebaran predikat + cermin kebiasaan tiap penilai |
| `lib/audit.ts` | Jejak tindakan yang mengubah kesepakatan |

## Peran

`staff` · `koordinator` · `supervisor` (IYSA) · `ceo` (ICGI) · `pm` (IYORA) ·
`management` (Pak Deni, Bu Anggraini) · `founder` · `superadmin`

Manajemen mendarat di `/beranda` (peta tiga lembaga), bukan dashboard satu
lembaga — mereka pembaca hasil terbanyak, bukan pengisi form terbanyak.

## Bahasa

Antarmuka, pesan galat, dan komentar kode ditulis dalam **Bahasa Indonesia**.
Kode alur lembaga memakai penamaan Indonesia (`periode`, `penilai`, `bobot`,
`terkirim`); alur lama Al Fakhir memakai penamaan Inggris. Ikuti gaya berkas
yang sedang disunting.
