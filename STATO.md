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

Ci sono poi tre cose costruite dopo, che vale la pena conoscere prima di
toccare il codice:

- **La scheda privata del proprio animale** — tre foto (muso e i due fianchi),
  microchip, libretto, diario. Nasce privata e le sue foto hanno una rotta a
  parte che ricontrolla chi guarda a ogni richiesta. Il veterinario riceve la
  sola parte sanitaria, a meno che non sia nominato «di riferimento».
- **La sezione senza vita**, segnata con un punto nero. Serve a far smettere di
  cercare. Niente fotografie — il divieto è sul server, non solo nel modulo —
  non compare in bacheca se non la si chiede, e l'avviso va soltanto a chi ha
  un annuncio di smarrimento aperto lì vicino.
- **La parte gestionale per canili e gattili** — inserimento rapido di molti
  animali di seguito, date di entrata e uscita, permanenza media, esami, e il
  testo già pronto da portare sui social.
- **Il recapito non si legge, si chiede** — nessun numero è pubblico: chi ha
  notizie scrive due righe e chi ha pubblicato decide a chi darlo.

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

In ordine di quanto pesa, non di quanto costa.

### Prima di aprire a persone che non conosciamo

1. **Le notifiche push non sono mai state provate su un telefono vero.** La
   cifratura e la firma VAPID hanno le loro prove automatiche (`npm test`), ma
   il giro completo — telefono in zona, annuncio pubblicato, telefono che suona
   — non l'ha ancora fatto nessuno. È la verifica che vale più di tutte, ed è
   metà del senso del progetto.
2. **Le chiavi VAPID vanno rigenerate.** Quelle usate finora sono passate in
   una conversazione: vanno considerate note. `npm run generate:vapid`, poi
   `wrangler secret put VAPID_PRIVATE_KEY` e la pubblica fra le variabili.
   Chi ha già dato il permesso alle notifiche dovrà ridarlo.
3. **Nei termini d'uso manca il titolare del trattamento** e il paese dei
   server. Finché non c'è, il documento promette trasparenza senza darla.

4. **La chiave con cui è firmata l'app è pubblica, password compresa.** Sta in
   `android-demo/signing/` e la password è scritta in `scripts/build-demo-apk.sh`:
   chiunque può firmare un APK che Android accetta come aggiornamento e che
   `assetlinks.json` riconosce come app del sito. Per la demo va bene. Prima
   dell'app vera serve una chiave nuova custodita fuori dal repository, e va
   cambiata anche `ANDROID_CERT_FINGERPRINT`: chi ha la demo dovrà
   disinstallarla.

### Le due cose chieste e non ancora fatte

5. **Le segnalazioni fra enti, e l'esclusione.** Un canile o un'associazione
   deve poter segnalare una persona, e una persona segnalata va guardata e
   all'occorrenza fermata. Il disegno concordato: solo enti verificati possono
   segnalare, la segnalazione è a categorie e non a testo libero, non è mai
   pubblica, chi è segnalato lo sa e può rispondere, e **il blocco non è mai
   automatico** — il contatore informa chi decide, non decide. Esiste anche il
   verso positivo («adozione andata bene, controllo fatto»), senza il quale
   l'elenco diventa solo una lista nera e verrà usato come arma.
6. **Il contatore delle adozioni ravvicinate.** Chi prende un animale a
   settimana è un segnale, ma la soglia vale per gli account privati e non per
   un gattile, per cui è il mestiere. Va mostrato al momento della risposta a
   una richiesta di contatto, accanto all'età dell'account che già c'è.

### Quello che rende il modello davvero chiuso

7. **La messaggistica interna con pseudonimo.** Oggi il recapito si chiede e lo
   concede chi ha pubblicato, ma quando lo concede passa il numero vero. Con un
   filo interno il numero potrebbe non passare mai. È il pezzo che sposta di
   più il modello dati.
8. **La posizione approssimata in bacheca.** Per «Trovato» e «Stallo» il punto
   esatto è quasi sempre casa di chi pubblica, e per un randagio è una mappa
   per chi vuole fargli del male. In pubblico dovrebbe esserci un cerchio di
   300–500 metri con scostamento casuale, e il punto esatto solo dopo il
   contatto. Per «Smarrito» resta esatto: lì serve.

### Il resto

