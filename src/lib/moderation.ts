/**
 * La moderazione, lato server.
 *
 * Tutto quello che chi modera puo' fare passa da qui, e ogni azione lascia
 * una riga nel registro con il nome della cosa toccata: fra un anno
 * l'annuncio sara' stato cancellato e l'account chiuso, e il registro deve
 * leggersi lo stesso.
 *
 * Solo server: tocca il database e le sessioni. I tipi condivisi con
 * l'interfaccia stanno in moderation-types.ts, che non importa niente.
 */
import { after } from 'next/server'
import { and, desc, eq, isNotNull, isNull, like, or, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { moderationLog, posts, pushSubscriptions, reports, users } from '@/db/schema'
import { currentUser, revokeAllSessions, type SessionUser } from './auth'
import { notifyModerated } from './push'
import { canModerate } from './queries'
import {
  REPORT_REASONS,
  type AdminPostItem,
  type AdminUserItem,
  type ModerationLogEntry,
  type PostModerationAction,
  type ReportItem,
  type ReportReason,
  type Role,
  type UserModerationAction,
} from './moderation-types'

type Db = Awaited<ReturnType<typeof getDb>>

/** Chi agisce: basta il minimo della sessione, cosi' si puo' passare anche da uno script. */
export type Actor = { id: string; role: Role; name: string }

export type ModerationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: 400 | 403 | 404 | 409 }

const fail = (status: 400 | 403 | 404 | 409, error: string): ModerationResult<never> => ({
  ok: false,
  error,
  status,
})

/** La persona della richiesta se puo' moderare, altrimenti null. */
export async function requireModerator(): Promise<SessionUser | null> {
  const user = await currentUser()
  return user && canModerate(user) ? user : null
}

/** Come sopra, ma solo per chi amministra: i ruoli li cambia lui. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await currentUser()
  return user?.role === 'ADMIN' ? user : null
}

function asRole(value: string): Role {
  return value === 'ADMIN' || value === 'MODERATOR' ? value : 'USER'
}

type LogEntry = {
  actorId: string | null
  action: string
  targetType: 'POST' | 'USER' | 'REPORT'
  targetId: string
  targetLabel: string
  reason?: string | null
}

async function writeLog(db: Db, entry: LogEntry) {
  await db.insert(moderationLog).values({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel.slice(0, 120),
    reason: entry.reason?.trim() || null,
  })
}

/**
 * Manda l'avviso dopo la risposta. `after` esiste solo dentro una richiesta:
 * da uno script o da un test non c'e', e allora si parte subito senza aspettare.
 */
function afterResponse(task: () => Promise<unknown>) {
  const run = () => task().catch((error) => console.error('Avviso di moderazione non inviato:', error))
  try {
    after(run)
  } catch {
    void run()
  }
}

/**
 * Chiude, rimuove o riapre un annuncio.
 *
 * Rimuovere non cancella: l'annuncio e le sue foto restano dove sono, solo
 * che nessuna pagina pubblica li mostra piu'. Una rimozione sbagliata si
 * annulla con "reopen", e se le foto fossero gia' sparite da KV non ci
 * sarebbe niente da riaprire. La cancellazione vera la fa chi ha scritto.
 */
