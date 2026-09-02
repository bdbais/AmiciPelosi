# L'app vera, quella che apre il sito

Questa cartella contiene l'app che gli utenti installeranno davvero: apre
`amicipelosi.bais.info` dentro il motore di Chrome, quindi restano attive le
notifiche push, il GPS e la fotocamera, e in più si aggiorna da sola come fa
la demo.

Non è la demo. La demo (`../android-demo`) porta le schermate dentro l'APK e
funziona senza rete: serve a far vedere com'è fatta l'app. Questa invece è
inutile finché il sito non è pubblicato.

## Cosa serve

L'SDK Android e Gradle. Se hai l'emulatore installato, hai già tutto.

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
