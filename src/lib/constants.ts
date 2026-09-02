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
  VET: {
    label: 'Veterinario',
    emoji: '🩺',
    hint: 'Chi ti sceglie puo darti la scheda sanitaria dei suoi animali.',
  },
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

/**
 * Le tre foto che servono davvero il giorno in cui sparisce.
 *
 * Una di muso e i due fianchi: chi lo incontra lo vede di lato, non in posa.
 * La quarta e il libretto, che e la cosa che si perde per prima.
 */
export const PET_PHOTO_SLOTS = {
  FRONT: {
    label: 'Il muso, di fronte',
    hint: 'Occhi ben visibili, alla sua altezza. E la foto con cui lo riconoscono.',
  },
  LEFT: {
    label: 'Il fianco sinistro',
    hint: 'Tutto il corpo, in piedi. Servono le macchie e le proporzioni.',
  },
  RIGHT: {
    label: 'Il fianco destro',
    hint: 'I due lati spesso non si somigliano: e da li che si distingue da un altro uguale.',
  },
  DOCUMENT: {
    label: 'Il libretto sanitario',
    hint: 'La pagina con i dati e il microchip. Cosi non la perdi piu.',
  },
} as const

export type PetPhotoSlot = keyof typeof PET_PHOTO_SLOTS

/** Il diario: quello che gli succede, giorno per giorno. */
export const PET_EVENT_KINDS = {
  VET: { label: 'Veterinario', emoji: '🩺' },
  VACCINE: { label: 'Vaccino', emoji: '💉' },
  TREATMENT: { label: 'Cura o terapia', emoji: '💊' },
  BIRTH: { label: 'Parto', emoji: '🍼' },
  BIRTHDAY: { label: 'Compleanno', emoji: '🎂' },
  ANNIVERSARY: { label: 'Anniversario', emoji: '🎉' },
  WEIGHT: { label: 'Peso e misure', emoji: '⚖️' },
  NOTE: { label: 'Appunto', emoji: '📝' },
} as const

export type PetEventKind = keyof typeof PET_EVENT_KINDS

/** Compleanni e anniversari tornano ogni anno; una visita no. */
export const RECURRING_EVENT_KINDS: PetEventKind[] = ['BIRTHDAY', 'ANNIVERSARY']

/** Le righe del diario che riguardano la salute, e solo quelle. */
export const MEDICAL_EVENT_KINDS: PetEventKind[] = ['VET', 'VACCINE', 'TREATMENT', 'BIRTH', 'WEIGHT']

/** Cosa vede chi ha la chiave: tutto, oppure la sola parte sanitaria. */
export const TRUST_SCOPES = {
  ALL: {
    label: 'Tutto',
    hint: 'La scheda intera e tutto il diario. Per chi vive con lui.',
  },
  MEDICAL: {
    label: 'Solo la parte sanitaria',
    hint: 'Identita, microchip, libretto e le visite. Niente appunti di famiglia.',
  },
} as const

export type TrustScope = keyof typeof TRUST_SCOPES