export async function moderatePost(
  postId: string,
  action: PostModerationAction,
  reason: string,
  actor: Actor,
): Promise<ModerationResult<{ id: string; title: string; authorId: string; status: string }>> {
  const db = await getDb()
  const found = await db
    .select({ id: posts.id, title: posts.title, authorId: posts.authorId, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
  const post = found[0]
  if (!post) return fail(404, 'Annuncio non trovato.')

  const cleanReason = reason.trim()
  if (action !== 'reopen' && cleanReason.length < 3) {
    return fail(400, 'Scrivi il motivo: lo leggerà chi ha pubblicato.')
  }

  const now = new Date()
  let status: string
  if (action === 'close') {
    status = 'RESOLVED'
    await db
      .update(posts)
      .set({ status, moderationReason: cleanReason, resolvedAt: now, updatedAt: now })
      .where(eq(posts.id, postId))
  } else if (action === 'remove') {
    status = 'REMOVED'
    await db
      .update(posts)
      .set({ status, moderationReason: cleanReason, updatedAt: now })
      .where(eq(posts.id, postId))
    // Le segnalazioni ancora aperte su questo annuncio hanno avuto risposta:
    // lasciarle in coda vorrebbe dire far rimuovere due volte la stessa cosa.
    await db
      .update(reports)
      .set({ handledAt: now, handledBy: actor.id, outcome: 'REMOVED' })
      .where(and(eq(reports.postId, postId), isNull(reports.handledAt)))
  } else {
    status = 'OPEN'
    await db
      .update(posts)
      .set({ status, moderationReason: null, resolvedAt: null, outcome: null, updatedAt: now })
      .where(eq(posts.id, postId))
  }

  await writeLog(db, {
    actorId: actor.id,
    action: `post.${action}`,
    targetType: 'POST',
    targetId: post.id,
    targetLabel: post.title,
    reason: action === 'reopen' ? cleanReason || null : cleanReason,
  })

  if (action !== 'reopen') {
    afterResponse(() => notifyModerated(post.authorId, post, action, cleanReason))
  }

  return { ok: true, data: { ...post, status } }
}

/**
 * Blocca, sblocca o cambia il ruolo di una persona.
 *
 * Due regole senza eccezioni: nessuno agisce su se stesso, e un
 * amministratore non si blocca ne' si retrocede da qui. Per togliere
 * l'amministrazione c'e' il terminale (npm run admin -- --togli), che
 * richiede l'accesso al database e non un clic sbagliato.
 */
export async function moderateUser(
  userId: string,
  action: UserModerationAction,
  options: { reason?: string; role?: Role },
  actor: Actor,
): Promise<ModerationResult<{ id: string; name: string; role: Role; bannedAt: string | null }>> {
  if (userId === actor.id) return fail(400, 'Non puoi agire sul tuo account.')

  const db = await getDb()
  const found = await db
    .select({ id: users.id, name: users.name, role: users.role, bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const target = found[0]
  if (!target) return fail(404, 'Persona non trovata.')
  const targetRole = asRole(target.role)

  const reason = options.reason?.trim() ?? ''
  const now = new Date()

  if (action === 'ban') {
    if (targetRole === 'ADMIN') return fail(403, 'Un amministratore non si può bloccare.')
    if (reason.length < 3) return fail(400, 'Scrivi il motivo: lo leggerà la persona bloccata.')

    await db
      .update(users)
      .set({ bannedAt: now, bannedReason: reason })
      .where(eq(users.id, userId))
    // Fuori da tutti i dispositivi, e niente piu' avvisi: il telefono di chi
    // e' bloccato non deve continuare a squillare per la zona.
    await revokeAllSessions(userId)
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
    await writeLog(db, {
      actorId: actor.id,
      action: 'user.ban',
      targetType: 'USER',
      targetId: target.id,
      targetLabel: target.name,
      reason,
    })
    return { ok: true, data: { id: target.id, name: target.name, role: targetRole, bannedAt: now.toISOString() } }
  }

  if (action === 'unban') {
    await db.update(users).set({ bannedAt: null, bannedReason: null }).where(eq(users.id, userId))
    await writeLog(db, {
      actorId: actor.id,
      action: 'user.unban',
      targetType: 'USER',
      targetId: target.id,
      targetLabel: target.name,
      reason,
    })
    return { ok: true, data: { id: target.id, name: target.name, role: targetRole, bannedAt: null } }
  }

  // action === 'role'
  if (actor.role !== 'ADMIN') return fail(403, 'Solo un amministratore cambia i ruoli.')
  const role = options.role
  if (!role) return fail(400, 'Indica il ruolo.')
  if (targetRole === 'ADMIN' && role !== 'ADMIN') {
    return fail(403, 'Un amministratore non si retrocede da qui: si fa da terminale, con npm run admin -- --togli.')
  }

  await db.update(users).set({ role }).where(eq(users.id, userId))
  await writeLog(db, {
    actorId: actor.id,
    action: `user.role.${role}`,
    targetType: 'USER',
    targetId: target.id,
    targetLabel: target.name,
    reason,
  })
  return {
    ok: true,
    data: { id: target.id, name: target.name, role, bannedAt: target.bannedAt?.toISOString() ?? null },
  }
}

/**
 * "Qui c'e' qualcosa che non va."
 *
 * Una segnalazione aperta per persona e per annuncio: la seconda non aggiunge
 * niente a chi modera e toglie il gusto a chi vorrebbe premere dieci volte.
 */
export async function createReport(
  postId: string,
  reporterId: string | null,
  reason: ReportReason,
  note: string | null | undefined,
): Promise<ModerationResult<{ id: string }>> {
  const db = await getDb()
  const found = await db
    .select({ id: posts.id, title: posts.title, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
  const post = found[0]
  // Quello che e' gia' stato rimosso, per chi legge, non c'e' piu'.
  if (!post || post.status === 'REMOVED') return fail(404, 'Annuncio non trovato.')

  if (reporterId) {
    const open = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.postId, postId), eq(reports.reporterId, reporterId), isNull(reports.handledAt)))
      .limit(1)
    if (open[0]) return fail(409, 'Hai già segnalato questo annuncio: chi modera lo vedrà.')
  }

  const cleanNote = note?.trim() ? note.trim().slice(0, 300) : null
  const inserted = await db
    .insert(reports)
    .values({ postId, reporterId, reason, note: cleanNote })
    .returning({ id: reports.id })
  const id = inserted[0].id

  await writeLog(db, {
    actorId: reporterId,
    action: 'report.create',
    targetType: 'REPORT',
    targetId: id,
    targetLabel: post.title,
    reason: cleanNote ? `${REPORT_REASONS[reason]} — ${cleanNote}` : REPORT_REASONS[reason],
  })

  return { ok: true, data: { id } }
}

/**
 * Chiude una segnalazione: l'annuncio va via, oppure resta.
 *
 * Con REMOVED si rimuove l'annuncio, e con lui si chiudono tutte le altre
 * segnalazioni aperte sullo stesso: la risposta e' una sola per tutti.
 */
export async function resolveReport(
  reportId: string,
  outcome: 'REMOVED' | 'KEPT',
  actor: Actor,
  reason?: string,
): Promise<ModerationResult<{ id: string; postId: string; outcome: 'REMOVED' | 'KEPT' }>> {
  const db = await getDb()
  const found = await db
    .select({
      id: reports.id,
      postId: reports.postId,
      reason: reports.reason,
      handledAt: reports.handledAt,
      postTitle: posts.title,
    })
    .from(reports)
    .innerJoin(posts, eq(posts.id, reports.postId))
    .where(eq(reports.id, reportId))
    .limit(1)
  const report = found[0]
  if (!report) return fail(404, 'Segnalazione non trovata.')
  if (report.handledAt) return fail(409, 'Questa segnalazione è già stata gestita.')

  const cleanReason = reason?.trim() || ''

  if (outcome === 'REMOVED') {
    // Il motivo per chi ha pubblicato: quello scritto da chi modera, o il
    // motivo della segnalazione stessa, che di solito basta.
    const why = cleanReason || REPORT_REASONS[report.reason as ReportReason] || 'Segnalato da chi legge'
    const removed = await moderatePost(report.postId, 'remove', why, actor)
    if (!removed.ok) return removed
  } else {
    await db
      .update(reports)
      .set({ handledAt: new Date(), handledBy: actor.id, outcome: 'KEPT' })
      .where(eq(reports.id, reportId))
  }

  await writeLog(db, {
    actorId: actor.id,
    action: outcome === 'REMOVED' ? 'report.removed' : 'report.kept',
    targetType: 'REPORT',
    targetId: report.id,
    targetLabel: report.postTitle,
    reason: cleanReason || null,
  })

  return { ok: true, data: { id: report.id, postId: report.postId, outcome } }
}

/** Le segnalazioni, aperte o gia' gestite, con il titolo e chi le ha fatte. */
export async function listReports(options: { open: boolean; limit?: number }): Promise<ReportItem[]> {
  const db = await getDb()
  const limit = Math.min(Math.max(1, options.limit ?? 200), 500)
  const rows = await db
    .select({
      id: reports.id,
      postId: reports.postId,
      postTitle: posts.title,
      postStatus: posts.status,
      reporterName: users.name,
      reason: reports.reason,
      note: reports.note,
      createdAt: reports.createdAt,
      handledAt: reports.handledAt,
      outcome: reports.outcome,
    })
    .from(reports)
    .innerJoin(posts, eq(posts.id, reports.postId))
    .leftJoin(users, eq(users.id, reports.reporterId))
    .where(options.open ? isNull(reports.handledAt) : isNotNull(reports.handledAt))
    .orderBy(desc(reports.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    postTitle: row.postTitle,
    postStatus: row.postStatus,
    reporterName: row.reporterName ?? null,
    reason: (row.reason in REPORT_REASONS ? row.reason : 'OTHER') as ReportReason,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    handledAt: row.handledAt?.toISOString() ?? null,
    outcome: row.outcome === 'REMOVED' || row.outcome === 'KEPT' ? row.outcome : null,
  }))
}

/**
 * Gli annunci visti da chi modera: tutti, rimossi compresi, con l'autore e
 * quante segnalazioni aperte hanno. Il conteggio e' una sottoquery
 * correlata, non una query per riga.
 */
export async function listAdminPosts(options: {
  q?: string | null
  status?: string | null
  limit?: number
}): Promise<AdminPostItem[]> {
  const db = await getDb()
  const limit = Math.min(Math.max(1, options.limit ?? 50), 200)
  const conditions = []
  if (options.status && options.status !== 'ALL') conditions.push(eq(posts.status, options.status))
  const q = options.q?.trim()
  if (q) {
    const term = `%${q}%`
    const match = or(
      like(posts.title, term),
      like(posts.city, term),
      like(posts.petName, term),
      like(posts.description, term),
      like(users.name, term),
      like(users.email, term),
    )
    if (match) conditions.push(match)
  }

  // posts.id per esteso, per lo stesso motivo spiegato in searchUsers.
  const reportsOpen = sql<number>`(select count(*) from reports where reports.post_id = posts.id and reports.handled_at is null)`

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      kind: posts.kind,
      species: posts.species,
      status: posts.status,
      city: posts.city,
      authorId: posts.authorId,
      authorName: users.name,
      authorBannedAt: users.bannedAt,
      reportsOpen,
      moderationReason: posts.moderationReason,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    species: row.species,
    status: row.status,
    city: row.city,
    authorId: row.authorId,
    authorName: row.authorName,
    authorBanned: Boolean(row.authorBannedAt),
    reportsOpen: Number(row.reportsOpen ?? 0),
    moderationReason: row.moderationReason,
    createdAt: row.createdAt.toISOString(),
  }))
}

