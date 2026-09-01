#!/usr/bin/env bash
#
# Costruisce l'APK della demo: un contenitore Android che apre demo/index.html
# incluso fra gli asset, quindi funziona anche senza rete.
#
# Non serve l'SDK Android ufficiale: bastano i pacchetti di sistema piu
# android.jar e il compilatore dex, scaricati al primo avvio. Utile dove il
# download dell'SDK di Google non e possibile.
#
#   sudo apt-get install -y aapt apksigner zipalign android-sdk-build-tools
#   ./scripts/build-demo-apk.sh
#
# Risultato: build/apk/AmiciPelosi-demo.apk

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/android-demo"
OUT="$ROOT/build/apk"
DEPS="$OUT/deps"

ANDROID_JAR_URL="https://raw.githubusercontent.com/Sable/android-platforms/master/android-33/android.jar"
DX_URL="https://repo1.maven.org/maven2/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar"

for tool in aapt2 apksigner zipalign javac keytool java; do
  command -v "$tool" >/dev/null || { echo "Manca $tool"; exit 1; }
done

mkdir -p "$DEPS" "$OUT/classes" "$OUT/gen"

[ -f "$DEPS/android.jar" ] || { echo "Scarico android.jar…"; curl -sL -o "$DEPS/android.jar" "$ANDROID_JAR_URL"; }
[ -f "$DEPS/dx.jar" ]      || { echo "Scarico il compilatore dex…"; curl -sL -o "$DEPS/dx.jar" "$DX_URL"; }

echo "Preparo gli asset…"
rm -rf "$OUT/assets" && mkdir -p "$OUT/assets"
cp "$ROOT/demo/index.html" "$OUT/assets/index.html"

echo "Compilo le risorse…"
aapt2 compile --dir "$SRC/res" -o "$OUT/res.zip"

echo "Collego manifest e risorse…"
aapt2 link -o "$OUT/base.apk" \
  -I "$DEPS/android.jar" \
  --manifest "$SRC/AndroidManifest.xml" \
  --java "$OUT/gen" \
  --min-sdk-version 21 --target-sdk-version 33 \
  -A "$OUT/assets" \
  "$OUT/res.zip"

echo "Compilo il codice…"
# dx accetta bytecode fino a Java 8.
javac -source 8 -target 8 -nowarn \
  -bootclasspath "$DEPS/android.jar" -classpath "$DEPS/android.jar" \
  -d "$OUT/classes" \
  "$SRC/src/it/amicipelosi/app/MainActivity.java" \
  "$OUT/gen/it/amicipelosi/app/R.java" 2>/dev/null

echo "Converto in dex…"
java -cp "$DEPS/dx.jar" com.android.dx.command.Main --dex --output="$OUT/classes.dex" "$OUT/classes" 2>/dev/null

echo "Assemblo…"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT" && zip -q unsigned.apk classes.dex)

if [ ! -f "$OUT/demo.keystore" ]; then
  echo "Creo la chiave di firma…"
  keytool -genkeypair -keystore "$OUT/demo.keystore" -alias amicipelosi \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass amicipelosi -keypass amicipelosi \
    -dname "CN=Amici Pelosi Demo, O=Amici Pelosi, C=IT" >/dev/null 2>&1
fi

echo "Allineo e firmo…"
zipalign -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
apksigner sign --ks "$OUT/demo.keystore" --ks-pass pass:amicipelosi --key-pass pass:amicipelosi \
  --ks-key-alias amicipelosi --out "$OUT/AmiciPelosi-demo.apk" "$OUT/aligned.apk" 2>/dev/null

apksigner verify "$OUT/AmiciPelosi-demo.apk" >/dev/null 2>&1 && echo "Firma verificata."
echo "Pronto: $OUT/AmiciPelosi-demo.apk"
