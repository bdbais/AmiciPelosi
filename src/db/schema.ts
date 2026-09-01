import { sql } from 'drizzle-orm'
import { blob, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const cuid = () => crypto.randomUUID()
const now = sql`(unixepoch())`

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(cuid),
  email: text('email').notNull().unique(),
  /** Vuoto per gli account creati con Google. */
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  phone: text('phone'),
  /** Identificativo stabile dell'account Google, se collegato. */
  googleId: text('google_id').unique(),
  avatarUrl: text('avatar_url'),
  /** Un'email verificata dal provider e un minimo di garanzia sull'identita. */
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),

  // Zona di interesse per le notifiche di prossimita
  alertLat: real('alert_lat'),
  alertLng: real('alert_lng'),
  alertRadiusKm: real('alert_radius_km').notNull().default(10),
  alertsEnabled: integer('alerts_enabled', { mode: 'boolean' }).notNull().default(true),
  alertCity: text('alert_city'),
})

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    kind: text('kind').notNull(), // LOST | FOUND | ADOPTION
    status: text('status').notNull().default('OPEN'), // OPEN | RESOLVED
    title: text('title').notNull(),
    species: text('species').notNull(),
    breed: text('breed'),
    petName: text('pet_name'),
    sex: text('sex'),
    ageRange: text('age_range'),
    size: text('size'),
    color: text('color'),
    hasMicrochip: integer('has_microchip', { mode: 'boolean' }).notNull().default(false),
    microchip: text('microchip'),
    hasCollar: integer('has_collar', { mode: 'boolean' }).notNull().default(false),
    neutered: integer('neutered', { mode: 'boolean' }),
    vaccinated: integer('vaccinated', { mode: 'boolean' }),
    goodWithKids: integer('good_with_kids', { mode: 'boolean' }),
    goodWithPets: integer('good_with_pets', { mode: 'boolean' }),
    description: text('description').notNull(),
    extraNotes: text('extra_notes'),

    address: text('address').notNull(),
    city: text('city').notNull(),
    province: text('province'),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),

    eventDate: integer('event_date', { mode: 'timestamp' }).notNull().default(now),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),

    contactName: text('contact_name').notNull(),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),

    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('posts_kind_status_idx').on(table.kind, table.status),
    index('posts_position_idx').on(table.lat, table.lng),
    index('posts_created_idx').on(table.createdAt),
  ],
)

export const photos = sqliteTable(
  'photos',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    mimeType: text('mime_type').notNull(),
    /** Binario: valorizzato solo quando non c'e uno storage esterno. */
    data: blob('data', { mode: 'buffer' }),
    /** Chiave nello storage oggetti (Cloudflare KV o R2). */
    storageKey: text('storage_key'),
    width: integer('width').notNull().default(0),
    height: integer('height').notNull().default(0),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
  },
  (table) => [index('photos_post_idx').on(table.postId)],
)

export const sightings = sqliteTable(
  'sightings',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    message: text('message').notNull(),
    lat: real('lat'),
    lng: real('lng'),
    address: text('address'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sightings_post_idx').on(table.postId)],
)

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('push_user_idx').on(table.userId)],
)

export type User = typeof users.$inferSelect
export type Post = typeof posts.$inferSelect
export type Photo = typeof photos.$inferSelect
export type Sighting = typeof sightings.$inferSelect
