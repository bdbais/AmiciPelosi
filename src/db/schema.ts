import { sql } from 'drizzle-orm'
import {
  blob,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core'

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
  /**
   * Sale di uno per buttare fuori tutte le sessioni aperte: il token porta
   * la versione con cui e' nato e, se non coincide, non vale piu'.
   */
  sessionVersion: integer('session_version').notNull().default(0),
  /** Ultimo login o, al massimo una volta l'ora, ultima pagina aperta; e da dove (APP | SITO). */
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
  lastClient: text('last_client'),
  /** USER | MODERATOR | ADMIN. Il primo ADMIN lo si nomina da terminale (npm run admin). */
  role: text('role').notNull().default('USER'),
  /**
   * Chi e' bloccato non entra piu': currentUser lo tratta come assente e il
   * login gli dice il motivo. I suoi annunci spariscono dalle pagine
   * pubbliche ma restano nel database, perche' un blocco si puo' togliere.
   */
  bannedAt: integer('banned_at', { mode: 'timestamp' }),
  bannedReason: text('banned_reason'),
  /**
   * "Somiglia a un bloccato": stesso browser o stesso indirizzo di rete di
   * qualcuno che e' stato bloccato. E' un sospetto per chi modera, non un
   * verdetto: nessuno viene bloccato da solo per questo.
   */
  suspectOf: text('suspect_of').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  suspectReason: text('suspect_reason'),
  suspectAt: integer('suspect_at', { mode: 'timestamp' }),
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
  /**
   * NONE | PENDING | VERIFIED | REJECTED. Il tipo dichiarato qui sopra vale
   * solo con VERIFIED: fino ad allora l'account conta come una persona
   * (effectiveAccountType in constants.ts). Una persona sta a NONE.
   */
  accountStatus: text('account_status').notNull().default('NONE'),
  /** Il link che dimostra chi e': sito, pagina Facebook, albo. Chi modera lo guarda. */
  proofUrl: text('proof_url'),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  verifiedBy: text('verified_by').references((): AnySQLiteColumn => users.id, { onDelete: 'set null' }),
  /** Il motivo del rifiuto, che la persona legge; oppure la nota di chi approva. */
  verificationNote: text('verification_note'),
},
  (table) => [
    // Chi avvisare per un annuncio nuovo: la query passa di qui a ogni pubblicazione.
    index('users_alerts_idx').on(table.alertsEnabled, table.alertLat, table.alertLng),
    index('users_account_status_idx').on(table.accountStatus),
  ],
)

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    kind: text('kind').notNull(), // LOST | FOUND | FOSTER | ADOPTION | FOUND_DEAD
    /**
     * OPEN | RESOLVED | REMOVED.
     *
     * REMOVED lo mette solo chi modera: l'annuncio sparisce da ogni pagina
     * pubblica ma resta qui, foto comprese, finche' chi l'ha scritto non lo
     * cancella davvero. Una rimozione sbagliata deve potersi annullare.
     */
    status: text('status').notNull().default('OPEN'),
    /** Perche' e' stato chiuso o rimosso da chi modera: lo legge chi ha pubblicato. */
    moderationReason: text('moderation_reason'),
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
    /**
     * Chi puo' arrivare al recapito.
     *
     * REQUEST e' il modo normale: il numero non lo vede nessuno, si chiede e
     * chi ha pubblicato decide a chi darlo. OPEN lo mostra a chi e' entrato,
     * e resta una scelta esplicita di chi pubblica - mai il valore di partenza.
     * In nessuno dei due casi il recapito finisce nella pagina pubblica.
     */
    contactMode: text('contact_mode').notNull().default('REQUEST'),

    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('posts_kind_status_idx').on(table.kind, table.status),
    index('posts_position_idx').on(table.lat, table.lng),
    index('posts_created_idx').on(table.createdAt),
    index('posts_author_idx').on(table.authorId),
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
    /**
     * Quando chi ha pubblicato ha detto grazie. Un cuoricino, una volta
     * sola: e' l'unico segno di fiducia che il sito mostra di una persona,
     * e per questo lo puo' mettere solo chi ha ricevuto l'aiuto.
     */
    thankedAt: integer('thanked_at', { mode: 'timestamp' }),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('sightings_post_idx').on(table.postId),
    // Il profilo pubblico conta le segnalazioni fatte da una persona.
    index('sightings_author_idx').on(table.authorId),
  ],
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
  (table) => [
    index('trusted_owner_idx').on(table.ownerId, table.personId),
    index('trusted_people_person_idx').on(table.personId),
  ],
)

export type Pet = typeof pets.$inferSelect
export type PetPhoto = typeof petPhotos.$inferSelect
export type PetEvent = typeof petEvents.$inferSelect


/**
 * "Posso avere il tuo contatto?"
 *
 * La domanda passa da qui invece che dalla bacheca. Chi ha pubblicato vede chi
 * gliela fa - da quanto esiste quell'account, cosa ha gia' scritto - e decide
 * lui. Un recapito dato non si puo' piu' riprendere, quindi meglio che lo dia
 * una persona e non una pagina aperta a tutti.
 */