9. **L'app vera non è ancora nel canale.** Si costruisce da `android/` (vedi
   `COME-SI-COSTRUISCE.md`), poi si pubblica con `scripts/publish-release.sh`.
   Finché non si fa, chi inquadra il codice sulla homepage scarica la demo — e
   la pagina lo dichiara.
10. **Il sito parla solo italiano.** Le venti lingue vivono solo nella demo.
11. **Gli indirizzi delle associazioni nazionali** in `src/lib/guidance.ts` sono
    reali ma vanno riconfermati prima di ogni rilascio: un link morto dentro una
    guida che qualcuno legge di fretta è peggio di nessun link.
12. **I dialetti della demo** (veneto, siciliano, napoletano, sardo, pugliese,
    lucano) sono resi con cura ma andrebbero riletti da chi li parla in casa.
13. **La lettura del libretto** riconosce bene i caratteri stampati e male la
    scrittura a mano. È provata su un libretto finto, non su libretti veri: i
    primi che passano vanno guardati.

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
- **Le migrazioni si scrivono a mano, `npm run db:generate` non va usato.**
  In `migrations/meta/` c'è solo lo snapshot 0000: drizzle-kit confronterebbe
  lo schema di oggi con quello del primo giorno e genererebbe di nuovo tutto
  quello che esiste già. Si scrive il file SQL, lo si registra in
  `_journal.json`, e si aggiorna `src/db/schema.ts` perché resti allineato.
- **Ogni statement di una migrazione va seguito da `--> statement-breakpoint`.**
  Wrangler spezza il file da solo, il migratore locale (better-sqlite3) no: un
  file senza breakpoint applica il primo statement, si segna la migrazione
  come fatta e il resto delle tabelle non nasce mai. È successo con la 0007.
- **Gli avvisi di zona per ritrovati, stalli e adozioni partono solo al
  prossimo annuncio.** Chi ha scelto «al massimo ogni 30 minuti» e riceve un
  annuncio dentro la finestra non lo vede subito: lo vedrà nel riepilogo che
  parte con il primo annuncio pubblicato nella sua zona dopo la scadenza, che
  può essere fra un'ora o fra una settimana. Non c'è un cron che ripesca i
  pendenti. Per gli smarrimenti e le segnalazioni senza vita la finestra non
  vale: partono subito, a tutti.
- **Le foto delle segnalazioni senza vita non esistono**, e il controllo sta
  nella rotta `POST /api/posts`. Se un giorno si generalizza il caricamento
  delle immagini, quel caso va portato dietro.
- **Non lanciare `npm audit fix --force`**: retrocede drizzle-kit di due anni e
  porta Next dalla 15 alla 16. Il perché è spiegato in fondo al README.
- **Le foto degli animali di casa non passano dalla via pubblica delle
  immagini**: hanno una rotta loro che ricontrolla chi guarda a ogni richiesta.
  Se un giorno si unificano le due, si apre un buco.

- **La posizione del dispositivo si usa solo da telefono.** Su un computer il
  browser la stima dall'indirizzo IP e sbaglia di decine di chilometri (una
  persona di Monselice si è vista piazzare in Trentino). Per questo
  `PlacePicker` mostra «Dove sono» solo su mobile, scarta le letture con
  precisione peggiore di 2 km, e ovunque c'è una mappa si scrive un comune o
  un indirizzo. Chi ha salvato la zona nel profilo ha anche «La mia zona», per
  guardare casa quando è altrove.
- **Due servizi esterni gratuiti, con le loro regole.** Nominatim
  (`/api/geocode`, indirizzi in entrambi i versi) e Overpass
  (`/api/luoghi`, veterinari e rifugi da OpenStreetMap). Hanno entrambi un
  freno per IP e uno User-Agent che dice chi siamo: senza, chiudono il
  rubinetto a tutti. Non vanno usati come geocodificatore per altro.
- **Il profilo pubblico (`/persone/[id]`) mostra solo nome, tipo di account,
  anzianità e tre numeri**: annunci pubblicati, annunci a cui ha risposto,
  grazie ricevuti. Il grazie lo dà chi ha pubblicato l'annuncio a chi ha
  segnalato o chiesto il contatto, una volta sola. Niente recapiti, niente
  posizione: è la stessa regola di sempre, e il profilo pubblico è il primo
  posto dove verrà voglia di romperla.

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
