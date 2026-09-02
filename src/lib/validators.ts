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
  kind: z.enum(['LOST', 'FOUND', 'ADOPTION']),
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
  address: z.string().trim().min(3, 'Indica la zona').max(200),
  city: z.string().trim().min(2, 'Indica il comune').max(80),
  province: z.string().trim().max(60).optional().or(z.literal('')),
  lat: coord(-90, 90, 'Posizione non valida'),
  lng: coord(-180, 180, 'Posizione non valida'),
  eventDate: z.string().trim().optional().or(z.literal('')),
  contactName: z.string().trim().min(2, 'Indica un riferimento').max(60),
  contactPhone: z.string().trim().max(30).optional().or(z.literal('')),
  contactEmail: z.string().trim().max(120).optional().or(z.literal('')),
})

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
