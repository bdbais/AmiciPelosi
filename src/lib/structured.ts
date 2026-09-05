import { KINDS, SPECIES, type Kind, type Species } from './constants'

/**
 * Rappresentazione strutturata di un annuncio, pensata per essere letta da un
 * programma: un assistente che aiuta a cercare un animale, un aggregatore di
 * canili, uno script di un'associazione.
 *
 * Le chiavi sono in inglese e i valori normalizzati, cosi non serve
 * interpretare il testo libero per capire di cosa si tratta.
 */

export type StructuredPost = {
  id: string
  url: string
  /** lost | found | adoption */
  situation: string
  /** open | resolved */
  status: string
  headline: string
  animal: {
    species: string
    speciesLabel: string
    breed: string | null
    name: string | null
    sex: string | null
    ageRange: string | null
    size: string | null
    color: string | null
    microchipped: boolean
    microchipNumber: string | null
    wearingCollar: boolean
    neutered: boolean | null
    vaccinated: boolean | null
    goodWithChildren: boolean | null
    goodWithOtherPets: boolean | null
  }
  place: {
    address: string
    city: string
    province: string | null
    latitude: number
    longitude: number
  }
  /** Data dello smarrimento, del ritrovamento o di disponibilita all'adozione. */
  eventDate: string
  publishedAt: string
  resolvedAt: string | null
  description: string
  handlingNotes: string | null
  contact: {
    name: string
  }
  photos: string[]
}

const SITUATION: Record<string, string> = {
  LOST: 'lost',
  FOUND: 'found',
  ADOPTION: 'adoption',
}

type PostRow = {
  id: string
  kind: string
  status: string
  title: string
  species: string
  breed: string | null
  petName: string | null
  sex: string | null
  ageRange: string | null
  size: string | null
  color: string | null
  hasMicrochip: boolean
  microchip: string | null
  hasCollar: boolean
  neutered: boolean | null
  vaccinated: boolean | null
  goodWithKids: boolean | null
  goodWithPets: boolean | null
  description: string
  extraNotes: string | null
  address: string
  city: string
  province: string | null
  lat: number
  lng: number
  eventDate: Date
  createdAt: Date
  resolvedAt: Date | null
  contactName: string
}

export function toStructured(
  post: PostRow,
  photoIds: string[],
  origin: string,
): StructuredPost {
  return {
    id: post.id,
    url: `${origin}/annunci/${post.id}`,
    situation: SITUATION[post.kind] ?? post.kind.toLowerCase(),
    status: post.status === 'RESOLVED' ? 'resolved' : 'open',
    headline: post.title,
    animal: {
      species: post.species.toLowerCase(),
      speciesLabel: SPECIES[post.species as Species]?.label ?? post.species,
      breed: post.breed,
      name: post.petName,
      sex: post.sex ? post.sex.toLowerCase() : null,
      ageRange: post.ageRange ? post.ageRange.toLowerCase() : null,
      size: post.size ? post.size.toLowerCase() : null,
      color: post.color,
      microchipped: post.hasMicrochip,
      microchipNumber: post.microchip,
      wearingCollar: post.hasCollar,
      neutered: post.neutered,
      vaccinated: post.vaccinated,
      goodWithChildren: post.goodWithKids,
      goodWithOtherPets: post.goodWithPets,
    },
    place: {
      address: post.address,
      city: post.city,
      province: post.province,
      latitude: post.lat,
      longitude: post.lng,
    },
    eventDate: post.eventDate.toISOString(),
    publishedAt: post.createdAt.toISOString(),
    resolvedAt: post.resolvedAt ? post.resolvedAt.toISOString() : null,
    description: post.description,
    handlingNotes: post.extraNotes,
    /*
      Solo il nome di riferimento.

      Il telefono e l'email stavano qui dentro, e questo oggetto esce da
      /api/feed senza bisogno di entrare: una richiesta sola e chi passava si
      portava via i recapiti di tutti quelli che avevano perso un animale. La
      truffa del "ho il tuo cane, mandami i soldi del viaggio" comincia
      esattamente da un elenco cosi'. Ora il recapito si chiede, uno per uno,
      a chi ha pubblicato.
    */
    contact: {
      name: post.contactName,
    },
    photos: photoIds.map((id) => `${origin}/api/photos/${id}`),
  }
}

/**
 * Dati strutturati da mettere nella pagina dell'annuncio.
 * Usa il vocabolario di schema.org dove esiste ed espone il resto sotto una
 * chiave propria, invece di forzare i dati in un tipo che non li descrive.
 */
export function jsonLd(post: StructuredPost) {
  const kindLabel = KINDS[
    (Object.keys(SITUATION).find((k) => SITUATION[k] === post.situation) ?? 'LOST') as Kind
  ]?.label

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.headline,
    articleSection: kindLabel,
    datePublished: post.publishedAt,
    articleBody: post.description,
    url: post.url,
    image: post.photos,
    contentLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: post.place.address,
        addressLocality: post.place.city,
        addressRegion: post.place.province ?? undefined,
        addressCountry: 'IT',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: post.place.latitude,
        longitude: post.place.longitude,
      },
    },
    // Il dettaglio che schema.org non copre, in chiaro e senza ambiguita.
    'amicipelosi:report': {
      situation: post.situation,
      status: post.status,
      animal: post.animal,
      eventDate: post.eventDate,
      handlingNotes: post.handlingNotes,
    },
  }
}
