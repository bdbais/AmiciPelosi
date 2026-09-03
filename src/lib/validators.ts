import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Inserisci il tuo nome').max(60),
  email: z.string().trim().toLowerCase().email('Email non valida'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri').max(200),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email non valida'),
  password: z.string().min(1, 'Inserisci la password'),
})

const coord = (min: number, max: number, msg: string) =>
  z.coerce.number().min(min, msg).max(max, msg)

export const postSchema = z.object({
  kind: z.enum(['LOST', 'FOUND', 'FOSTER', 'ADOPTION', 'FOUND_DEAD']),
  title: z.string().trim().min(3, 'Il titolo e troppo corto').max(120),
  species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'GECKO', 'HAMSTER', 'GUINEA_PIG', 'OTHER']),
  breed: z.string().trim().max(60).optional().or(z.literal('')),
  petName: z.string().trim().max(60).optional().or(z.literal('')),
  sex: z.enum(['M', 'F', 'UNKNOWN']).optional().or(z.literal('')),
  ageRange: z.enum(['CUCCIOLO', 'GIOVANE', 'ADULTO', 'ANZIANO']).optional().or(z.literal('')),
  size: z.enum(['PICCOLA', 'MEDIA', 'GRANDE']).optional().or(z.literal('')),
  color: z.string().trim().max(60).optional().or(z.literal('')),
  hasMicrochip: z.coerce.boolean().optional(),
  microchip: z.string().trim().max(40).optional().or(z.literal('')),
  hasCollar: z.coerce.boolean().optional(),
  neutered: z.enum(['true', 'false', '']).optional(),
  vaccinated: z.enum(['true', 'false', '']).optional(),
  goodWithKids: z.enum(['true', 'false', '']).optional(),
  goodWithPets: z.enum(['true', 'false', '']).optional(),
  description: z.string().trim().min(10, 'Descrivi l animale in almeno 10 caratteri').max(4000),
  extraNotes: z.string().trim().max(2000).optional().or(z.literal('')),
  /** Per quanto serve lo stallo: senza durata sarebbe un'adozione non detta. */
  fosterPeriod: z.string().trim().max(120).optional().or(z.literal('')),
  address: z.string().trim().min(3, 'Indica la zona').max(200),
  city: z.string().trim().min(2, 'Indica il comune').max(80),
  province: z.string().trim().max(60).optional().or(z.literal('')),
  lat: coord(-90, 90, 'Posizione non valida'),
  lng: coord(-180, 180, 'Posizione non valida'),
  eventDate: z.string().trim().optional().or(z.literal('')),
  contactName: z.string().trim().min(2, 'Indica un riferimento').max(60),
  contactPhone: z.string().trim().max(30).optional().or(z.literal('')),
  contactEmail: z.string().trim().max(120).email('Email non valida').optional().or(z.literal('')),
  /** Spuntata solo da chi sceglie di mostrare il recapito: di partenza e' chiuso. */
  contactOpen: z.union([z.literal('on'), z.literal('true'), z.boolean()]).optional(),
})

/** I dati di un canile, gattile o associazione: si scrivono una volta sola. */
export const orgSchema = z.object({
  accountType: z.enum(['PERSON', 'COLONY', 'SHELTER_DOG', 'SHELTER_CAT', 'ASSOCIATION', 'VET']),
  orgName: z.string().trim().max(120).optional().or(z.literal('')),
  orgAddress: z.string().trim().max(200).optional().or(z.literal('')),
  orgCity: z.string().trim().max(80).optional().or(z.literal('')),
  orgLat: z.coerce.number().min(-90).max(90).optional(),
  orgLng: z.coerce.number().min(-180).max(180).optional(),
  orgPhone: z.string().trim().max(30).optional().or(z.literal('')),
  orgEmail: z.string().trim().max(120).optional().or(z.literal('')),
  orgSite: z.string().trim().max(200).optional().or(z.literal('')),
  orgHours: z.string().trim().max(120).optional().or(z.literal('')),
  orgFacebook: z.string().trim().max(200).optional().or(z.literal('')),
  orgInstagram: z.string().trim().max(200).optional().or(z.literal('')),
}).refine(
  // Una colonia felina non ha un nome da struttura: ha un posto, e basta quello.
  (v) => ['PERSON', 'VET', 'COLONY'].includes(v.accountType) || (v.orgName ?? '').length >= 2,
  { path: ['orgName'], message: 'Indica il nome della struttura' },
)

