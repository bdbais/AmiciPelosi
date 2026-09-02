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
  /** Dove pubblicano le richieste di adozione, per ricordarselo al momento giusto. */
  orgFacebook: text('org_facebook'),
  orgInstagram: text('org_instagram'),
  /** Il bollino non si prende compilando un modulo: lo mette una persona. */
  orgVerified: integer('org_verified', { mode: 'boolean' }).notNull().default(false),
})

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    kind: text('kind').notNull(), // LOST | FOUND | FOSTER | ADOPTION | FOUND_DEAD
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
    /** Come e finita: non tutte le chiusure sono un lieto fine. */
    outcome: text('outcome'),

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

/**
 * Gli animali di casa.
 *
 * Non sono annunci: sono la scheda del proprio cane o del proprio gatto, con
 * le tre fotografie che servirebbero il giorno in cui sparisce - muso, fianco
 * destro, fianco sinistro - il numero del microchip e la foto del libretto,
 * che e' la cosa che si perde per prima.
 *
 * Nascono privati e restano privati finche' non si decide altrimenti. Non
 * compaiono in bacheca, non finiscono nel feed, e le loro foto non passano
 * dalla via pubblica delle immagini.
 */
export const pets = sqliteTable(
  'pets',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    species: text('species').notNull(),
    breed: text('breed'),
    sex: text('sex'),
    birthDate: text('birth_date'),
    color: text('color'),
    microchip: text('microchip'),
    notes: text('notes'),
    /** Spento di partenza: condividere e' un gesto, non un'impostazione di fabbrica. */
    sharedWithCircle: integer('shared_with_circle', { mode: 'boolean' }).notNull().default(false),
    /**
     * ACTIVE, ADOPTED, DECEASED.
     *
     * Una scheda non si cancella mai da sola. Chi e stato adottato esce
     * dall'elenco di chi cerca casa ma resta nello storico di chi l'ha
     * accudito; chi non c'e piu resta dov'e, perche' quella scheda e un
     * ricordo prima che un archivio.
     */
    status: text('status').notNull().default('ACTIVE'),
    /** Il giorno in cui e finita. Serve solo a scriverlo accanto al nome. */
    farewellDate: text('farewell_date'),

    /*
     * La parte gestionale, che serve a un canile o a un gattile e a una
     * famiglia no: quando e entrato, quando e uscito, e le cose che chi adotta
     * chiede sempre e che altrimenti si ripetono al telefono venti volte.
     */
    intakeDate: text('intake_date'),
    exitDate: text('exit_date'),
    neutered: integer('neutered', { mode: 'boolean' }),
    vaccinated: integer('vaccinated', { mode: 'boolean' }),
    /** FIV e FeLV per i gatti, e in generale gli esami gia fatti. */
    tested: text('tested'),
    goodWithCats: integer('good_with_cats', { mode: 'boolean' }),
    goodWithDogs: integer('good_with_dogs', { mode: 'boolean' }),
    goodWithKids: integer('good_with_kids', { mode: 'boolean' }),
    careNotes: text('care_notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [index('pets_owner_idx').on(table.ownerId)],
)

/** FRONT | LEFT | RIGHT sono le tre che servono a riconoscerlo. DOCUMENT e' il libretto. */
export const petPhotos = sqliteTable(
  'pet_photos',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    slot: text('slot').notNull(),
    mimeType: text('mime_type').notNull(),
    data: blob('data', { mode: 'buffer' }),
    storageKey: text('storage_key'),
    width: integer('width').notNull().default(0),
    height: integer('height').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [index('pet_photos_pet_idx').on(table.petId)],
)

/** Il diario: la visita, il parto, la vaccinazione, il giorno storto. */
export const petEvents = sqliteTable(
  'pet_events',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    note: text('note'),
    happenedAt: text('happened_at').notNull(),
    /** Compleanni e anniversari tornano ogni anno; una visita dal veterinario no. */
    recursYearly: integer('recurs_yearly', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [index('pet_events_pet_idx').on(table.petId)],
)

/**
 * Le persone fidate.
 *
 * Chi sta qui dentro puo' vedere gli animali che il proprietario ha deciso di
 * condividere, e nient'altro. Non e' un'amicizia reciproca: e' una chiave che
 * si da', e che si puo' riprendere.
 */
export const trustedPeople = sqliteTable(
  'trusted_people',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    personId: text('person_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /**
     * ALL e' la chiave di casa: scheda e diario per intero.
     * MEDICAL e' quella che si da al veterinario: identita, microchip, libretto
     * e le righe cliniche del diario. Non il compleanno, non gli appunti di
     * famiglia, che non gli servono e non lo riguardano.
     */
    scope: text('scope').notNull().default('ALL'),
    /**
     * Il veterinario di riferimento: quello che ti conosce, a cui si da tutto.
     * Uno solo, perche' "di riferimento" al plurale non vuol dire niente.
     */
    primaryVet: integer('primary_vet', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [index('trusted_owner_idx').on(table.ownerId, table.personId)],
)

export type Pet = typeof pets.$inferSelect
export type PetPhoto = typeof petPhotos.$inferSelect
export type PetEvent = typeof petEvents.$inferSelect
