/** Applica le migrazioni al database SQLite locale di sviluppo. */
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const file = (process.env.LOCAL_DATABASE_URL ?? 'file:./data/local.db').replace(/^file:/, '')
mkdirSync(dirname(file), { recursive: true })

const db = drizzle(new Database(file))
migrate(db, { migrationsFolder: './migrations' })
console.log(`Migrazioni applicate a ${file}`)
