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
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DB = 'amici-pelosi'
const solo = process.argv.includes('--controlli')
const saltaPull = process.argv.includes('--senza-pull')

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

/** Esegue un comando mostrandone l'output; si ferma al primo errore. */
function esegui(comando, { silenzioso = false } = {}) {
  const esito = spawnSync(comando, {
    shell: true,
    stdio: silenzioso ? 'pipe' : 'inherit',
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

// --- 4. migrazioni, PRIMA del deploy ---
titolo('Applico le migrazioni al database remoto')
console.log('   (prima del deploy: il codice nuovo interroga colonne che devono già esserci)')
esegui(`npx wrangler d1 migrations apply ${DB} --remote`)

// --- 5. build ---
titolo('Costruisco il sito')
esegui('npm run cf:build')

// --- 6. il build contiene davvero quello che c'e' nel codice? ---
titolo('Verifico che il build contenga tutte le pagine del codice')
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

// --- 7. pubblicazione ---
titolo('Pubblico')
esegui('npm run cf:deploy')

console.log(`
\x1b[32m\x1b[1mFatto.\x1b[0m  https://amicipelosi.bais.info

\x1b[1mDue cose da guardare con gli occhi, che nessuno script può vedere al posto tuo:\x1b[0m

  • Apri  /notifiche . Se compare il riquadro «chiavi VAPID mancanti», la chiave
    pubblica non è finita nel build: rimettila in .env e rilancia questo comando.

  • Attiva le notifiche sul telefono, poi fai pubblicare un annuncio lì vicino da
    un altro account e guarda se squilla. È l'unica parte del progetto che non si
    può verificare leggendo il codice, ed è metà del suo senso.
`)
