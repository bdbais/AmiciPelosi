# 🐾 Amici Pelosi

App per **ritrovare un animale perduto** e **trovare una famiglia a chi non ha
casa**. Chi pubblica un annuncio indica foto, zona e caratteristiche; chi vive
li vicino riceve una notifica sul telefono e puo tenere gli occhi aperti.

## Cosa sa fare

- **Tre tipi di annuncio**: smarrito, ritrovato, in adozione.
- **Foto multiple**, ridimensionate nel browser prima dell'invio (una foto da
  cellulare passa da qualche MB a poche centinaia di KB).
- **Zona sulla mappa**: posizione GPS o punto scelto a mano, con l'indirizzo
  ricavato automaticamente.
- **Caratteristiche dettagliate**: specie, razza, nome, sesso, eta, taglia,
  colore e segni particolari, microchip, collare, sterilizzazione, vaccini,
  compatibilita con bambini e altri animali, piu le note su come avvicinarlo.
- **Vicino a me**: annunci entro il raggio scelto, ordinati per distanza reale.
- **Notifiche di prossimita**: chi ha impostato la sua zona riceve un avviso
  quando compare un annuncio entro il raggio che ha scelto.
- **Segnalazioni di avvistamento** con posizione allegata.
- **Accesso con Google** oppure con email e password.
- **Musica dolce e versi degli animali**, sintetizzati e disattivabili.
- **Ringraziamenti**: ogni gesto - un annuncio, una segnalazione, una chiamata -
  riceve una risposta gentile.
- **App installabile** come PWA e come APK Android.

## Provarla in locale

```bash
npm install
cp .env.example .env          # e cambia AUTH_SECRET
npm run db:migrate            # crea il database SQLite locale
npm run db:seed               # dati di esempio (8 annunci, 3 utenti)
npm run dev                   # http://localhost:3000
```

Utenti di prova: `giulia@example.it`, `marco@example.it`, `sara@example.it` -
password `password123`.

### Notifiche push

```bash
npm run generate:vapid        # genera le chiavi e le stampa
```

Copia le due chiavi nel `.env`. Senza chiavi l'app funziona lo stesso: le
notifiche restano semplicemente spente.

### Accesso con Google

1. Su [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   crea credenziali OAuth di tipo *Applicazione web*.
2. Fra gli URI di reindirizzamento autorizzati aggiungi
   `http://localhost:3000/api/auth/google/callback` e quello di produzione.
3. Metti `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nel `.env`.

Senza credenziali il pulsante Google non compare e resta l'accesso con email.

## Pubblicare su Cloudflare (piano gratuito)

L'app gira su **Workers** con database **D1** e foto su **KV**: tutto compreso
nel piano gratuito.

```bash
npx wrangler login

# 1. Database
npx wrangler d1 create amici-pelosi
#    copia database_id nel campo corrispondente di wrangler.jsonc

# 2. Spazio per le foto
npx wrangler kv namespace create PHOTOS_KV
#    copia l'id nel campo corrispondente di wrangler.jsonc

# 3. Tabelle e dati di esempio
npm run cf:d1:migrate
npm run cf:d1:seed        # facoltativo

# 4. Segreti
npx wrangler secret put AUTH_SECRET
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put GOOGLE_CLIENT_SECRET      # se usi l'accesso Google

# 5. Pubblicazione
npm run cf:deploy
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `GOOGLE_CLIENT_ID` vanno invece messe fra le
`vars` di `wrangler.jsonc`, perche servono anche al browser.

Per usare R2 al posto di KV basta aggiungere un binding chiamato `PHOTOS`:
l'app lo preferisce automaticamente quando c'e.

## APK Android

L'app Android e una **Trusted Web Activity**: apre il sito dentro il motore di
Chrome, quindi notifiche push, GPS e fotocamera continuano a funzionare come nel
browser (una WebView normale le perderebbe).

L'APK si costruisce con GitHub Actions, dove l'SDK Android e gia disponibile:

1. Vai su **Actions → Costruisci APK Android → Run workflow**.
2. Inserisci l'indirizzo pubblico dell'app (quello restituito da `cf:deploy`).
3. A fine esecuzione scarica l'artifact `amici-pelosi-apk`.

Per costruirlo sulla tua macchina servono JDK 17 e l'SDK Android:

```bash
cd android
gradle assembleDebug -PappUrl=https://il-tuo-indirizzo
# APK in android/app/build/outputs/apk/debug/
```

### Togliere la barra dell'indirizzo

Perche l'app si apra a tutto schermo, il sito deve dichiarare di conoscere
l'APK:

1. Prendi l'impronta SHA-256 del certificato di firma (il workflow la stampa
   nel passo *Impronta del certificato di firma*).
