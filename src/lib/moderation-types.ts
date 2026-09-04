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
/**
 * Cosa puo' fare chi modera su una persona. Le ultime due riguardano i
 * dispositivi e il sospetto "somiglia a un bloccato": sbloccare i browser
 * da cui e' entrata, e dire "non e' la stessa persona".
 */
export type UserModerationAction = 'ban' | 'unban' | 'role' | 'unban_devices' | 'clear_suspect' | 'remove_logo'

/** Le parole per chi prova a entrare da un browser bloccato: le stesse su email e Google. */
export const DEVICE_BLOCKED_MESSAGE = 'Da questo dispositivo non è possibile usare Amici Pelosi.'

/** Su cosa si agisce, nel registro. */
export type LogTargetType = 'POST' | 'USER' | 'REPORT' | 'DEVICE' | 'IDEA'

export type ModerationLogEntry = {
  id: string
  actorName: string
  action: string
  targetType: LogTargetType
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
  /** Il tipo dichiarato e a che punto e' la verifica: NONE, PENDING, VERIFIED, REJECTED. */
  accountType: string
  accountStatus: string
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
  /** Il bloccato a cui somiglia (stesso browser o stessa rete), finche' chi modera non decide. */
  suspectOf: SuspectOf | null
  suspectReason: string | null
  /** Da quanti browser e' entrata. */
  devicesCount: number
  /** Almeno uno dei browser usati negli ultimi 90 giorni e' bloccato. */
  deviceBanned: boolean
  /** Ha caricato un logo, verificato o no: chi modera lo vede comunque, ed e' lui che puo' toglierlo. */
  hasLogo: boolean
}

/** "Somiglia a…": chi, e perche' quello era stato bloccato. */
export type SuspectOf = { id: string; name: string; bannedReason: string | null }

/** Chi si e' dichiarato ente e aspetta che qualcuno lo guardi, o e' stato rifiutato da poco. */
export type VerificationRequest = {
  id: string
  name: string
  email: string
  /** Il tipo dichiarato: quello che varra' con l'approvazione. */
  accountType: string
  accountStatus: 'PENDING' | 'REJECTED'
  /** Puo' mancare: chi si era dichiarato ente prima che esistesse la verifica non lo ha mai dato. */
  proofUrl: string | null
  /** Per le colonie feline: dove e' censita, al posto del link. */
  proofNote: string | null
  orgName: string | null
  orgAddress: string | null
  orgCity: string | null
  orgSite: string | null
  createdAt: string
  /** Per i rifiutati: il motivo, che la persona ha letto. */
  verificationNote: string | null
}

/** Le due decisioni su una richiesta di verifica. */
export type VerificationDecision = 'approve' | 'reject'

/** Dove sta un'idea: in attesa, decisa, in lavorazione, fatta, scartata. Lo cambia solo l'amministratore. */
export const IDEA_STATUSES = {
  OPEN: 'in attesa',
  DECIDED: 'decisa',
  IN_PROGRESS: 'in lavorazione',
  DONE: 'fatta',
  DROPPED: 'scartata',
} as const
export type IdeaStatus = keyof typeof IDEA_STATUSES

/** Il voto di una persona su un'idea: tre parole, niente stelline. */
export const IDEA_VOTES = {
  YES: 'La farei',
  LATER: 'Non ora',
  NO: 'Mai',
} as const
export type IdeaVoteValue = keyof typeof IDEA_VOTES

export type IdeaVoteItem = {
  userId: string
  userName: string
  value: IdeaVoteValue
  comment: string | null
  updatedAt: string
}

export type IdeaItem = {
  id: string
  title: string
  /** Markdown grezzo, come sta in IDEE.md o come l'ha scritto chi l'ha aggiunta. */
  body: string
  /** FILE se viene da IDEE.md, SITE se qualcuno l'ha scritta da qui. */
  source: 'FILE' | 'SITE'
  status: IdeaStatus
  /** Chi l'ha scritta dal sito; null per quelle del file o se l'account non c'e' piu'. */
  authorName: string | null
  createdAt: string
  counts: Record<IdeaVoteValue, number>
  votes: IdeaVoteItem[]
  /** Il voto di chi guarda, se c'e'. */
  myVote: { value: IdeaVoteValue; comment: string | null } | null
}
