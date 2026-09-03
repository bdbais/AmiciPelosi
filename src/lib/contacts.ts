import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { effectiveAccountType } from './constants'
import { contactRequests, posts, users } from '@/db/schema'
import { accountAgeDays, thanksReceivedBy } from './people'

/**
 * Chi puo' arrivare al recapito di chi ha pubblicato.
 *
 * Il mondo, visto per quello che e', contiene anche chi raccoglie i numeri
 * dalle bacheche per chiamare al telefono qualcuno che ha appena perso il cane
 * e chiedergli dei soldi per riportarglielo. E' una truffa vecchia e documentata,
 * e funziona perche' il numero e' li' da leggere.
 *
 * Quindi il recapito non e' piu' una cosa che si legge. Si chiede, e chi ha
 * pubblicato decide guardando in faccia chi glielo chiede. Chi vuole comunque
 * il numero visibile a chi e' entrato puo' sceglierlo (contactMode OPEN), ma
 * e' una scelta esplicita, non il valore di partenza - e in nessun caso il
 * recapito finisce nella pagina pubblica o nei dati per i motori di ricerca.
 */
export type ContactAccess =
  | { visible: true; reason: 'OWNER' | 'OPEN' | 'ACCEPTED' }
  | { visible: false; reason: 'ANONYMOUS' | 'ASK' | 'PENDING' | 'DECLINED' }

export async function contactAccess(
  post: { id: string; authorId: string; contactMode: string },
  viewerId: string | null,
): Promise<ContactAccess> {
  if (!viewerId) return { visible: false, reason: 'ANONYMOUS' }
  if (viewerId === post.authorId) return { visible: true, reason: 'OWNER' }
  if (post.contactMode === 'OPEN') return { visible: true, reason: 'OPEN' }

  const db = await getDb()
  const rows = await db
    .select({ status: contactRequests.status })
    .from(contactRequests)
    .where(and(eq(contactRequests.postId, post.id), eq(contactRequests.fromUserId, viewerId)))
    .limit(1)

  const status = rows[0]?.status
  if (status === 'ACCEPTED') return { visible: true, reason: 'ACCEPTED' }
  if (status === 'PENDING') return { visible: false, reason: 'PENDING' }
  if (status === 'DECLINED') return { visible: false, reason: 'DECLINED' }
  return { visible: false, reason: 'ASK' }
}

