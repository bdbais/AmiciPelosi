#!/usr/bin/env node
/**
 * Pubblicare il sito, dal principio alla fine, con un comando solo.
 *
 * Non e' una comodita': e' che l'ordine giusto non e' ovvio e sbagliarlo rompe
 * il sito in silenzio. Due trappole in particolare, gia' cadute entrambe:
 *
 * 1. Le migrazioni vanno PRIMA del deploy. Il codice nuovo interroga colonne
 *    che sul database remoto non esistono ancora: pubblicando per primo, ogni
 *    pagina che le tocca va in errore, e l'errore arriva agli utenti, non a te.
 * 2. `NEXT_PUBLIC_...` viene cucito dentro il codice durante il build, non
 *    letto a ogni richiesta. Cambiare .env dopo il build non ha alcun effetto,
 *    e non lo dice nessuno: il sito continua a girare con il valore vecchio.
 *
 * E ce ne sono altre due, piu' stupide e per questo piu' facili da ripetere:
 *
 * 3. Pubblicare da una copia locale indietro rispetto al ramo. Il deploy
 *    riesce, dice "Success", e il lavoro non c'e'. Per questo qui si controlla
 *    che le rotte trovate nel codice siano davvero finite nel build.
 * 4. Aggiornare il codice senza aggiornare le dipendenze. Se il ramo porta una
 *    libreria nuova, il build si ferma su un "Module not found" che sembra un
 *    errore del codice e non lo e'.
 * 5. Pubblicare su un Worker a cui mancano i segreti. Il deploy riesce, e poi
 *    nessuno riesce a entrare (AUTH_SECRET) o nessuna notifica parte
 *    (VAPID_PRIVATE_KEY): errori che si vedono solo dal telefono di qualcun
 *    altro. Per questo si chiede a Cloudflare l'elenco prima di toccare niente.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DB = 'amici-pelosi'
const solo = process.argv.includes('--controlli')
const saltaPull = process.argv.includes('--senza-pull')
/** I segreti senza i quali il sito pubblicato non funziona, anche se il deploy dice "Success". */
const SEGRETI = ['AUTH_SECRET', 'VAPID_PRIVATE_KEY']
/** Quando e' partito lo script: il build deve risultare piu' recente di questo istante. */
const inizio = Date.now()

let passo = 0

function titolo(testo) {
  passo += 1
  console.log(`\n\x1b[1m${passo}. ${testo}\x1b[0m`)
}

function ferma(motivo, comeSiRisolve) {
  console.error(`\n\x1b[31m✖ ${motivo}\x1b[0m`)
  if (comeSiRisolve) console.error(`\n  ${comeSiRisolve}\n`)
  process.exit(1)
}

/**
 * Esegue un comando mostrandone l'output; si ferma al primo errore.
 * Con `senzaTerminale` il comando non vede la tastiera: serve a wrangler, che
 * decide se fare domande guardando se stdin e' un terminale.
 */
function esegui(comando, { silenzioso = false, senzaTerminale = false } = {}) {
  const esito = spawnSync(comando, {
    shell: true,
    stdio: silenzioso ? 'pipe' : senzaTerminale ? ['ignore', 'inherit', 'inherit'] : 'inherit',
    encoding: 'utf8',
  })
  if (esito.status !== 0) {
    if (silenzioso && esito.stderr) console.error(esito.stderr)
    ferma(`Il comando è fallito: ${comando}`, 'Leggi l’errore qui sopra: da qui in poi non si va avanti.')
  }
  return (esito.stdout ?? '').trim()
}

/**
 * npm, dopo ogni installazione, propone `npm audit fix --force`.
 * In questo progetto quel comando retrocede drizzle-kit di due anni e porta
 * Next dalla 15 alla 16: l'albero delle dipendenze si rompe e ci vuole un
 * `git checkout` per tornare indietro. E' gia' successo due volte.
 */
function avvisoAudit() {
  console.log(
    '\n   \x1b[33m! npm qui sopra propone `npm audit fix --force`: non lanciarlo.\x1b[0m',
  )
  console.log('     In questo progetto rompe l\'albero delle dipendenze — il perché è in fondo al README.')
}

function leggi(comando) {
  const esito = spawnSync(comando, { shell: true, stdio: 'pipe', encoding: 'utf8' })
  return (esito.stdout ?? '').trim()
}

// --- siamo nel posto giusto? ---
if (!existsSync('package.json') || !JSON.parse(readFileSync('package.json', 'utf8')).name?.includes('amici')) {
  ferma('Non sei nella cartella del progetto.', 'Spostati in G:\\AI\\amicipelosi (o dove hai il clone) e riprova.')
}

console.log('\n\x1b[1mAmici Pelosi — pubblicazione\x1b[0m')

