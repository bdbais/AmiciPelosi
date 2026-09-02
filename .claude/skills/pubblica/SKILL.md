---
name: pubblica
description: Porta Amici Pelosi online dal principio alla fine - aggiorna il codice, installa le dipendenze nuove, applica le migrazioni al database remoto, costruisce, verifica che il build corrisponda al codice e pubblica su Cloudflare. Da usare quando si chiede di pubblicare, deployare, mettere online o aggiornare il sito.
---

# Pubblicare Amici Pelosi

Il comando è uno solo:

```
npm run pubblica
```

Fa nell'ordine giusto tutto quello che serve e si ferma al primo problema.
Prima di lanciarlo, leggi il resto: serve a capire cosa fare quando si ferma,
che è il momento in cui questa skill vale qualcosa.

## Perché esiste

Perché l'ordine dei passaggi non è ovvio, e sbagliarlo rompe il sito in
silenzio: il comando dice «Success» e il danno si vede solo dopo, addosso a
chi sta usando il sito. Sono quattro trappole, e ci siamo già caduti in tutte.

1. **Le migrazioni vanno prima del deploy.** Il codice nuovo interroga colonne
   che sul database remoto potrebbero non esistere ancora. Pubblicando per
   primo, le pagine che le toccano vanno in errore.
2. **`NEXT_PUBLIC_...` viene cucito dentro il codice durante il build**, non
   letto a ogni richiesta. Modificare `.env` dopo il build non ha alcun
   effetto, e nessuno te lo dice: il sito continua con il valore vecchio. È
   così che si pubblicano chiavi VAPID vecchie credendo di averle cambiate.
3. **Il codice aggiornato senza le dipendenze aggiornate** si ferma su un
   «Module not found» che sembra un errore del codice e non lo è: manca
   `npm ci` dopo un pull che ha toccato `package.json`.
4. **Pubblicare da una copia locale indietro rispetto al ramo.** Il deploy
   riesce e il lavoro non c'è. Lo script confronta le rotte trovate nel codice
   con quelle finite nel build e si ferma se non coincidono.

## Cosa fare quando si ferma

Lo script si ferma apposta, e il messaggio dice già cosa fare. I casi:

- **«Hai modifiche non salvate»** — guarda cosa sono con `git status` e
  `git diff` prima di toccare qualcosa. Se sono modifiche volute, si salvano
  con un commit; se sono avanzi, `git stash`. Non forzare mai il pull senza
  aver guardato: è così che si perde del lavoro.
- **«NEXT_PUBLIC_VAPID_PUBLIC_KEY è vuota»** — `npm run generate:vapid`,
  copiare le righe in `.env`, e la privata va anche fra i segreti di
  Cloudflare con `npx wrangler secret put VAPID_PRIVATE_KEY`. **La chiave
  privata non va mai incollata in una conversazione**: si scrive nel file e
  nel terminale, e basta.
- **«Il build non corrisponde al codice»** — quasi sempre è un build vecchio
  rimasto lì. Cancellare `.next` e `.open-next` e rilanciare.
- **Una migrazione fallisce a metà** — non rilanciare alla cieca. Guarda quali
  risultano applicate nella tabella che wrangler stampa, e leggi il file SQL
  di quella che si è fermata: una `ALTER TABLE` già applicata fallisce la
  seconda volta, ed è un caso diverso da un errore vero.

## Dopo, con gli occhi

Due cose che nessuno script può verificare al posto di una persona:

- Aprire `/notifiche`: se compare il riquadro «chiavi VAPID mancanti», la
  chiave pubblica non è finita nel build.
- Attivare le notifiche su un telefono, far pubblicare un annuncio lì vicino
  da un altro account, e guardare se squilla. È l'unica parte del progetto che
  non si può verificare leggendo il codice, ed è metà del suo senso.

## Solo i controlli

Per vedere se è tutto in ordine senza pubblicare niente:

```
npm run pubblica -- --controlli
```

Si ferma prima di toccare il database e prima del deploy.

## Se serve farlo a mano

L'ordine è questo, e non è intercambiabile:

```
git status                                   # non pullare sopra modifiche non salvate
git pull --ff-only origin <ramo>
npm ci                                       # se il pull ha toccato package.json
npx wrangler d1 migrations apply amici-pelosi --remote
npm run cf:build                             # dopo aver sistemato .env, non prima
npm run cf:deploy
```

## Una nota su chi lo lancia

Se stai leggendo questo da una sessione remota (nel cloud), **non puoi
pubblicare**: il proxy blocca sia `api.cloudflare.com` sia il dominio del
sito, e il token di Cloudflare sta solo sulla macchina di chi possiede il
progetto — dove è giusto che stia. Da lì si può preparare tutto e scrivere il
codice, ma il comando finale lo lancia una persona sul proprio computer, o una
sessione che gira lì.
