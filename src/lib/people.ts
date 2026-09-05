import { and, count, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import { getDb } from '@/db'
import { effectiveAccountType } from './constants'
import { contactRequests, devices, posts, sightings, userDevices, users } from '@/db/schema'
import { canModerate, type Viewer } from '@/lib/queries'
import { DEVICE_DAYS } from '@/lib/devices'
import type { Role, SuspectOf } from '@/lib/moderation-types'

/**
 * Chi e' una persona, visto da fuori.
 *
 * Il profilo pubblico esiste per una domanda sola: "di chi mi sto fidando?".
 * Chi legge una segnalazione, o riceve una richiesta di contatto, deve poter
 * vedere se dall'altra parte c'e' qualcuno che sta qui da un anno e ha gia'
 * aiutato dieci volte, o un account aperto stamattina. Nient'altro: niente
 * recapiti, niente email, niente posizione. Sono le tre cose che questo sito
 * si e' impegnato a non mostrare mai, e un profilo pubblico e' esattamente il
 * posto in cui qualcuno prima o poi proverebbe a rimetterle.
 */
export type PublicProfile = {
  id: string
  name: string
  /** Il tipo che conta: PERSON finche' chi modera non ha approvato quello dichiarato. */
  accountType: string
  verified: boolean
  /** Il logo dell'ente, solo da verificati: fuori dalla verifica e' come se non ci fosse. */
  hasLogo: boolean
  /** Un logo caricato, verificato o no: lo sa solo chi modera, che puo' toglierlo prima dell'approvazione. */
  logoUploaded: boolean
  /** Quello che ha detto di essere, e a che punto e' la verifica: li legge solo chi modera. */
  declaredAccountType: string
  accountStatus: string
  accountAgeDays: number
  /** Gli annunci che ha scritto. */
  published: number
  /** Gli annunci di altri a cui ha risposto: con una segnalazione o chiedendo il contatto. */
  answered: number
  /** I grazie ricevuti: il cuoricino di chi ha pubblicato, quando l'aiuto e' arrivato davvero. */
  thanks: number
  /** Ruolo e blocco: li legge solo chi modera, per agire dalla pagina stessa. */
  role: Role
  bannedAt: Date | null
  bannedReason: string | null
  /** Il sospetto "somiglia a un bloccato" e i suoi browser: solo per chi modera, altrimenti vuoti. */
  suspectOf: SuspectOf | null
  suspectReason: string | null
  devicesCount: number
  deviceBanned: boolean
}

/** Da quanti giorni esiste l'account. Zero per chi si e' iscritto oggi. */
export function accountAgeDays(createdAt: Date, now = Date.now()) {
  return Math.max(0, Math.floor((now - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * I grazie ricevuti da un gruppo di persone, una query per tabella.
 *
 * Serve sia al profilo pubblico sia alla lista delle richieste di contatto,
 * che ne mostra cinquanta per volta: contarli uno per uno sarebbero cento
 * query su D1.
 */
export async function thanksReceivedBy(userIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  if (userIds.length === 0) return totals

  const db = await getDb()
  const [fromSightings, fromRequests] = await Promise.all([
    db
      .select({ userId: sightings.authorId, total: count() })
      .from(sightings)
      .where(and(inArray(sightings.authorId, userIds), isNotNull(sightings.thankedAt)))
      .groupBy(sightings.authorId),
    db
      .select({ userId: contactRequests.fromUserId, total: count() })
      .from(contactRequests)
      .where(and(inArray(contactRequests.fromUserId, userIds), isNotNull(contactRequests.thankedAt)))
      .groupBy(contactRequests.fromUserId),
  ])

  for (const row of [...fromSightings, ...fromRequests]) {
    totals.set(row.userId, (totals.get(row.userId) ?? 0) + Number(row.total))
  }
  return totals
}

/** Il profilo pubblico. Cinque query in tutto, nessuna per riga. */
export async function publicProfile(userId: string, viewer?: Viewer): Promise<PublicProfile | null> {
  const db = await getDb()
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      orgName: users.orgName,
      accountType: users.accountType,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
      bannedAt: users.bannedAt,
      bannedReason: users.bannedReason,
      role: users.role,
      suspectOf: users.suspectOf,
      suspectReason: users.suspectReason,
      orgLogoAt: users.orgLogoAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const person = rows[0]
  // Chi e' bloccato, da fuori, non c'e': la sua pagina e' l'ultimo posto in
  // cui avrebbe senso dire "puoi fidarti".
  // Chi modera invece deve poterci arrivare: e' da qui che lo sblocca.
  if (!person || (person.bannedAt && !canModerate(viewer))) return null

  const [published, sightingPosts, requestPosts, thanks] = await Promise.all([
    db
      .select({ total: count() })
      .from(posts)
      .where(and(eq(posts.authorId, userId), ne(posts.status, 'REMOVED'))),
    // Due segnalazioni sullo stesso annuncio sono un annuncio a cui ha
    // risposto, non due: si contano gli annunci, non i messaggi.
    db.selectDistinct({ postId: sightings.postId }).from(sightings).where(eq(sightings.authorId, userId)),
    db
      .selectDistinct({ postId: contactRequests.postId })
      .from(contactRequests)
      .where(eq(contactRequests.fromUserId, userId)),
    thanksReceivedBy([userId]),
  ])

  const answeredPosts = new Set([...sightingPosts, ...requestPosts].map((row) => row.postId))
  const verified = person.accountStatus === 'VERIFIED'

  // Quello che serve a chi modera per decidere, e a nessun altro: due query
  // in piu' solo per lui, e il profilo pubblico resta com'era.
  const moderation = canModerate(viewer) ? await moderationDetails(userId, person.suspectOf) : null

  return {
    id: person.id,
    // Il nome dell'ente compare solo da verificati: prima e' il nome della persona.
    name: (verified && person.orgName) || person.name,
    accountType: effectiveAccountType(person),
    verified,
    hasLogo: verified && person.orgLogoAt != null,
    logoUploaded: moderation ? person.orgLogoAt != null : false,
    declaredAccountType: person.accountType,
    accountStatus: person.accountStatus,
    accountAgeDays: accountAgeDays(person.createdAt),
    published: Number(published[0]?.total ?? 0),
    answered: answeredPosts.size,
    thanks: thanks.get(userId) ?? 0,
    role: person.role as Role,
    bannedAt: person.bannedAt ?? null,
    bannedReason: person.bannedReason ?? null,
    suspectOf: moderation?.suspectOf ?? null,
    suspectReason: moderation && moderation.suspectOf ? (person.suspectReason ?? null) : null,
    devicesCount: moderation?.devicesCount ?? 0,
    deviceBanned: moderation?.deviceBanned ?? false,
  }
}

/** A chi somiglia, e da quanti browser e' entrata (e se uno di quelli recenti e' bloccato). */
async function moderationDetails(userId: string, suspectOfId: string | null) {
  const db = await getDb()
  const [suspectRows, deviceRows] = await Promise.all([
    suspectOfId
      ? db
          .select({ id: users.id, name: users.name, bannedReason: users.bannedReason })
          .from(users)
          .where(eq(users.id, suspectOfId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ bannedAt: devices.bannedAt, lastSeenAt: userDevices.lastSeenAt })
      .from(userDevices)
      .innerJoin(devices, eq(devices.id, userDevices.deviceId))
      .where(eq(userDevices.userId, userId)),
  ])
  const recent = new Date(Date.now() - DEVICE_DAYS * 24 * 60 * 60 * 1000)
  const suspect = suspectRows[0]
  return {
    suspectOf: suspect ? { id: suspect.id, name: suspect.name, bannedReason: suspect.bannedReason ?? null } : null,
    devicesCount: deviceRows.length,
    deviceBanned: deviceRows.some((row) => row.bannedAt && row.lastSeenAt > recent),
  }
}

export type ThanksTarget = { sightingId: string } | { contactRequestId: string }

export type ThanksResult =
  | { ok: true; recipientId: string; postId: string; postTitle: string; already: boolean }
  | { ok: false; error: string; status: 400 | 404 }

/**
 * Il grazie.
 *
 * Lo puo' dare solo chi ha pubblicato l'annuncio, una volta sola, e solo a chi
 * ha fatto qualcosa: una segnalazione, oppure una richiesta di contatto che
 * e' stata accettata. Ringraziare una richiesta rifiutata non avrebbe senso, e
 * ringraziare se stessi nemmeno. Un secondo grazie sulla stessa riga non e'
 * un errore: e' gia' fatto, e si risponde cosi'.
 */
export async function giveThanks(target: ThanksTarget, ownerId: string): Promise<ThanksResult> {
  const db = await getDb()

  if ('sightingId' in target) {
    const rows = await db
      .select({
        recipientId: sightings.authorId,
        thankedAt: sightings.thankedAt,
        postId: posts.id,
        postTitle: posts.title,
        postAuthorId: posts.authorId,
      })
      .from(sightings)
      .innerJoin(posts, eq(posts.id, sightings.postId))
      .where(eq(sightings.id, target.sightingId))
      .limit(1)

    const row = rows[0]
    // Chi non e' l'autore non deve nemmeno sapere che quella riga esiste.
    if (!row || row.postAuthorId !== ownerId) {
      return { ok: false, error: 'Segnalazione non trovata.', status: 404 }
    }
    if (row.recipientId === ownerId) {
      return { ok: false, error: 'È una segnalazione tua.', status: 400 }
    }
    const base = { recipientId: row.recipientId, postId: row.postId, postTitle: row.postTitle }
    if (row.thankedAt) return { ok: true, ...base, already: true }

    await db.update(sightings).set({ thankedAt: new Date() }).where(eq(sightings.id, target.sightingId))
    return { ok: true, ...base, already: false }
  }

  const rows = await db
    .select({
      recipientId: contactRequests.fromUserId,
      toUserId: contactRequests.toUserId,
      status: contactRequests.status,
      thankedAt: contactRequests.thankedAt,
      postId: posts.id,
      postTitle: posts.title,
    })
    .from(contactRequests)
    .innerJoin(posts, eq(posts.id, contactRequests.postId))
    .where(eq(contactRequests.id, target.contactRequestId))
    .limit(1)

  const row = rows[0]
  if (!row || row.toUserId !== ownerId) {
    return { ok: false, error: 'Richiesta non trovata.', status: 404 }
  }
  if (row.status !== 'ACCEPTED') {
    return { ok: false, error: 'Si ringrazia chi ha avuto il contatto, non chi lo aspetta ancora.', status: 400 }
  }
  const base = { recipientId: row.recipientId, postId: row.postId, postTitle: row.postTitle }
  if (row.thankedAt) return { ok: true, ...base, already: true }

  await db
    .update(contactRequests)
    .set({ thankedAt: new Date() })
    .where(eq(contactRequests.id, target.contactRequestId))
  return { ok: true, ...base, already: false }
}
