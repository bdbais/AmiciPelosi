# L'app vera, quella che apre il sito

Questa cartella contiene l'app che gli utenti installeranno davvero: apre
`amicipelosi.pet` dentro il motore di Chrome, quindi restano attive le
notifiche push, il GPS e la fotocamera, e in più si aggiorna da sola come fa
la demo.

Non è la demo. La demo (`../android-demo`) porta le schermate dentro l'APK e
funziona senza rete: serve a far vedere com'è fatta l'app. Questa invece è
inutile finché il sito non è pubblicato.

## Cosa serve

L'SDK Android. Se hai l'emulatore installato, ce l'hai già. Gradle non serve
installarlo: c'è il wrapper nella cartella, e si scarica da sé la versione
giusta la prima volta (una novantina di megabyte, un paio di minuti).

**Serve Java 17 o più recente.** Il plugin Android non parte con versioni più
vecchie, e su molti computer `JAVA_HOME` punta ancora a una Java 8 lasciata lì
da conda o da un'installazione di anni fa. L'errore che si vede è
«Dependency requires at least JVM runtime version 11».

Se hai Android Studio, il JDK giusto è già dentro di lui:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

```bash
export JAVA_HOME=/opt/android-studio/jbr     # su Linux
```

Vale solo per quella finestra: non si tocca niente di sistema.

Se non trova l'SDK, digli dov'è. La via più rapida, sempre per quella sola
finestra:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

```bash
export ANDROID_HOME=$HOME/Android/Sdk     # su Linux
```

In alternativa, in modo che resti, si crea `local.properties` qui dentro — il
file è ignorato da git, perché dove sta l'SDK riguarda quel computer e non il
progetto:

```
sdk.dir=C:\\Users\\tuonome\\AppData\\Local\\Android\\Sdk
```

Oppure, più semplice: apri questa cartella con Android Studio e lascia fare a
lui — trova l'SDK da solo e costruisce dal menu *Build → Build APK(s)*.

## Costruirla

Dalla cartella `android/`:

```
./gradlew assembleRelease
```

Su Windows:

```
.\gradlew.bat assembleRelease
```

L'APK esce in `app/build/outputs/apk/release/app-release.apk`.

Per puntarla a un altro indirizzo — per esempio un'anteprima, o il sito in
locale raggiungibile dall'emulatore:

```
./gradlew assembleRelease -PappUrl=https://qualcos-altro.esempio.it
```

## La firma

Usa la stessa chiave della demo, che sta in `../android-demo/signing/`. Non è
un dettaglio: Android accetta un aggiornamento solo se è firmato con la stessa
chiave di quello già installato, e questa app prende il posto della demo sullo
stesso identificativo (`it.amicipelosi.app`). Con una chiave diversa bisogna
disinstallare prima, e chi ha la demo perderebbe tutto.

Il numero di versione parte da 10 apposta: la demo è arrivata alla 6, e Android
rifiuta di installare una versione più vecchia di quella che c'è.

Quando servirà una chiave vera, di pubblicazione, si passa da fuori:

```
./gradlew assembleRelease -PkeystoreFile=/percorso/della/chiave.jks \
  -PkeystoreAlias=nome -PkeystorePassword=segreto
```

## Perché si apra a tutto schermo

Senza un passaggio in più, l'app mostra la barra dell'indirizzo di Chrome in
cima, e sembra un browser travestito. Per toglierla, il sito deve dichiarare
che quell'app è sua: lo fa `/.well-known/assetlinks.json`, che l'app Next.js
genera già, ma solo se conosce l'impronta del certificato di firma.

Va messa fra le variabili del worker in `wrangler.jsonc`:

```jsonc
"vars": {
  "ANDROID_CERT_FINGERPRINT": "l'impronta SHA-256 del certificato"
}
```

L'impronta della chiave di demo si legge così:

```
keytool -list -v -keystore android-demo/signing/amicipelosi-demo.keystore \
  -storepass amicipelosi | grep SHA256
```

Android controlla quel file la prima volta che l'app parte, e ogni tanto dopo:
se non combacia, l'app funziona lo stesso ma con la barra in cima.

## Provarla sull'emulatore

```
adb install -r app/build/outputs/apk/release/app-release.apk
```

Le due cose che sull'emulatore si provano bene e altrove no:

**La posizione.** Si può fingere di essere ovunque:

```
adb emu geo fix 12.4695 41.8896      # longitudine, poi latitudine: Trastevere
```

È il modo per verificare che gli avvisi di zona scattino davvero — si mette la
posizione a Roma, si pubblica un annuncio lì vicino da un altro account, e si
guarda se il telefono suona.

**Le notifiche push.** Servono un'immagine di sistema con i servizi Google e il
sito pubblicato: le push passano dal browser, non dall'app, quindi senza il
sito vero non c'è niente da provare.
