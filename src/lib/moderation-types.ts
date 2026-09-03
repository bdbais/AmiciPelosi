/**
 * Il contratto della moderazione, condiviso fra server e interfaccia.
 *
 * Sta in un file a parte, senza import, perche' lo leggono componenti client
 * e rotte server: mettere questi tipi in moderation.ts, che tocca il
 * database, trascinerebbe il database dentro il bundle del browser.
 */

export const ROLES = {
  USER: 'Utente',
  MODERATOR: 'Moderatore',
  ADMIN: 'Amministratore',
} as const
export type Role = keyof typeof ROLES

/** I motivi con cui si segnala un annuncio: a scelta, mai testo libero da solo. */
export const REPORT_REASONS = {
  PEOPLE_IN_PHOTO: 'Nella foto ci sono persone, targhe o numeri civici',
  MONEY: 'Chiede o offre denaro',
  SALE: 'Sta vendendo un animale',
  OTHER: 'Altro (spiega in una riga)',
} as const
export type ReportReason = keyof typeof REPORT_REASONS

/** Cosa puo' fare chi modera su un annuncio. */
export type PostModerationAction = 'close' | 'remove' | 'reopen'
/** Cosa puo' fare chi modera su una persona. */
export type UserModerationAction = 'ban' | 'unban' | 'role'

export type ModerationLogEntry = {
  id: string
  actorName: string
  action: string
  targetType: 'POST' | 'USER' | 'REPORT'
  targetId: string
  targetLabel: string
  reason: string | null
  createdAt: string
}

export type ReportItem = {
  id: string
  postId: string
  postTitle: string
  postStatus: string
  reporterName: string | null
  reason: ReportReason
  note: string | null
  createdAt: string
  handledAt: string | null
  outcome: 'REMOVED' | 'KEPT' | null
}

export type AdminPostItem = {
  id: string
  title: string
  kind: string
  species: string
  status: string
  city: string
  authorId: string
  authorName: string
  authorBanned: boolean
  reportsOpen: number
  moderationReason: string | null
  createdAt: string
}

export type AdminUserItem = {
  id: string
  name: string
  email: string
  accountType: string
  role: Role
  bannedAt: string | null
  bannedReason: string | null
  createdAt: string
  /** Null per chi non e' mai entrato da quando esiste la colonna. */
  lastSeenAt: string | null
  /** 'APP' o 'SITO', null se non si sa ancora. */
  lastClient: string | null
  postsCount: number
  reportsReceived: number
}
