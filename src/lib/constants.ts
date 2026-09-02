export const KINDS = {
  LOST: { label: 'Smarrito', emoji: '🔎', color: '#dc2626' },
  FOUND: { label: 'Ritrovato', emoji: '🐾', color: '#0891b2' },
  FOSTER: { label: 'Stallo', emoji: '🛏️', color: '#a16207' },
  ADOPTION: { label: 'Adozione', emoji: '🏡', color: '#16a34a' },
} as const

export type Kind = keyof typeof KINDS

// Nota: per la cavia non esiste un'emoji dedicata, si usa quella del topolino.
export const SPECIES = {
  DOG: { label: 'Cane', emoji: '🐕' },
  CAT: { label: 'Gatto', emoji: '🐈' },
  BIRD: { label: 'Uccello', emoji: '🦜' },
  RABBIT: { label: 'Coniglio', emoji: '🐇' },
  GECKO: { label: 'Geco', emoji: '🦎' },
  HAMSTER: { label: 'Criceto', emoji: '🐹' },
  GUINEA_PIG: { label: "Porcellino d'India", emoji: '🐁' },
  OTHER: { label: 'Altro', emoji: '🐢' },
} as const

export type Species = keyof typeof SPECIES

export const SEXES = { M: 'Maschio', F: 'Femmina', UNKNOWN: 'Non so' } as const
export const AGE_RANGES = {
  CUCCIOLO: 'Cucciolo',
  GIOVANE: 'Giovane',
  ADULTO: 'Adulto',
  ANZIANO: 'Anziano',
} as const
export const SIZES = { PICCOLA: 'Piccola', MEDIA: 'Media', GRANDE: 'Grande' } as const

export const RADIUS_OPTIONS = [2, 5, 10, 20, 50] as const

/**
 * Ogni quanto, al massimo, puo' squillare il telefono.
 *
 * Le novita' della zona si accumulano e partono insieme. Un avviso per ogni
 * annuncio, in una citta' grande, e' una sveglia ogni pochi minuti: chi la
 * riceve spegne le notifiche dopo due giorni e non le riaccende piu'.
 */
export const ALERT_INTERVALS = [
  { minutes: 5, label: '5 minuti' },
  { minutes: 10, label: '10 minuti' },
  { minutes: 30, label: '30 minuti' },
  { minutes: 60, label: "1 ora" },
  { minutes: 1440, label: '1 giorno' },
] as const

/** Chi apre l'account. Un ente scrive i propri dati una volta sola. */
export const ACCOUNT_TYPES = {
  PERSON: { label: 'Una persona', emoji: '👤', hint: 'Pubblichi per te, o per un animale che hai trovato.' },
  SHELTER_DOG: { label: 'Canile', emoji: '🏠', hint: 'Una struttura per cani, con piu animali da sistemare.' },
  SHELTER_CAT: { label: 'Gattile', emoji: '🐈', hint: 'Una struttura o una colonia felina.' },
  ASSOCIATION: { label: 'Associazione o rifugio', emoji: '🤝', hint: 'Volontari, protezione animali, rifugio.' },
} as const

export type AccountType = keyof typeof ACCOUNT_TYPES

export function isOrg(accountType: string | null | undefined) {
  return Boolean(accountType) && accountType !== 'PERSON'
}

export const MAX_PHOTOS = 5
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function kindLabel(kind: string) {
  return KINDS[kind as Kind]?.label ?? kind
}
export function speciesLabel(species: string) {
  return SPECIES[species as Species]?.label ?? species
}
