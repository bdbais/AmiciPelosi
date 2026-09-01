export const KINDS = {
  LOST: { label: 'Smarrito', emoji: '🔎', color: '#dc2626' },
  FOUND: { label: 'Ritrovato', emoji: '🐾', color: '#0891b2' },
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
  OTHER: { label: 'Altro', emoji: '🐾' },
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

export const MAX_PHOTOS = 5
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function kindLabel(kind: string) {
  return KINDS[kind as Kind]?.label ?? kind
}
export function speciesLabel(species: string) {
  return SPECIES[species as Species]?.label ?? species
}
