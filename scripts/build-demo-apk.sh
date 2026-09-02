#!/usr/bin/env bash
#
# Costruisce l'APK della demo: un contenitore Android che apre demo/index.html
# incluso fra gli asset, quindi funziona anche senza rete, e che sa aggiornarsi
# da solo leggendo il manifesto pubblicato su GitHub.
#
# Non serve l'SDK Android ufficiale: bastano i pacchetti di sistema piu
# android.jar e il compilatore dex, scaricati al primo avvio. Utile dove il
# download dell'SDK di Google non e possibile.
#
#   sudo apt-get install -y aapt apksigner zipalign android-sdk-build-tools
#   ./scripts/build-demo-apk.sh
#
# Si puo forzare la versione senza toccare il manifesto:
#   VERSION_CODE=3 VERSION_NAME=0.3 ./scripts/build-demo-apk.sh
#
# Risultato: build/apk/AmiciPelosi-<versione>.apk

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/android-demo"
OUT="$ROOT/build/apk"
DEPS="$OUT/deps"

# La chiave di firma vive nel repository: Android accetta un aggiornamento solo
# se e firmato con la stessa chiave della versione gia installata. Perderla
# vorrebbe dire costringere tutti a disinstallare e reinstallare a mano.
KEYSTORE="$SRC/signing/amicipelosi-demo.keystore"
# E' la chiave della demo, dichiarata tale in STATO.md, e la sua password non
# e' un segreto: sta qui come valore di riserva perche' lo script deve girare
# con un comando solo. Si puo' comunque passare da fuori con DEMO_KEYPASS.
KEYPASS="${DEMO_KEYPASS:-amicipelosi}"
KEYALIAS="amicipelosi"

ANDROID_JAR_URL="https://raw.githubusercontent.com/Sable/android-platforms/master/android-33/android.jar"
DX_URL="https://repo1.maven.org/maven2/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar"

for tool in aapt2 apksigner zipalign javac keytool java; do
  command -v "$tool" >/dev/null || { echo "Manca $tool"; exit 1; }
done

# Versione: dal manifesto, se non la si forza da fuori.
VERSION_CODE="${VERSION_CODE:-$(sed -n 's/.*android:versionCode="\([^"]*\)".*/\1/p' "$SRC/AndroidManifest.xml" | head -1)}"
VERSION_NAME="${VERSION_NAME:-$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$SRC/AndroidManifest.xml" | head -1)}"
APK="$OUT/AmiciPelosi-$VERSION_NAME.apk"

rm -rf "$OUT/classes" "$OUT/gen"
mkdir -p "$DEPS" "$OUT/classes" "$OUT/gen"

[ -f "$DEPS/android.jar" ] || { echo "Scarico android.jar…"; curl -sL -o "$DEPS/android.jar" "$ANDROID_JAR_URL"; }
[ -f "$DEPS/dx.jar" ]      || { echo "Scarico il compilatore dex…"; curl -sL -o "$DEPS/dx.jar" "$DX_URL"; }

echo "Preparo gli asset…"
rm -rf "$OUT/assets" && mkdir -p "$OUT/assets"
cp "$ROOT/demo/index.html" "$OUT/assets/index.html"

echo "Compilo le risorse…"
aapt2 compile --dir "$SRC/res" -o "$OUT/res.zip"

echo "Collego manifest e risorse (versione $VERSION_NAME, codice $VERSION_CODE)…"
# aapt2 non sovrascrive una versione gia scritta nel manifesto: la sostituiamo
# in una copia, cosi si puo ricostruire una versione vecchia senza toccare i sorgenti.
sed -e "s/android:versionCode=\"[^\"]*\"/android:versionCode=\"$VERSION_CODE\"/" \
    -e "s/android:versionName=\"[^\"]*\"/android:versionName=\"$VERSION_NAME\"/" \
    "$SRC/AndroidManifest.xml" > "$OUT/AndroidManifest.xml"

aapt2 link -o "$OUT/base.apk" \
  -I "$DEPS/android.jar" \
  --manifest "$OUT/AndroidManifest.xml" \
  --java "$OUT/gen" \
  --min-sdk-version 21 --target-sdk-version 33 \
  -A "$OUT/assets" \
  "$OUT/res.zip"

echo "Compilo il codice…"
# dx si ferma davanti alle lambda (invokedynamic): il sorgente resta in stile
# Java 7, ma il bytecode va comunque marcato 8 perche i JDK recenti non
# accettano piu -source 7.
find "$SRC/src" -name '*.java' > "$OUT/sources.txt"
find "$OUT/gen" -name 'R.java' >> "$OUT/sources.txt"
javac -source 8 -target 8 -nowarn \
  -bootclasspath "$DEPS/android.jar" -classpath "$DEPS/android.jar" \
  -d "$OUT/classes" @"$OUT/sources.txt" 2>&1 | grep -v '^Note:' || true

echo "Converto in dex…"
java -cp "$DEPS/dx.jar" com.android.dx.command.Main --dex --output="$OUT/classes.dex" "$OUT/classes" 2>/dev/null

echo "Assemblo…"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT" && zip -q unsigned.apk classes.dex)

if [ ! -f "$KEYSTORE" ]; then
  echo "ATTENZIONE: la chiave di firma non c'e, ne creo una nuova."
  echo "Chi ha gia installato l'app dovra disinstallarla prima di aggiornare."
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -keystore "$KEYSTORE" -alias "$KEYALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KEYPASS" -keypass "$KEYPASS" \
    -dname "CN=Amici Pelosi Demo, O=Amici Pelosi, C=IT" >/dev/null 2>&1
fi

echo "Allineo e firmo…"
zipalign -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KEYPASS" --key-pass "pass:$KEYPASS" \
  --ks-key-alias "$KEYALIAS" --out "$APK" "$OUT/aligned.apk" 2>/dev/null

apksigner verify "$APK" >/dev/null 2>&1 && echo "Firma verificata."
echo "Pronto: $APK"
echo "SHA-256: $(sha256sum "$APK" | cut -d' ' -f1)"
