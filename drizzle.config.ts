import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: (process.env.LOCAL_DATABASE_URL ?? 'file:./data/local.db').replace(/^file:/, ''),
  },
})
