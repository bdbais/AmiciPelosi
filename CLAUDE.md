# Amici Pelosi

Un'app per far tornare a casa un animale perduto e per trovarne una a chi non
ce l'ha. Il meccanismo è: **un annuncio con una posizione, un avviso a chi sta
lì vicino, e una segnalazione con foto e coordinate da parte di chi passa di
là**. Tutto il resto gira attorno a questo.

Next.js 15 (App Router) su Cloudflare Workers con D1 e KV, più un'app Android
che è una Trusted Web Activity. Online su **amicipelosi.pet** (il vecchio amicipelosi.bais.info rimanda lì).

**Prima di lavorarci leggi [`STATO.md`](STATO.md)**: cosa c'è, cosa funziona,
cosa manca e perché. È scritto apposta per chi riprende in mano il progetto.
In [`IDEE.md`](IDEE.md) le cose decise di non fare adesso, con il motivo.

## Regole del prodotto, non negoziabili

Sono scritte in più punti dell'interfaccia e vanno difese nel codice:

- **Nelle foto solo l'animale.** Mai persone, neanche di spalle o sullo sfondo,
  mai targhe o numeri civici.
- **Qui non si scambia denaro.** Nessuna ricompensa per un ritrovamento,
  nessun compenso per uno stallo, nessuna vendita.
- **Nessun recapito è pubblico.** Il telefono e l'email non si leggono da
  nessuna parte: si chiedono, e chi ha pubblicato decide a chi darli. Chi
  aggiunge un posto dove esporli sta riaprendo un buco che è già stato chiuso
  tre volte (`/api/feed`, la locandina, i dati passati alla pagina).
- **Le segnalazioni «senza vita» non hanno fotografie.** Il divieto sta sul
  server, non solo nel modulo, e regge anche a chi pubblica con le foto e
  cambia tipo dopo.
- **Il ruolo si legge dal server, mai dal client.** Ogni pagina e rotta di
  moderazione passa da `requireModerator()` o `requireAdmin()` in
  `src/lib/moderation.ts`; un componente che nasconde un tasto non è una
  protezione. Un annuncio rimosso o di una persona bloccata non deve uscire da
  nessuna query pubblica: bacheca, feed, vicino, push, locandina, JSON-LD.
- **La scheda di un animale di casa è privata.** Le sue foto hanno una rotta a
  parte che ricontrolla chi guarda a ogni richiesta: se un giorno la si
  unifica con quella pubblica delle immagini, si apre un buco.

## Pubblicare

```
npm run pubblica
```

Fa tutto nell'ordine giusto e si ferma al primo problema. C'è una skill,
`/pubblica`, che spiega cosa fare quando si ferma. **Non pubblicare a mano** se
non hai letto quella skill: l'ordine dei passaggi non è intercambiabile e
sbagliarlo rompe il sito in silenzio.

## Trappole già scoperte

- **Le migrazioni hanno due lettori**: wrangler legge la cartella
  `migrations/`, il migratore di sviluppo si fida di
  `migrations/meta/_journal.json`. Una migrazione nuova va aggiunta a
  entrambi, altrimenti funziona in produzione e non in locale (o viceversa).
- **`NEXT_PUBLIC_...` viene cucito dentro il codice durante il build**, non
  letto a ogni richiesta: cambiare `.env` dopo il build non ha alcun effetto.
- **Mai `npm audit fix --force`**: retrocede drizzle-kit di due anni e porta
  Next dalla 15 alla 16. Il perché è in fondo al README. È già successo due
  volte, e per uscirne serve `git checkout` di `package.json` e del lock.
- **La chiave di firma dell'app sta nel repository** (`android-demo/signing/`).
  Android accetta un aggiornamento solo se firmato con la stessa chiave:
  perderla vuol dire costringere tutti a disinstallare a mano.
- **La cartella `riservato/` non va online**, ed è nel `.gitignore`.

## Come è scritto

I commenti spiegano **perché**, non cosa: quasi ognuno racconta un caso reale
o una decisione presa, e diversi di quei casi sono costati un pomeriggio.
Quando tocchi qualcosa che ne ha uno, leggilo prima: spesso contiene il motivo
per cui la soluzione ovvia non funziona. L'interfaccia parla italiano, in
seconda persona, senza gergo tecnico — chi la legge di solito ha appena perso
un animale.
