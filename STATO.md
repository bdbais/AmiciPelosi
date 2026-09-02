# Dove siamo

Aggiornato il 2 settembre 2026. Serve a chi riprende in mano il progetto — una
persona o un assistente — per sapere cosa c'è, cosa funziona e cosa manca,
senza rileggersi tutta la storia dei commit.

## Cos'è

Un'app per far tornare a casa un animale perduto e per trovarne una a chi non
ce l'ha. Il meccanismo è: **un annuncio con una posizione, un avviso a chi sta
lì vicino, e una segnalazione con foto e coordinate da parte di chi passa di
là**. Tutto il resto gira attorno a questo.

Regole non negoziabili, scritte in più punti dell'app: nelle foto solo
l'animale, mai persone; e **qui non si scambia denaro**, per nessun motivo.

## Cosa è vivo adesso

- **https://amicipelosi.bais.info** — pubblicato su Cloudflare Workers, con D1
  (database), KV (foto) e dominio agganciato. Database **vuoto**: niente
  annunci d'esempio.
- **Il canale delle versioni**: ramo `releases` di questo repository, con un
  indirizzo che non cambia mai —
  `https://github.com/bdbais/AmiciPelosi/raw/releases/AmiciPelosi.apk`.
  Contiene ancora **la demo**, non l'app vera.
- **La demo** (`demo/index.html` + `android-demo/`): le schermate dentro l'APK,
  funziona senza rete, parla venti lingue. Serve a far vedere com'è fatta.

## Cosa manca

1. **L'app vera non è ancora nel canale.** Si costruisce da `android/` (vedi
   `COME-SI-COSTRUISCE.md`), poi si pubblica con `scripts/publish-release.sh`.
   Finché non si fa, chi inquadra il codice sulla homepage scarica la demo — e
   la pagina lo dichiara.
2. **Le notifiche push non sono mai state provate su un telefono vero.** La
   cifratura e la firma VAPID hanno le loro prove automatiche (`npm test`), ma
   il giro completo — telefono in zona, annuncio pubblicato, telefono che suona
   — non l'ha ancora fatto nessuno. È la verifica che vale più di tutte.
3. **L'inserimento in blocco per gli enti** esiste nel modello dati e nella
   demo, ma non nelle schermate dell'app.
4. **L'app parla solo italiano.** Le venti lingue vivono solo nella demo.
5. **Nei termini d'uso manca il titolare del trattamento** e il paese dei
   server. Va scritto prima di aprire a persone che non conosciamo.
6. **Gli indirizzi delle associazioni nazionali** in `src/lib/guidance.ts` sono
   reali ma vanno riconfermati prima di ogni rilascio: un link morto dentro una
   guida che qualcuno legge di fretta è peggio di nessun link.
7. **I dialetti della demo** (veneto, siciliano, napoletano, sardo, pugliese,
   lucano) sono resi con cura ma andrebbero riletti da chi li parla in casa.

## Le cose da sapere prima di toccare

- **La chiave di firma sta nel repository**, in `android-demo/signing/`. Android
  accetta un aggiornamento solo se firmato con la stessa chiave di quello
  installato: perderla vuol dire costringere tutti a disinstallare a mano. È
  una chiave di demo con password nota, non una chiave di pubblicazione: quando
  si andrà sul serio ne serve una custodita altrove, e va cambiata anche
  `ANDROID_CERT_FINGERPRINT` in `wrangler.jsonc`.
- **Le migrazioni hanno due lettori**: wrangler legge la cartella `migrations/`,
  il migratore di sviluppo si fida di `migrations/meta/_journal.json`. Una
  migrazione nuova va aggiunta a entrambi, altrimenti funziona in produzione e
  non in locale (o viceversa).
- **Non lanciare `npm audit fix --force`**: retrocede drizzle-kit di due anni e
  porta Next dalla 15 alla 16. Il perché è spiegato in fondo al README.
- **Le foto degli animali di casa non passano dalla via pubblica delle
  immagini**: hanno una rotta loro che ricontrolla chi guarda a ogni richiesta.
  Se un giorno si unificano le due, si apre un buco.

## Cosa serve per costruire

- **Il sito**: Node 20.6+, `npm ci`, `npm run dev`. Per pubblicare servono un
  token Cloudflare e l'account id (i permessi minimi sono in `.env.example`).
- **L'app**: SDK Android e Java 17+. Gradle no, c'è il wrapper.

## Una nota sull'ambiente

Buona parte di questo progetto è nata in una sessione remota, in un contenitore
con una lista di domini consentiti: GitHub, npm e Maven Central aperti, i server
di Google no. Per questo la demo si costruisce con una catena montata a mano
(`scripts/build-demo-apk.sh`) invece che con Gradle, e per questo l'app vera lì
non si poteva compilare.

Su una macchina normale niente di tutto ciò serve: `./gradlew assembleRelease` e
basta. Lo script della demo resta perché funziona e non chiede l'SDK, ma non è
la strada obbligata.
