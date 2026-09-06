/**
 * Le idee tenute da parte, e i voti di chi modera.
 *
 * IDEE.md resta la fonte per quelle scritte a mano: a ogni apertura della
 * pagina il JSON generato dal file viene riallineato nella tabella, titolo e
 * testo, mai lo stato ne' i voti. Le idee scritte dal sito vivono solo qui.
 *
 * Solo server: tocca il database. I tipi condivisi con l'interfaccia stanno
 * in moderation-types.ts.
 */
import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { ideaVotes, ideas, users } from '@/db/schema'
import { writeLog, type Actor, type ModerationResult } from './moderation'
import { IDEA_STATUSES, IDEA_VOTES, type IdeaItem, type IdeaStatus, type IdeaVoteItem, type IdeaVoteValue } from './moderation-types'
import ideasFromFile from './idee.generated.json'

type FileIdea = { id: string; title: string; body: string }
const FILE_IDEAS = ideasFromFile as FileIdea[]

const fail = (status: 400 | 403 | 404 | 409, error: string): ModerationResult<never> => ({ ok: false, error, status })

const asStatus = (value: string): IdeaStatus => (value in IDEA_STATUSES ? (value as IdeaStatus) : 'OPEN')
const asVote = (value: string): IdeaVoteValue => (value in IDEA_VOTES ? (value as IdeaVoteValue) : 'LATER')

/**
 * Porta nella tabella quello che sta in IDEE.md: inserisce le idee nuove,
 * riallinea titolo e testo di quelle cambiate, non tocca stato e voti.
 * Una lettura per idea: sono poche decine, e succede solo aprendo la pagina.
 * Un'idea sparita dal file (sezione tolta o rinominata) resta com'e', con i
 * suoi voti: cancellarla da soli butterebbe via un pezzo di storia.
 */
export async function syncIdeasFromFile(): Promise<void> {
  const db = await getDb()
  const now = new Date()
  for (const idea of FILE_IDEAS) {
    const [existing] = await db
      .select({ title: ideas.title, body: ideas.body })
      .from(ideas)
      .where(eq(ideas.id, idea.id))
      .limit(1)
    if (!existing) {
      await db.insert(ideas).values({ id: idea.id, title: idea.title, body: idea.body, source: 'FILE' })
    } else if (existing.title !== idea.title || existing.body !== idea.body) {
      await db.update(ideas).set({ title: idea.title, body: idea.body, updatedAt: now }).where(eq(ideas.id, idea.id))
    }
  }
}

/** L'ordine in cui si leggono gli stati: prima quelle su cui si deve ancora decidere. */
const STATUS_ORDER: Record<IdeaStatus, number> = { OPEN: 0, DECIDED: 1, IN_PROGRESS: 2, DONE: 3, DROPPED: 4 }

/**
 * Tutte le idee con i voti, per chi guarda. Due query in tutto: le idee con
 * chi le ha scritte, e tutti i voti con chi li ha dati; il raggruppamento si
 * fa in memoria. Ordine: per stato, poi per «la farei» decrescenti, poi le
 * piu' vecchie prima.
 */
export async function listIdeas(viewerId: string): Promise<IdeaItem[]> {
  const db = await getDb()
  const [rows, voteRows] = await Promise.all([
    db
      .select({
        id: ideas.id,
        title: ideas.title,
        body: ideas.body,
        source: ideas.source,
        status: ideas.status,
        authorName: users.name,
        createdAt: ideas.createdAt,
      })
      .from(ideas)
      .leftJoin(users, eq(users.id, ideas.createdBy))
      .orderBy(asc(ideas.createdAt)),
    db
      .select({
        ideaId: ideaVotes.ideaId,
        userId: ideaVotes.userId,
        userName: users.name,
        value: ideaVotes.value,
        comment: ideaVotes.comment,
        updatedAt: ideaVotes.updatedAt,
      })
      .from(ideaVotes)
      .innerJoin(users, eq(users.id, ideaVotes.userId))
      .orderBy(asc(ideaVotes.updatedAt)),
  ])

  const votesByIdea = new Map<string, IdeaVoteItem[]>()
  for (const vote of voteRows) {
    const list = votesByIdea.get(vote.ideaId) ?? []
    list.push({
      userId: vote.userId,
      userName: vote.userName,
      value: asVote(vote.value),
      comment: vote.comment,
      updatedAt: vote.updatedAt.toISOString(),
    })
    votesByIdea.set(vote.ideaId, list)
  }

  const items: IdeaItem[] = rows.map((row) => {
    const votes = votesByIdea.get(row.id) ?? []
    const counts: Record<IdeaVoteValue, number> = { YES: 0, LATER: 0, NO: 0 }
    for (const vote of votes) counts[vote.value] += 1
    const mine = votes.find((vote) => vote.userId === viewerId)
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      source: row.source === 'SITE' ? 'SITE' : 'FILE',
      status: asStatus(row.status),
      authorName: row.source === 'SITE' ? row.authorName : null,
      createdAt: row.createdAt.toISOString(),
      counts,
      votes,
      myVote: mine ? { value: mine.value, comment: mine.comment } : null,
    }
  })

  return items.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.counts.YES - a.counts.YES ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