/**
 * Le persone, per nome o email, con i numeri che servono a decidere: quanti
 * annunci ha scritto e quante segnalazioni hanno ricevuto. Due sottoquery
 * correlate, cosi' cinquanta righe restano una query.
 */
export async function searchUsers(q: string | null | undefined, limit = 50): Promise<AdminUserItem[]> {
  const db = await getDb()
  const take = Math.min(Math.max(1, limit), 200)
  const term = q?.trim() ? `%${q.trim()}%` : null
  const match = term
    ? or(like(users.name, term), like(users.email, term), like(users.orgName, term))
    : undefined

  // Identificatori scritti per esteso, non ${users.id}: in una select senza
  // join drizzle rende la colonna come "id" nudo, che dentro la sottoquery
  // e' ambiguo con posts.id (o peggio, si risolve in silenzio su quello).
  const postsCount = sql<number>`(select count(*) from posts where posts.author_id = users.id)`
  const reportsReceived = sql<number>`(select count(*) from reports join posts on posts.id = reports.post_id where posts.author_id = users.id)`

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accountType: users.accountType,
      role: users.role,
      bannedAt: users.bannedAt,
      bannedReason: users.bannedReason,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
      lastClient: users.lastClient,
      postsCount,
      reportsReceived,
    })
    .from(users)
    .where(match)
    // Chi e' entrato da poco in cima; chi non e' mai entrato da quando la
    // colonna esiste in fondo, ordinato per iscrizione.
    .orderBy(sql`${users.lastSeenAt} is null`, desc(users.lastSeenAt), desc(users.createdAt))
    .limit(take)

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    accountType: row.accountType,
    role: asRole(row.role),
    bannedAt: row.bannedAt?.toISOString() ?? null,
    bannedReason: row.bannedReason,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    lastClient: row.lastClient ?? null,
    postsCount: Number(row.postsCount ?? 0),
    reportsReceived: Number(row.reportsReceived ?? 0),
  }))
}

/** Il registro, dal piu' recente. Chi ha agito e poi cancellato l'account resta senza nome. */
export async function listLog(limit = 100): Promise<ModerationLogEntry[]> {
  const db = await getDb()
  const take = Math.min(Math.max(1, limit), 500)
  const rows = await db
    .select({
      id: moderationLog.id,
      actorName: users.name,
      action: moderationLog.action,
      targetType: moderationLog.targetType,
      targetId: moderationLog.targetId,
      targetLabel: moderationLog.targetLabel,
      reason: moderationLog.reason,
      createdAt: moderationLog.createdAt,
    })
    .from(moderationLog)
    .leftJoin(users, eq(users.id, moderationLog.actorId))
    .orderBy(desc(moderationLog.createdAt))
    .limit(take)

  return rows.map((row) => ({
    id: row.id,
    actorName: row.actorName ?? 'Account cancellato',
    action: row.action,
    targetType: (row.targetType === 'POST' || row.targetType === 'USER' ? row.targetType : 'REPORT') as
      | 'POST'
      | 'USER'
      | 'REPORT',
    targetId: row.targetId,
    targetLabel: row.targetLabel,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  }))
}
