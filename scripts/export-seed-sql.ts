/**
 * Esporta i dati di esempio del database locale in un file SQL, cosi da poter
 * popolare il database D1 su Cloudflare con un solo comando.
 */
import Database from 'better-sqlite3'
import { writeFileSync } from 'node:fs'

const file = (process.env.LOCAL_DATABASE_URL ?? 'file:./data/local.db').replace(/^file:/, '')
const db = new Database(file, { readonly: true })

const quote = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'bigint') return String(value)
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString('hex')}'`
  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * Uno statement per riga: D1 rifiuta le istruzioni troppo lunghe e le foto
 * sono serializzate come letterali binari.
 */
function dump(table: string): string {
  const rows = db.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[]
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const columnList = columns.map((column) => `"${column}"`).join(', ')
  return rows
    .map(
      (row) =>
        `INSERT INTO "${table}" (${columnList}) VALUES (${columns
          .map((column) => quote(row[column]))
          .join(', ')});`,
    )
    .join('\n')
}

const tables = ['users', 'posts', 'photos', 'sightings']

const sql = [
  '-- Dati di esempio per Amici Pelosi (generato da scripts/export-seed-sql.ts)',
  'DELETE FROM "sightings";',
  'DELETE FROM "photos";',
  'DELETE FROM "posts";',
  'DELETE FROM "push_subscriptions";',
  'DELETE FROM "users";',
  '',
  ...tables.map(dump),
].join('\n')

writeFileSync('migrations/seed.sql', sql)

const counts = tables
  .map((table) => `${(db.prepare(`SELECT count(*) AS n FROM "${table}"`).get() as { n: number }).n} ${table}`)
  .join(', ')
console.log(`migrations/seed.sql scritto: ${counts}.`)