2. Impostala come variabile `ANDROID_CERT_FINGERPRINT` su Cloudflare.
3. Verifica che `https://il-tuo-indirizzo/.well-known/assetlinks.json` la
   riporti, poi reinstalla l'app.

## Struttura

```
src/app/            pagine e API (Next.js App Router)
src/components/     interfaccia (mappa, form, schede, audio)
src/db/             schema e connessione Drizzle (D1 o SQLite)
src/lib/            geolocalizzazione, notifiche push, audio, testi
android/            progetto Android (Trusted Web Activity)
migrations/         migrazioni SQL e dati di esempio per D1
tests/              verifica della cifratura Web Push
```

## Scelte tecniche

Il runtime Cloudflare non ha filesystem ne moduli nativi, quindi:

- **Drizzle ORM** invece di Prisma: parla direttamente al binding D1.
- **Ridimensionamento nel browser** invece di `sharp`.
- **PBKDF2 su Web Crypto** invece di bcrypt, piu adatto al limite di CPU per
  richiesta del piano gratuito.
- **Web Push implementato in casa** (RFC 8291 e RFC 8292) su Web Crypto:
  `npm test` verifica che il payload cifrato sia decifrabile dal destinatario.
- **Audio sintetizzato** con Web Audio: nessun file da scaricare, nessun
  problema di licenze.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Sviluppo locale |
| `npm test` | Verifica la cifratura delle notifiche push |
| `npm run db:migrate` | Applica le migrazioni al database locale |
| `npm run db:seed` | Carica i dati di esempio |
| `npm run db:generate` | Genera una migrazione dallo schema |
| `npm run seed:sql` | Esporta i dati di esempio in SQL per D1 |
| `npm run cf:build` | Costruisce la versione per Cloudflare |
| `npm run cf:preview` | Prova la versione Cloudflare in locale |
| `npm run cf:deploy` | Pubblica su Cloudflare |
| `npm run generate:vapid` | Genera le chiavi per le notifiche |

## Avvertenze

Le regole di pubblicazione sono nella pagina `/regole`. In sintesi: **nelle foto
deve esserci solo l'animale**, mai persone; la zona indica il quartiere, non
l'indirizzo di casa; un animale ferito va portato subito da un veterinario.

## Sugli avvisi di `npm audit`

Restano quattro segnalazioni «moderate», tutte sulla stessa catena: una
versione vecchia di `esbuild` tirata dentro da `drizzle-kit`. Il difetto è che
*il server di sviluppo di esbuild* risponde a richieste provenienti da altri
siti. Quel server non viene mai avviato, `drizzle-kit` è uno strumento da
tavolo di lavoro e non finisce su Cloudflare: nel prodotto pubblicato quel
codice non c'è.

**Non lanciare `npm audit fix --force`.** Per far tacere quell'avviso npm
propone di retrocedere `drizzle-kit` alla 0.18, che è di due anni fa e non
parla la stessa lingua di `drizzle-orm`, e di portare Next dalla 15 alla 16,
che `@opennextjs/cloudflare` non è detto regga. Il risultato è un albero di
dipendenze che nessuno ha mai fatto girare.

Se qualcuno l'ha già lanciato, si torna indietro così:

```
git checkout -- package.json package-lock.json
npm ci
```

Le due segnalazioni gravi che c'erano prima — `deepmerge-ts` e `postcss` —
sono risolte con due `overrides` nel `package.json`, che restano dentro la
stessa versione maggiore e non cambiano il comportamento di niente.
