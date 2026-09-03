#!/usr/bin/env node
/**
 * Nominare (o togliere) un amministratore.
 *
 *   npm run admin -- email@esempio.it            sul database remoto (D1)
 *   npm run admin -- email@esempio.it --togli    riporta a utente semplice
 *   npm run admin -- email@esempio.it --local    sul D1 locale di wrangler (cf:preview)
 *   npm run admin -- email@esempio.it --dev      sul file SQLite di `npm run dev`
 *
 * Passa da qui, e non dall'interfaccia, per una ragione: il primo
 * amministratore non ha nessuno che lo possa nominare, e togliere
 * l'amministrazione a qualcuno non deve essere un clic sbagliato. Serve
 * l'accesso al database, cioe' a Cloudflare: e' la giusta quantita' di attrito.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const DB = 'amici-pelosi'
const argomenti = process.argv.slice(2)
const togli = argomenti.includes('--togli')
const locale = argomenti.includes('--local')
const dev = argomenti.includes('--dev')
const email = argomenti.find((a) => !a.startsWith('--'))?.trim().toLowerCase()

function ferma(motivo) {
  console.error(`\x1b[31m✖ ${motivo}\x1b[0m`)
  process.exit(1)
}

if (!email) {
  ferma('Manca l\'email. Uso: npm run admin -- email@esempio.it [--togli] [--local|--dev]')
}
/*
 * L'email finisce dentro una stringa SQL passata a wrangler dalla riga di
 * comando: niente apici, niente spazi, niente caratteri che una shell o
 * SQLite potrebbero leggere come altro. Un'email vera non ne ha bisogno.
 */
if (!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
  ferma(`"${email}" non sembra un'email: accetto solo lettere, cifre, . _ + - e una @.`)
}

const ruolo = togli ? 'USER' : 'ADMIN'
const sql = `UPDATE users SET role='${ruolo}' WHERE email='${email}'`

let toccate

if (dev) {
  // Il file che legge `npm run dev`: non e' il D1 locale di wrangler.
  const file = (process.env.LOCAL_DATABASE_URL ?? 'file:./data/local.db').replace(/^file:/, '')
  if (!existsSync(file)) ferma(`Non trovo ${file}: lancia prima npm run db:migrate.`)
  const require = createRequire(import.meta.url)
  const Database = require('better-sqlite3')
  const db = new Database(file)
  toccate = db.prepare(sql).run().changes
  db.close()
  console.log(`Database: ${file}`)
} else {
  const dove = locale ? '--local' : '--remote'
  const comando = `npx wrangler d1 execute ${DB} ${dove} --json --command "${sql}"`
  console.log(`Database: D1 ${locale ? 'locale' : 'remoto'} (${DB})`)
  const esito = spawnSync(comando, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  if (esito.status !== 0) {
    console.error(esito.stderr || esito.stdout)
    ferma('wrangler non ha eseguito il comando. Sei entrato con `npx wrangler login`?')
  }
  // Con --json wrangler risponde con un array, un elemento per statement.
  let risposta
  try {
    const inizio = esito.stdout.indexOf('[')
    risposta = JSON.parse(esito.stdout.slice(inizio))
  } catch {
    console.error(esito.stdout)
    ferma('Non riesco a leggere la risposta di wrangler.')
  }
  toccate = Number(risposta?.[0]?.meta?.changes ?? 0)
}

if (toccate === 0) {
  ferma(`Nessun account con l'email ${email}: controlla che sia scritta come si e' registrato.`)
}

console.log(
  `\x1b[32m✓\x1b[0m ${toccate} account aggiornat${toccate === 1 ? 'o' : 'i'}: ${email} ${
    togli ? 'è tornato utente semplice' : 'è amministratore'
  }.`,
)
// Il ruolo si legge dal database a ogni richiesta: vale dalla prossima pagina, senza rientrare.
