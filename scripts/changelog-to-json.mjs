#!/usr/bin/env node
/**
 * Da CHANGELOG.md alle schede di /admin/novita.
 *
 * Il file resta la fonte: una sezione `##` per pubblicazione, con dentro le
 * modifiche e, sotto `### Scelte`, le decisioni prese e il perche'. Questo
 * script lo spezza in sezioni e le mette in un JSON che il sito importa.
 * Gira prima di ogni build (prebuild) e in scripts/pubblica.mjs; il JSON e'
 * committato perche' anche `next dev` lo deve trovare senza passare da qui.
 *
 * Non c'e' database dietro: le novita' non si votano e non hanno stato, si
 * leggono. Per questo, a differenza delle idee, basta il JSON.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'CHANGELOG.md'
const TARGET = 'src/lib/changelog.generated.json'

const lines = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n').split('\n')
const releases = []
let current = null

for (const line of lines) {
  const heading = line.match(/^##\s+(.+?)\s*$/)
  if (heading) {
    current = { title: heading[1].trim(), lines: [] }
    releases.push(current)
    continue
  }
  // Prima del primo `##` c'e' il preambolo: non e' una pubblicazione.
  if (current) current.lines.push(line)
}

const output = releases.map((release) => {
  // «4 settembre 2026 · moderazione completa» → data e titolo separati, per
  // mostrarli su due righe senza tornare a spezzare il testo nel componente.
  const [date, ...rest] = release.title.split('·').map((part) => part.trim())
  return { date, title: rest.join(' · '), body: release.lines.join('\n').trim() }
})

writeFileSync(TARGET, JSON.stringify(output, null, 2) + '\n')
console.log(`${output.length} pubblicazioni da ${SOURCE} → ${TARGET}`)
