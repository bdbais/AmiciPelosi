/// <reference types="@cloudflare/workers-types" />
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from './schema'

export type Database = DrizzleD1Database<typeof schema>

let localDb: Database | undefined

/**
 * Database dell'applicazione: su Cloudflare usa il binding D1, in locale
 * apre il file SQLite. Lo stesso codice di query vale per entrambi.
 */
export async function getDb(): Promise<Database> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const binding = (env as unknown as { DB?: D1Database }).DB
    if (binding) return drizzleD1(binding, { schema })
  } catch {
    // Fuori da Cloudflare: si prosegue con il database locale.
  }

  if (!localDb) {
    const { drizzle: drizzleSqlite } = await import('drizzle-orm/better-sqlite3')
    const { default: Database } = await import('better-sqlite3')
    const file = (process.env.LOCAL_DATABASE_URL ?? 'file:./data/local.db').replace(/^file:/, '')
    localDb = drizzleSqlite(new Database(file), { schema }) as unknown as Database
  }
  return localDb
}

export { schema }
