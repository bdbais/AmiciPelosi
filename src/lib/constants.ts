/** L'indirizzo pubblico del sito: e' scritto qui e in nessun altro posto del codice. */
export const SITE_URL = 'https://amicipelosi.pet'
export const SITE_HOST = 'amicipelosi.pet'

export const KINDS = {
  LOST: { label: 'Smarrito', emoji: '🔎', color: '#dc2626' },
  FOUND: { label: 'Ritrovato', emoji: '🐾', color: '#0891b2' },
  FOSTER: { label: 'Stallo', emoji: '🛏️', color: '#a16207' },
  ADOPTION: { label: 'Adozione', emoji: '🏡', color: '#16a34a' },
  /**
   * Le segnalazioni che nessuno vorrebbe scrivere.
   *
   * Servono a una cosa sola: far smettere di cercare. Chi cerca da tre
   * settimane e non sa niente sta peggio di chi sa. Il segno e un punto nero e
   * non un'emoji, perche' qui non c'e' niente da illustrare.
   */
  FOUND_DEAD: { label: 'Ritrovato senza vita', short: 'Senza vita', emoji: '●', color: '#4b4b4b' },
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

/** Non compare in bacheca se non lo si chiede: nessuno deve trovarcelo addosso. */
export const QUIET_KINDS: string[] = ['FOUND_DEAD']

/**
 * Come e finita.
 *
 * Prima si poteva chiudere un annuncio solo bene, e chi aveva smesso di sperare
 * aveva due sole scelte: lasciarlo aperto per sempre, o cancellarlo - e in quel
 * caso chi teneva gli occhi aperti restava a cercare un animale che non c'e'
 * piu. Le chiusure tristi non fanno festa: niente suono, niente coriandoli.
 */
export const OUTCOMES = {
  HOME: { label: 'È tornato a casa', happy: true },
  RETURNED: { label: 'Restituito alla sua famiglia', happy: true },
  ADOPTED: { label: 'Ha trovato casa', happy: true },
  FOSTERED: { label: 'Ha trovato uno stallo', happy: true },
  DIED: { label: 'Non ce l\'ha fatta', happy: false },
  GAVE_UP: { label: 'Ho smesso di cercare', happy: false },
  OTHER_END: { label: 'Chiudo per un altro motivo', happy: false },
} as const

export type Outcome = keyof typeof OUTCOMES

export function outcomeIsHappy(outcome: string | null | undefined) {
  return Boolean(outcome && OUTCOMES[outcome as Outcome]?.happy)
}

export const RADIUS_OPTIONS = [2, 5, 10, 20, 50] as const

/**
 * Ogni quanto, al massimo, puo' squillare il telefono.
 *
 * Le novita' della zona si accumulano e partono insieme. Un avviso per ogni
 * annuncio, in una citta' grande, e' una sveglia ogni pochi minuti: chi la
 * riceve spegne le notifiche dopo due giorni e non le riaccende piu'.
 */
export const ALERT_INTERVALS = [
  // Per chi cerca un animale suo, o per chi lo cerca di mestiere: lo squillo
  // ogni pochi minuti lo ha scelto lui, e sa cosa si sta chiedendo.
  { minutes: 1, label: '1 minuto', hint: 'Per chi vuole sapere subito.' },
  { minutes: 5, label: '5 minuti' },
  { minutes: 10, label: '10 minuti' },
  { minutes: 30, label: '30 minuti' },
  { minutes: 60, label: "1 ora" },
  { minutes: 1440, label: '1 giorno' },
] as const

/** Chi apre l'account. Un ente scrive i propri dati una volta sola. */
export const ACCOUNT_TYPES = {
  PERSON: { label: 'Una persona', emoji: '👤', hint: 'Pubblichi per te, o per un animale che hai trovato.' },
  /**
   * Chi tiene una colonia felina non e' un ente e non e' un gattile: e' una
   * persona che ogni giorno passa da un posto preciso e conosce i gatti che
   * ci vivono. Per i limiti vale come un privato; quello che cambia e' che
   * si sa dove sta, e che un gatto ritrovato li' vicino ha piu' probabilita'
   * di essere uno dei suoi.
   */
  COLONY: {
    label: 'Titolare di una colonia felina',
    emoji: '🐈‍⬛',
    hint: 'Ti prendi cura dei gatti di una colonia: indica dove sta.',
  },
  SHELTER_DOG: { label: 'Canile', emoji: '🏠', hint: 'Una struttura per cani, con piu animali da sistemare.' },
  SHELTER_CAT: { label: 'Gattile', emoji: '🐈', hint: 'Una struttura con piu gatti da sistemare.' },
  ASSOCIATION: { label: 'Associazione o rifugio', emoji: '🤝', hint: 'Volontari, protezione animali, rifugio.' },
  VET: {
    label: 'Veterinario',
    emoji: '🩺',
    hint: 'Chi ti sceglie puo darti la scheda sanitaria dei suoi animali.',
  },
} as const

export type AccountType = keyof typeof ACCOUNT_TYPES

/** Chi vale come un privato: una persona, e chi tiene una colonia felina. */
const PRIVATE_ACCOUNT_TYPES: string[] = ['PERSON', 'COLONY']

/**
 * Un ente: canile, gattile, associazione. Apre l'inserimento in blocco e la
 * parte gestionale delle schede. Chi tiene una colonia felina non ci rientra:
 * per i limiti e' un privato, anche se sul profilo si vede cosa fa.
 */
export function isOrg(accountType: string | null | undefined) {
  return Boolean(accountType) && !PRIVATE_ACCOUNT_TYPES.includes(accountType as string)
}

/** Il nome del tipo di account, da mettere accanto a un nome. */
export function accountTypeLabel(accountType: string | null | undefined) {
  return ACCOUNT_TYPES[accountType as AccountType]?.label ?? null
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

/**
 * In che punto della sua storia si trova un animale di casa.
 *
 * Nessuno di questi stati cancella qualcosa: cambiano solo dove compare la
 * scheda, e con che parole.
 */
export const PET_STATUSES = {
  ACTIVE: { label: 'Con me', hint: 'Vive con te adesso.' },
  ADOPTED: {
    label: 'Adottato',
    hint: 'Ha trovato la sua famiglia. Esce dall elenco di chi cerca casa e resta nel vostro storico.',
  },
  DECEASED: {
    label: 'Non c e piu',
    hint: 'La scheda resta, con il diario e le foto. Non si cancella niente.',
  },
} as const

export type PetStatus = keyof typeof PET_STATUSES