/** Registra la domanda. Una sola per annuncio: un no e' un no. */
export async function askForContact(postId: string, fromUserId: string, message: string) {
  const db = await getDb()
  const rows = await db
    .select({ authorId: posts.authorId, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  const post = rows[0]
  // Un annuncio rimosso, per chi non l'ha scritto, non c'e'.
  if (!post || post.status === 'REMOVED') return { ok: false as const, error: 'Annuncio non trovato.' }
  if (post.authorId === fromUserId) return { ok: false as const, error: 'È il tuo annuncio.' }

  const existing = await db
    .select({ status: contactRequests.status })
    .from(contactRequests)
    .where(and(eq(contactRequests.postId, postId), eq(contactRequests.fromUserId, fromUserId)))
    .limit(1)

  if (existing[0]) {
    return existing[0].status === 'DECLINED'
      ? { ok: false as const, error: 'Hai già chiesto e la risposta è stata no.' }
      : { ok: false as const, error: 'Hai già mandato la richiesta: aspetta la risposta.' }
  }

  await db.insert(contactRequests).values({
    postId,
    fromUserId,
    toUserId: post.authorId,
    message: message.trim(),
  })

  return { ok: true as const }
}

/** La risposta di chi ha pubblicato. Decide lui, sempre. */
export async function decideContact(
  requestId: string,
  ownerId: string,
  accept: boolean,
) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(contactRequests)
    .where(eq(contactRequests.id, requestId))
    .limit(1)

  const request = rows[0]
  if (!request || request.toUserId !== ownerId) return { ok: false as const }

  await db
    .update(contactRequests)
    .set({ status: accept ? 'ACCEPTED' : 'DECLINED', decidedAt: new Date() })
    .where(eq(contactRequests.id, requestId))

  return { ok: true as const }
}

/**
 * Quello che serve sapere per rispondere.
 *
 * Non un voto e non un punteggio: tre numeri asciutti. Un account aperto
 * stamattina che non ha mai pubblicato niente e chiede il contatto di un cane
 * in adozione e' una cosa diversa da chi e' qui da un anno, e chi risponde ha
 * il diritto di vedere la differenza senza che sia il sito a giudicare. I
 * grazie sono il terzo numero, e l'unico che non puo' darsi da solo: glieli
 * ha messi chi ha ricevuto il suo aiuto.
 */
export async function requesterCard(userId: string) {
  const db = await getDb()
  const rows = await db
    .select({
      name: users.name,
      createdAt: users.createdAt,
      accountType: users.accountType,
      accountStatus: users.accountStatus,
      orgName: users.orgName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const person = rows[0]
  if (!person) return null

  const [published, thanks] = await Promise.all([
    db.select({ total: count() }).from(posts).where(eq(posts.authorId, userId)),
    thanksReceivedBy([userId]),
  ])

  return {
    name: person.orgName || person.name,
    accountType: effectiveAccountType(person),
    accountAgeDays: accountAgeDays(person.createdAt),
    published: published[0]?.total ?? 0,
    thanks: thanks.get(userId) ?? 0,
  }
}

/**
 * Le richieste in attesa di una risposta, per chi deve rispondere.
 *
 * Quattro query in tutto, non tre per ogni richiesta: chi ha in adozione
 * venti animali si ritrova cinquanta domande aperte, e D1 le conta una per una.
 */
export async function pendingRequestsFor(ownerId: string) {
  return requestsFor(ownerId, 'PENDING')
}

/**
 * Le richieste a cui si e' detto di si'.
 *
 * Restano in vista per un motivo solo: e' da qui che parte il grazie, quando
 * l'aiuto e' arrivato davvero. Il recapito ormai l'hanno, e quello non si
 * riprende; il cuoricino invece lo decide chi l'ha dato, dopo.
 */
export async function acceptedRequestsFor(ownerId: string) {
  return requestsFor(ownerId, 'ACCEPTED')
}

async function requestsFor(ownerId: string, status: 'PENDING' | 'ACCEPTED') {
  const db = await getDb()
  const rows = await db
    .select({
      id: contactRequests.id,
      message: contactRequests.message,
      createdAt: contactRequests.createdAt,
      thankedAt: contactRequests.thankedAt,
      fromUserId: contactRequests.fromUserId,
      postId: contactRequests.postId,
      postTitle: posts.title,
      requesterName: users.name,
      requesterCreatedAt: users.createdAt,
      requesterAccountType: users.accountType,
      requesterAccountStatus: users.accountStatus,
      requesterOrgName: users.orgName,
    })
    .from(contactRequests)
    .innerJoin(posts, eq(posts.id, contactRequests.postId))
    .innerJoin(users, eq(users.id, contactRequests.fromUserId))
    .where(and(eq(contactRequests.toUserId, ownerId), eq(contactRequests.status, status)))
    .orderBy(desc(contactRequests.createdAt))
    .limit(50)

  const requesterIds = [...new Set(rows.map((row) => row.fromUserId))]
  const [published, thanksBy] = await Promise.all([
    requesterIds.length
      ? db
          .select({ authorId: posts.authorId, total: count() })
          .from(posts)
          .where(inArray(posts.authorId, requesterIds))
          .groupBy(posts.authorId)
      : [],
    thanksReceivedBy(requesterIds),
  ])
  const publishedBy = new Map(published.map((row) => [row.authorId, row.total]))

  return rows.map(
    ({ requesterName, requesterCreatedAt, requesterAccountType, requesterAccountStatus, requesterOrgName, ...row }) => ({
    ...row,
    who: {
      name: requesterOrgName || requesterName,
      accountType: effectiveAccountType({ accountType: requesterAccountType, accountStatus: requesterAccountStatus }),
      accountAgeDays: accountAgeDays(requesterCreatedAt),
      published: publishedBy.get(row.fromUserId) ?? 0,
      thanks: thanksBy.get(row.fromUserId) ?? 0,
    },
    }),
  )
}
