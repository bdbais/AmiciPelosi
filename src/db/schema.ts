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
  /**
   * Ogni quanti minuti, al massimo, questa persona vuole essere avvisata.
   * Le novita' nel frattempo si accumulano e partono insieme: un avviso per
   * ogni annuncio, in una citta' grande, e' una sveglia ogni pochi minuti, e
   * chi la riceve spegne le notifiche dopo due giorni.
   */
  alertEveryMinutes: integer('alert_every_minutes').notNull().default(30),
  /** Quando e' partito l'ultimo riepilogo, per sapere quando puo' partire il prossimo. */
  alertLastSentAt: integer('alert_last_sent_at', { mode: 'timestamp' }),

  // Chi apre l'account: una persona, oppure un canile, un gattile, un'associazione.
  // Un ente scrive i propri dati una volta sola e li eredita ogni suo annuncio.
  accountType: text('account_type').notNull().default('PERSON'),
  orgName: text('org_name'),
  orgAddress: text('org_address'),
  orgCity: text('org_city'),
  orgLat: real('org_lat'),
  orgLng: real('org_lng'),
  orgPhone: text('org_phone'),
  orgEmail: text('org_email'),
  orgSite: text('org_site'),
  orgHours: text('org_hours'),
  /** Il bollino non si prende compilando un modulo: lo mette una persona. */
  orgVerified: integer('org_verified', { mode: 'boolean' }).notNull().default(false),
})

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    kind: text('kind').notNull(), // LOST | FOUND | FOSTER | ADOPTION
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
    /** Per quanto serve lo stallo. Uno stallo senza durata e' un'adozione non detta. */
    fosterPeriod: text('foster_period'),

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

/**
 * Le foto di una segnalazione.
 *
 * Stanno in una tabella loro e non insieme a quelle degli annunci perche'
 * rispondono a un'altra domanda: non "com'e' fatto il mio gatto" ma "guarda,
 * questo qui ti sembra il tuo?". E' la foto che chiude una ricerca.
 */
export const sightingPhotos = sqliteTable(
  'sighting_photos',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    mimeType: text('mime_type').notNull(),
    data: blob('data', { mode: 'buffer' }),
    storageKey: text('storage_key'),
    width: integer('width').notNull().default(0),
    height: integer('height').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    sightingId: text('sighting_id')
      .notNull()
      .references(() => sightings.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sighting_photos_idx').on(table.sightingId)],
)

export type SightingPhoto = typeof sightingPhotos.$inferSelect