export const sightingSchema = z.object({
  message: z.string().trim().min(3, 'Scrivi un messaggio').max(1000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  address: z.string().trim().max(200).optional().or(z.literal('')),
})

export const alertSettingsSchema = z.object({
  alertsEnabled: z.coerce.boolean(),
  alertLat: z.coerce.number().min(-90).max(90).optional(),
  alertLng: z.coerce.number().min(-180).max(180).optional(),
  alertRadiusKm: z.coerce.number().min(1).max(100),
  /** Ogni quanto, al massimo, puo squillare il telefono. */
  alertEveryMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  alertCity: z.string().trim().max(80).optional().or(z.literal('')),
})

/** I tri-stati arrivano dal form come stringa: '' significa "non specificato". */
export function triState(value?: string): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

/**
 * Il primo errore di validazione, detto in modo che si capisca quale campo.
 *
 * Zod da solo risponde "Required" e basta: chi riceve quella riga - una
 * persona davanti al modulo o chi sta collegando l'app - non sa da dove
 * ricominciare. Il nome del campo costa una parola e fa la differenza.
 */
export function firstIssue(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const issue = error.issues[0]
  if (!issue) return 'Dati non validi'
  const field = issue.path.join('.')
  return field ? `${field}: ${issue.message}` : issue.message
}

export const petSchema = z.object({
  name: z.string().trim().min(1, 'Come si chiama?').max(60),
  species: z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'GECKO', 'HAMSTER', 'GUINEA_PIG', 'OTHER']),
  breed: z.string().trim().max(60).optional().or(z.literal('')),
  sex: z.enum(['M', 'F', 'UNKNOWN']).optional().or(z.literal('')),
  birthDate: z.string().trim().max(20).optional().or(z.literal('')),
  color: z.string().trim().max(60).optional().or(z.literal('')),
  microchip: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  // La parte gestionale: serve a canili e gattili, e non disturba chi non la usa.
  intakeDate: z.string().trim().max(20).optional().or(z.literal('')),
  exitDate: z.string().trim().max(20).optional().or(z.literal('')),
  neutered: z.enum(['true', 'false', '']).optional(),
  vaccinated: z.enum(['true', 'false', '']).optional(),
  tested: z.string().trim().max(120).optional().or(z.literal('')),
  goodWithCats: z.enum(['true', 'false', '']).optional(),
  goodWithDogs: z.enum(['true', 'false', '']).optional(),
  goodWithKids: z.enum(['true', 'false', '']).optional(),
  careNotes: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const petEventSchema = z.object({
  kind: z.enum(['VET', 'VACCINE', 'TREATMENT', 'BIRTH', 'BIRTHDAY', 'ANNIVERSARY', 'WEIGHT', 'NOTE']),
  title: z.string().trim().min(2, 'Scrivi di cosa si tratta').max(120),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
  happenedAt: z.string().trim().min(4, 'Indica la data').max(20),
})

export const trustedPersonSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email non valida'),
})

/**
 * Il giorno brutto, dalla scheda di casa: la zona e' l'unica cosa obbligatoria,
 * il resto lo si prende dalla scheda. Sono gli stessi campi e le stesse regole
 * dell'annuncio, cosi' quello che vale nel modulo vale anche qui.
 */
export const lostPetSchema = postSchema
  .pick({ lat: true, lng: true, contactPhone: true })
  .extend({
    address: postSchema.shape.address.optional().or(z.literal('')),
    city: postSchema.shape.city.optional().or(z.literal('')),
    description: postSchema.shape.description.optional().or(z.literal('')),
    contactName: postSchema.shape.contactName.optional().or(z.literal('')),
  })

/**
 * La segnalazione di un annuncio. Il motivo si sceglie da un elenco; il testo
 * libero e' obbligatorio solo per "altro", perche' altrimenti chi modera si
 * trova "altro" e basta, e non sa cosa guardare.
 */
export const reportSchema = z
  .object({
    postId: z.string().trim().min(1, 'Annuncio mancante').max(80),
    reason: z.enum(['PEOPLE_IN_PHOTO', 'MONEY', 'SALE', 'OTHER']),
    note: z.string().trim().max(300, 'La nota è troppo lunga: bastano tre righe').optional().or(z.literal('')),
  })
  .refine((v) => v.reason !== 'OTHER' || (v.note ?? '').length >= 3, {
    path: ['note'],
    message: 'Spiega in una riga cosa non va',
  })

/** Il motivo di un intervento: chi lo subisce lo legge, quindi non puo' essere una lettera. */
const moderationReason = z.string().trim().min(3, 'Scrivi il motivo').max(300, 'Il motivo è troppo lungo')

export const adminPostActionSchema = z
  .object({
    action: z.enum(['close', 'remove', 'reopen']),
    reason: moderationReason.optional().or(z.literal('')),
  })
  .refine((v) => v.action === 'reopen' || (v.reason ?? '').length >= 3, {
    path: ['reason'],
    message: 'Scrivi il motivo: lo leggerà chi ha pubblicato',
  })

export const adminUserActionSchema = z
  .object({
    action: z.enum(['ban', 'unban', 'role', 'unban_devices', 'clear_suspect']),
    reason: moderationReason.optional().or(z.literal('')),
    role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(),
    /** Con il blocco, bloccare anche i browser da cui e' entrata: da li' non si registra piu' nessuno. */
    banDevices: z.boolean().optional(),
  })
  .refine((v) => v.action !== 'ban' || (v.reason ?? '').length >= 3, {
    path: ['reason'],
    message: 'Scrivi il motivo: lo leggerà la persona bloccata',
  })
  .refine((v) => v.action !== 'role' || Boolean(v.role), {
    path: ['role'],
    message: 'Indica il ruolo',
  })

export const adminReportOutcomeSchema = z.object({
  outcome: z.enum(['REMOVED', 'KEPT']),
  reason: moderationReason.optional().or(z.literal('')),
})

/** base64url -> byte, senza dipendere dal modulo delle push (che e' solo server). */
function base64urlBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    return Uint8Array.from([...binary].map((char) => char.charCodeAt(0)))
  } catch {
    return null
  }
}

/**
 * Un'iscrizione push come la manda il browser. I controlli sui byte non sono
 * pignoleria: una chiave della lunghezza sbagliata fa fallire la cifratura a
 * ogni invio, per sempre, e nessuno se ne accorge finche' non suona niente.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(1024, 'Endpoint troppo lungo')
    .url()
    .refine((url) => url.startsWith('https://'), 'L endpoint deve essere https'),
  keys: z.object({
    // Chiave pubblica P-256 non compressa: 65 byte, il primo e' 0x04.
    p256dh: z.string().refine((value) => {
      const bytes = base64urlBytes(value)
      return bytes !== null && bytes.length === 65 && bytes[0] === 4
    }, 'Chiave p256dh non valida'),
    auth: z.string().refine((value) => base64urlBytes(value)?.length === 16, 'Segreto auth non valido'),
  }),
})