// --- 1. modifiche locali ---
titolo('Controllo le modifiche locali')
const sporco = leggi('git status --porcelain')
if (sporco) {
  console.log(sporco)
  ferma(
    'Hai modifiche non salvate: il pull si fermerebbe qui.',
    'Salvale con  git add -A && git commit -m "..."  oppure mettile da parte con  git stash  e rilancia.',
  )
}
console.log('   nessuna modifica in sospeso ✓')

// --- 2. allineamento al ramo ---
titolo('Porto giù il lavoro dal ramo')
const ramo = leggi('git rev-parse --abbrev-ref HEAD')
const commitPrima = leggi('git rev-parse HEAD')
if (saltaPull) {
  console.log('   saltato (--senza-pull)')
} else {
  esegui(`git pull --ff-only origin ${ramo}`)
}
console.log(`   ramo: ${ramo} · commit: ${leggi('git rev-parse --short HEAD')}`)

// --- 3. dipendenze allineate al codice appena scaricato ---
titolo('Controllo le dipendenze')
// Il confronto e' con il commit da cui siamo partiti, non con `HEAD@{1}`:
// quello e' la posizione precedente del reflog, che dopo un commit locale non
// e' il punto pre-pull e fa installare le dipendenze senza motivo.
const bloccoCambiato =
  !saltaPull &&
  commitPrima !== leggi('git rev-parse HEAD') &&
  leggi(`git diff --name-only ${commitPrima} HEAD -- package-lock.json package.json`)
if (bloccoCambiato) {
  console.log('   il ramo ha portato dipendenze nuove: le installo')
  // `npm ci` e non `npm install`: rispetta il file di blocco alla lettera e non
  // si inventa versioni. (E soprattutto non `npm audit fix --force`, che qui
  // retrocede drizzle-kit di due anni: il perche' e' in fondo al README.)
  esegui('npm ci')
  avvisoAudit()
} else if (!existsSync(join('node_modules', 'next'))) {
  console.log('   node_modules assente: installo')
  esegui('npm ci')
  avvisoAudit()
} else {
  console.log('   già allineate ✓')
}