export const contactRequests = sqliteTable(
  'contact_requests',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    /** Chi chiede. */
    fromUserId: text('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Chi ha pubblicato, e quindi chi decide. */
    toUserId: text('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Perche' lo chiede: due righe bastano, ma qualcosa deve scriverlo. */
    message: text('message').notNull(),
    /** PENDING | ACCEPTED | DECLINED */
    status: text('status').notNull().default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    decidedAt: integer('decided_at', { mode: 'timestamp' }),
    /** Il grazie di chi ha dato il contatto, se poi l'aiuto e' arrivato davvero. */
    thankedAt: integer('thanked_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('contact_requests_to_idx').on(table.toUserId, table.status),
    index('contact_requests_from_idx').on(table.fromUserId),
    index('contact_requests_post_idx').on(table.postId),
    // Una domanda sola per annuncio: chi e' stato rifiutato non riprova all'infinito.
    uniqueIndex('contact_requests_unique').on(table.postId, table.fromUserId),
  ],
)

/**
 * "Qui c'e' qualcosa che non va."
 *
 * La segnalazione di chi legge un annuncio: una persona in foto, una richiesta
 * di soldi, una vendita. Chi segnala puo' sparire e la segnalazione resta,
 * perche' riguarda l'annuncio e non chi l'ha notato.
 */
export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    reporterId: text('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    /** Uno di REPORT_REASONS (moderation-types.ts). */
    reason: text('reason').notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    handledAt: integer('handled_at', { mode: 'timestamp' }),
    handledBy: text('handled_by').references(() => users.id, { onDelete: 'set null' }),
    /** REMOVED | KEPT, oppure null finche' nessuno l'ha guardata. */
    outcome: text('outcome'),
  },
  (table) => [
    index('reports_post_idx').on(table.postId),
    // La coda di chi modera: le segnalazioni con handled_at ancora vuoto.
    index('reports_handled_idx').on(table.handledAt),
  ],
)

/**
 * Il registro della moderazione: chi ha fatto cosa, su cosa, e perche'.
 *
 * target_label e' il titolo o il nome al momento dell'azione: la riga deve
 * leggersi anche quando l'annuncio e' stato cancellato davvero o l'account
 * non esiste piu', altrimenti il registro e' un elenco di identificativi.
 */
export const moderationLog = sqliteTable(
  'moderation_log',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    /** POST | USER | REPORT | DEVICE | IDEA */
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    targetLabel: text('target_label').notNull(),
    reason: text('reason'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [index('moderation_log_created_idx').on(table.createdAt)],
)

export type Report = typeof reports.$inferSelect

/**
 * I browser da cui si entra, riconosciuti da un codice casuale lasciato in
 * un cookie (ap_dev). Non e' un'impronta del telefono: e' un biglietto che
 * diamo noi, e chi cancella i cookie ne riceve un altro. Serve a una cosa
 * sola: accorgersi che chi e' stato bloccato sta rientrando con un'altra
 * email, e metterlo davanti a chi modera. Il blocco di un dispositivo lo
 * decide una persona, e da li' non si entra piu' con nessun account.
 */
export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
  bannedAt: integer('banned_at', { mode: 'timestamp' }),
  bannedReason: text('banned_reason'),
  bannedBy: text('banned_by').references(() => users.id, { onDelete: 'set null' }),
})

/** Quali account sono passati da quale browser. Va via con l'account. */
export const userDevices = sqliteTable(
  'user_devices',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull().default(now),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.deviceId] }),
    index('user_devices_device_idx').on(table.deviceId),
  ],
)

/**
 * L'indirizzo di rete abbreviato (hash con AUTH_SECRET, 32 caratteri) di
 * ogni accesso, per 30 giorni. Non si risale all'indirizzo: si puo' solo
 * dire "e' lo stesso di quest'altro account".
 */
export const userIps = sqliteTable(
  'user_ips',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ipHash: text('ip_hash').notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [primaryKey({ columns: [table.userId, table.ipHash] }), index('user_ips_hash_idx').on(table.ipHash)],
)

export type Device = typeof devices.$inferSelect

/**
 * Le idee tenute da parte, da votare in /admin/idee.
 *
 * Quelle di IDEE.md hanno per id lo slug del titolo e source FILE: il file
 * resta la fonte, e a ogni apertura della pagina titolo e testo vengono
 * riallineati, mai lo stato ne' i voti. Quelle scritte dal sito hanno un id
 * casuale, source SITE e chi le ha scritte.
 */
export const ideas = sqliteTable(
  'ideas',
  {
    id: text('id').primaryKey().$defaultFn(cuid),
    title: text('title').notNull(),
    /** Markdown grezzo, reso dal sito con markdown-lite. */
    body: text('body').notNull(),
    /** FILE | SITE */
    source: text('source').notNull(),
    /** Uno di IDEA_STATUSES (moderation-types.ts). Lo cambia solo l'amministratore. */
    status: text('status').notNull().default('OPEN'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [index('ideas_status_idx').on(table.status)],
)

/** Un voto per persona e per idea (YES | LATER | NO), con una riga di commento. Si cambia, non si somma. */
export const ideaVotes = sqliteTable(
  'idea_votes',
  {
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    comment: text('comment'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(now),
  },
  (table) => [primaryKey({ columns: [table.ideaId, table.userId] }), index('idea_votes_user_idx').on(table.userId)],
)

export type Idea = typeof ideas.$inferSelect