/**
 * Quante idee in attesa questa persona non ha ancora votato. Serve alla riga
 * in cima a /admin, che si apre senza passare dalla sincronizzazione: per
 * questo si contano anche le idee del file che nella tabella non sono ancora
 * entrate, altrimenti il numero mentirebbe finche' qualcuno non apre Idee.
 */
export async function countIdeasToVote(userId: string): Promise<number> {
  const db = await getDb()
  const voted = db.select({ id: ideaVotes.ideaId }).from(ideaVotes).where(eq(ideaVotes.userId, userId))
  const [[open], known] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(ideas)
      .where(and(eq(ideas.status, 'OPEN'), notInArray(ideas.id, voted))),
    FILE_IDEAS.length > 0
      ? db
          .select({ id: ideas.id })
          .from(ideas)
          .where(
            inArray(
              ideas.id,
              FILE_IDEAS.map((idea) => idea.id),
            ),
          )
      : Promise.resolve([] as { id: string }[]),
  ])
  const knownIds = new Set(known.map((row) => row.id))
  const notYetSynced = FILE_IDEAS.filter((idea) => !knownIds.has(idea.id)).length
  return Number(open?.total ?? 0) + notYetSynced
}

/** Un'idea scritta dal sito. Lascia una riga nel registro, come ogni azione di chi modera. */
export async function createIdea(input: { title: string; body: string }, actor: Actor): Promise<ModerationResult<{ id: string }>> {
  const db = await getDb()
  const [created] = await db
    .insert(ideas)
    .values({ title: input.title, body: input.body, source: 'SITE', createdBy: actor.id })
    .returning({ id: ideas.id })
  await writeLog(db, {
    actorId: actor.id,
    action: 'idea.create',
    targetType: 'IDEA',
    targetId: created.id,
    targetLabel: input.title,
  })
  return { ok: true, data: { id: created.id } }
}

/**
 * Il voto di una persona, con il commento: uno per idea, e si sovrascrive.
 * Non va nel registro: e' un'opinione, non un intervento su qualcuno.
 */
export async function voteIdea(
  ideaId: string,
  input: { value: IdeaVoteValue; comment?: string | null },
  actor: Actor,
): Promise<ModerationResult> {
  const db = await getDb()
  const [idea] = await db.select({ id: ideas.id }).from(ideas).where(eq(ideas.id, ideaId)).limit(1)
  if (!idea) return fail(404, 'Questa idea non c’è più.')

  const comment = input.comment?.trim() || null
  await db
    .insert(ideaVotes)
    .values({ ideaId, userId: actor.id, value: input.value, comment })
    .onConflictDoUpdate({
      target: [ideaVotes.ideaId, ideaVotes.userId],
      set: { value: input.value, comment, updatedAt: new Date() },
    })
  return { ok: true, data: undefined }
}

/** Lo stato lo decide l'amministratore; chi chiama ha gia' controllato che lo sia. Nel registro: idea.status.<STATO>. */
export async function setIdeaStatus(ideaId: string, status: IdeaStatus, actor: Actor): Promise<ModerationResult> {
  if (actor.role !== 'ADMIN') return fail(403, 'Lo stato di un’idea lo cambia solo l’amministratore.')
  const db = await getDb()
  const [idea] = await db
    .select({ id: ideas.id, title: ideas.title, status: ideas.status })
    .from(ideas)
    .where(eq(ideas.id, ideaId))
    .limit(1)
  if (!idea) return fail(404, 'Questa idea non c’è più.')
  if (idea.status === status) return fail(409, `L’idea è già ${IDEA_STATUSES[status]}.`)

  await db.update(ideas).set({ status, updatedAt: new Date() }).where(eq(ideas.id, ideaId))
  await writeLog(db, {
    actorId: actor.id,
    action: `idea.status.${status}`,
    targetType: 'IDEA',
    targetId: ideaId,
    targetLabel: idea.title,
  })
  return { ok: true, data: undefined }
}
