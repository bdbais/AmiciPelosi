#!/usr/bin/env node
/**
 * Da IDEE.md alle idee che si votano in /admin/idee.
 *
 * Il file resta la fonte: si scrive li', con il markdown e il motivo per cui
 * un'idea aspetta, e questo script lo spezza in sezioni e le mette in un JSON
 * che il sito importa. Gira prima di ogni build (prebuild) e in
 * scripts/pubblica.mjs; il JSON e' committato perche' anche `next dev` lo
 * deve trovare senza passare da qui.
 *
 * Ogni sezione `##` e `###` e' un'idea. L'identificativo e' lo slug del
 * titolo, cosi' i voti restano attaccati all'idea anche se il testo cambia;
 * chi rinomina una sezione crea un'idea nuova e lascia orfana la vecchia con
 * i suoi voti, e va fatto sapendolo.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'IDEE.md'
const TARGET = 'src/lib/idee.generated.json'
/** Una nota su come e' fatto il file, non un'idea da votare. */
const SKIP = new Set(['perche-stanno-qui-e-non-nel-codice'])

/** Via le virgolette e i trattini lunghi: «Chi l'ha Visto» diventa Chi l'ha Visto. */
function cleanTitle(raw) {
  return raw
    .replace(/[«»"“”`]/g, '')
    .replace(/\s+—\s+/g, ': ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Minuscolo, senza accenti, solo lettere e cifre separate da un trattino. */
function slug(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const lines = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n').split('\n')
const ideas = []
let current = null

for (const line of lines) {
  const heading = line.match(/^(##|###)\s+(.+?)\s*$/)
  if (heading) {
    const title = cleanTitle(heading[2])
    current = { id: slug(title), title, lines: [] }
    ideas.push(current)
    continue
  }
  // Prima del primo titolo c'e' il preambolo: non e' un'idea.
  if (current) current.lines.push(line)
}

const output = ideas
  .filter((idea) => !SKIP.has(idea.id))
  .map((idea) => ({ id: idea.id, title: idea.title, body: idea.lines.join('\n').trim() }))

const duplicates = output.map((idea) => idea.id).filter((id, index, all) => all.indexOf(id) !== index)
if (duplicates.length > 0) {
  console.error(`Due sezioni di ${SOURCE} hanno lo stesso titolo: ${duplicates.join(', ')}. Rinominane una.`)
  process.exit(1)
}

writeFileSync(TARGET, JSON.stringify(output, null, 2) + '\n')
console.log(`${output.length} idee da ${SOURCE} → ${TARGET}`)