// --- 4. le chiavi che servono al build ---
titolo('Controllo le chiavi nel file .env')
if (!existsSync('.env')) {
  ferma('Manca il file .env.', 'Copialo da .env.example e riempilo: senza, il build cuce dentro valori vuoti.')
}
const env = readFileSync('.env', 'utf8')
function valore(nome) {
  const riga = env.split('\n').find((r) => r.trim().startsWith(`${nome}=`))
  return riga ? riga.slice(riga.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : ''
}
const pubblica = valore('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
if (!pubblica) {
  ferma(
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY è vuota in .env.',
    'Questa chiave viene cucita dentro il codice adesso, durante il build: se la metti dopo non serve a niente.\n  Generala con  npm run generate:vapid  e rimettila in .env, poi rilancia.',
  )
}
console.log(`   chiave pubblica presente ✓ (…${pubblica.slice(-8)})`)
if (!valore('AUTH_SECRET')) console.log('   \x1b[33m! AUTH_SECRET vuota in .env (in produzione è un segreto di Cloudflare, quindi può andare bene)\x1b[0m')

if (solo) {
  console.log('\n\x1b[32mSolo controlli: mi fermo qui.\x1b[0m\n')
  process.exit(0)
}

// --- 5. i segreti sul Worker, prima di toccare qualsiasi cosa remota ---
titolo('Controllo i segreti su Cloudflare')
// `--format json` e' il predefinito, ma lo si scrive: se un giorno cambiasse,
// il parse fallirebbe con un messaggio chiaro invece di passare in silenzio.
const elenco = spawnSync('npx wrangler secret list --format json', {
  shell: true,
  stdio: 'pipe',
  encoding: 'utf8',
})
if (elenco.status !== 0) {
  if (elenco.stderr) console.error(elenco.stderr)
  ferma(
    'Non riesco a leggere i segreti del Worker.',
    'Serve il token di Cloudflare di questa macchina: se manca,  npx wrangler login . Da una sessione remota non si pubblica (vedi la skill /pubblica).',
  )
}
let nomiSegreti
try {
  nomiSegreti = new Set(JSON.parse(elenco.stdout).map((voce) => voce.name))
} catch {
  console.error(elenco.stdout)
  ferma('La risposta di wrangler non è l’elenco JSON che mi aspettavo.', 'Guarda qui sopra cosa ha stampato: forse la versione di wrangler è cambiata.')
}
const segretiMancanti = SEGRETI.filter((nome) => !nomiSegreti.has(nome))
if (segretiMancanti.length > 0) {
  ferma(
    `Sul Worker mancano questi segreti: ${segretiMancanti.join(', ')}.`,
    segretiMancanti.map((nome) => `npx wrangler secret put ${nome}`).join('\n  ') +
      '\n  (VAPID_PRIVATE_KEY è la stessa chiave privata che sta in .env: incollala nel terminale, non in una conversazione.)',
  )
}
console.log(`   ${SEGRETI.join(', ')} presenti ✓`)

// --- 6. migrazioni, PRIMA del deploy ---
titolo('Applico le migrazioni al database remoto')
console.log('   (prima del deploy: il codice nuovo interroga colonne che devono già esserci)')
// Non c'e' un flag per saltare la conferma (`wrangler d1 migrations apply --help`
// non ne elenca). Wrangler pero' la salta da solo quando non e' interattivo, e
// per deciderlo guarda due cose: la variabile d'ambiente CI, oppure se stdin e
// stdout sono un terminale (isTtyInteractive in workers-utils). Qui gli si
// toglie stdin: cosi' l'output resta a colori sul terminale e la domanda non
// arriva, senza mettere CI=1 nell'ambiente, che cambia anche altri comportamenti.
esegui(`npx wrangler d1 migrations apply ${DB} --remote`, { senzaTerminale: true })

// --- 7. build ---
titolo('Costruisco il sito')
esegui('npm run cf:build')

// --- 8. il build e' davvero quello di adesso, e contiene il codice? ---
titolo('Verifico che il build sia nuovo e contenga tutte le pagine del codice')
// Il controllo piu' semplice che regge: Next riscrive .next/BUILD_ID a ogni
// build e opennext riscrive il server impacchettato. Se uno dei due e' piu'
// vecchio dell'avvio di questo script, il build appena "riuscito" non ha
// prodotto niente (e' successo: un build interrotto che lascia in piedi quello
// precedente). E' piu' affidabile di scrivere il commit dentro il build e non
// ha bisogno di git.
//
// Non si guarda .open-next/worker.js: e' un modello che opennext COPIA da
// node_modules conservando la data di modifica originale, per cui risulta
// "vecchio" anche quando e' appena stato scritto (la prima pubblicazione con
// questo controllo si e' fermata proprio li'). handler.mjs invece lo genera
// esbuild a ogni build. Per lo stesso motivo si prende la piu' recente fra
// data di modifica e data di creazione: una copia conserva la prima, non la
// seconda.
for (const prova of ['.next/BUILD_ID', '.open-next/server-functions/default/handler.mjs']) {
  const quando = existsSync(prova) ? statSync(prova) : null
  if (!quando || Math.max(quando.mtimeMs, quando.birthtimeMs) < inizio) {
    ferma(
      `${prova} non è stato riscritto da questo build.`,
      'Il build è vecchio o si è fermato a metà. Cancella .next e .open-next e rilancia.',
    )
  }
}
console.log('   build più recente dell’avvio dello script ✓')

const manifest = '.next/app-path-routes-manifest.json'
if (!existsSync(manifest)) {
  ferma('Non trovo l’elenco delle rotte costruite.', 'Il build sembra non essere andato a fondo: rilancia  npm run cf:build  e guarda gli errori.')
}
const costruite = new Set(Object.keys(JSON.parse(readFileSync(manifest, 'utf8'))))

/** Le pagine e le rotte che stanno nel codice, lette dal disco. */
function rotteNelCodice(cartella = 'src/app', dentro = '') {
  const trovate = []
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name)
    if (voce.isDirectory()) {
      trovate.push(...rotteNelCodice(percorso, `${dentro}/${voce.name}`))
    } else if (voce.name === 'page.tsx') {
      trovate.push(`${dentro || ''}/page`)
    } else if (voce.name === 'route.ts') {
      trovate.push(`${dentro || ''}/route`)
    }
  }
  return trovate
}

const mancanti = rotteNelCodice().filter((rotta) => !costruite.has(rotta))
if (mancanti.length > 0) {
  console.error('\n   Nel codice ci sono, nel build no:')
  for (const rotta of mancanti) console.error(`     ${rotta.replace(/\/(page|route)$/, '') || '/'}`)
  ferma(
    'Il build non corrisponde al codice.',
    'Di solito vuol dire che il build è vecchio. Cancella .next e .open-next e rilancia.',
  )
}
console.log(`   ${costruite.size} rotte, tutte presenti ✓`)

// --- 9. pubblicazione ---
titolo('Pubblico')
esegui('npm run cf:deploy')

console.log(`
\x1b[32m\x1b[1mFatto.\x1b[0m  https://amicipelosi.pet

\x1b[1mDue cose da guardare con gli occhi, che nessuno script può vedere al posto tuo:\x1b[0m

  • Apri  /notifiche . Se compare il riquadro «chiavi VAPID mancanti», la chiave
    pubblica non è finita nel build: rimettila in .env e rilancia questo comando.

  • Attiva le notifiche sul telefono, poi fai pubblicare un annuncio lì vicino da
    un altro account e guarda se squilla. È l'unica parte del progetto che non si
    può verificare leggendo il codice, ed è metà del suo senso.
`)
