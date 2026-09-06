#!/usr/bin/env bash
#
# Pubblica una versione dell'APK nel canale pubblico da cui l'app si aggiorna.
#
# Il canale e un ramo separato del repository, senza sorgenti: dentro ci sono
# solo gli APK e il manifesto latest.json che l'app legge all'avvio.
#
#   ./scripts/publish-release.sh build/apk/AmiciPelosi-0.3.apk
#
# Con piu file, l'ultimo elencato diventa la versione corrente.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$ROOT/build/canale"
BRANCH="releases"
REMOTE="$(git -C "$ROOT" remote get-url origin)"
RAW="https://raw.githubusercontent.com/bdbais/AmiciPelosi/$BRANCH"

[ $# -gt 0 ] || { echo "Uso: $0 <apk> [altri apk…]"; exit 1; }

# Il canale vive in una copia di lavoro tutta sua: cosi non si mescola
# con i sorgenti e il ramo resta pulito.
if [ ! -d "$WORK/.git" ]; then
  rm -rf "$WORK"
  if git clone --quiet --branch "$BRANCH" --single-branch "$REMOTE" "$WORK" 2>/dev/null; then
    echo "Canale gia esistente, aggiorno."
  else
    echo "Creo il canale."
    mkdir -p "$WORK"
    git -C "$WORK" init --quiet --initial-branch "$BRANCH"
    git -C "$WORK" remote add origin "$REMOTE"
  fi
fi

# Nel canale resta solo l'ultima versione: chi arriva deve trovare una cosa
# sola, senza chiedersi quale scaricare. Lo storico e' nei commit del ramo.
rm -rf "$WORK/versions"
mkdir -p "$WORK/versions"

for apk in "$@"; do
  [ -f "$apk" ] || { echo "Non trovo $apk"; exit 1; }

  code=$(aapt2 dump badging "$apk" | sed -n "s/.*versionCode='\([^']*\)'.*/\1/p" | head -1)
  name=$(aapt2 dump badging "$apk" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p" | head -1)
  sha=$(sha256sum "$apk" | cut -d' ' -f1)
  size=$(stat -c%s "$apk")
  cert=$(apksigner verify --print-certs "$apk" | sed -n 's/.*certificate SHA-256 digest: //p' | head -1)
  notes="$ROOT/android-demo/release-notes/$name.json"

  cp "$apk" "$WORK/versions/AmiciPelosi-$name.apk"
  # Un indirizzo che non cambia mai, da dare a chi prova l'app: punta sempre
  # all'ultima versione. Il manifesto invece cita il file con il numero, perche'
  # la sua impronta deve restare quella di un file preciso.
  cp "$apk" "$WORK/AmiciPelosi.apk"

  # Il manifesto che l'app legge: versione, indirizzo, impronta del file.
  # L'impronta serve a scartare un download rovinato o manomesso.
  NOTES_FILE="$notes" VERSION_CODE="$code" VERSION_NAME="$name" SHA="$sha" \
  SIZE="$size" CERT="$cert" URL="$RAW/versions/AmiciPelosi-$name.apk" \
  python3 - > "$WORK/latest.json" <<'PY'
import json, os, datetime
notes = {}
if os.path.exists(os.environ["NOTES_FILE"]):
    notes = json.load(open(os.environ["NOTES_FILE"]))
print(json.dumps({
    "versionCode": int(os.environ["VERSION_CODE"]),
    "versionName": os.environ["VERSION_NAME"],
    "apkUrl": os.environ["URL"],
    "sha256": os.environ["SHA"],
    "sizeBytes": int(os.environ["SIZE"]),
    "signingCertSha256": os.environ["CERT"],
    "minSdk": 21,
    "publishedAt": datetime.date.today().isoformat(),
    "notes": notes,
}, ensure_ascii=False, indent=2))
PY

  echo "Versione $name (codice $code) pronta nel canale."
done

cp "$ROOT/android-demo/CANALE.md" "$WORK/README.md"

git -C "$WORK" add -A
if git -C "$WORK" diff --cached --quiet; then
  echo "Niente da pubblicare."
else
  git -C "$WORK" commit --quiet -m "Pubblica la versione $name"
  for attempt in 1 2 3 4; do
    if git -C "$WORK" push --quiet -u origin "$BRANCH"; then
      echo "Pubblicata: $RAW/latest.json"
      exit 0
    fi
    sleep $((2 ** attempt))
  done
  echo "Non sono riuscito a pubblicare."
  exit 1
fi
