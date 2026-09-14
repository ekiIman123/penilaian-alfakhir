#!/usr/bin/env bash
# Mencegah kredensial masuk ke repositori.
#
# Kode akses lembaga tertulis apa adanya di prisma/seed-new-lembaga.ts pada
# repositori publik sejak 21 Juni 2026. Itu tidak boleh terulang.
#
# Dipasang sebagai git hook:  git config core.hooksPath .githooks
set -u

# Pola yang tidak boleh ada di berkas yang akan di-commit.
POLA=(
  'accessCode:[[:space:]]*"[A-Za-z0-9-]\{4,\}"'
  'SUPERADMIN_CODE[[:space:]]*=[[:space:]]*"'
  'ACCESS_CODE[[:space:]]*=[[:space:]]*"'
  'SESSION_SECRET[[:space:]]*=[[:space:]]*"[^"]\{8,\}"'
  'postgres\(ql\)\?://[^[:space:]"]*:[^[:space:]"@]*@'
  'sk-[A-Za-z0-9]\{20,\}'
  'gsk_[A-Za-z0-9]\{20,\}'
)

BERKAS=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$BERKAS" ] && exit 0

DITEMUKAN=0
for f in $BERKAS; do
  # Berkas contoh dan dokumentasi insiden boleh menyebut pola ini.
  case "$f" in
    *.example|*.md|scripts/cek-rahasia.sh) continue ;;
  esac
  [ -f "$f" ] || continue
  for p in "${POLA[@]}"; do
    HASIL=$(grep -n "$p" "$f" 2>/dev/null | head -3)
    if [ -n "$HASIL" ]; then
      [ $DITEMUKAN -eq 0 ] && echo "" && echo "✗ Kredensial terdeteksi di berkas yang akan di-commit:" && echo ""
      echo "  $f"
      echo "$HASIL" | sed 's/^/      /'
      DITEMUKAN=1
    fi
  done
done

if [ $DITEMUKAN -eq 1 ]; then
  cat <<'PESAN'

  Kredensial tidak boleh masuk ke repositori — sekali ter-commit, ia tetap ada
  di riwayat git meskipun baris itu dihapus belakangan.

  Pindahkan nilainya ke variabel lingkungan (.env.local, sudah di .gitignore),
  lalu baca lewat process.env.

  Bila ini benar-benar keliru terdeteksi:
      git commit --no-verify

PESAN
  exit 1
fi

exit 0
