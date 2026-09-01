/**
 * Dati di esempio per provare l'app: utenti, annunci in varie citta italiane,
 * foto segnaposto generate al volo e qualche avvistamento.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import sharp from 'sharp'

const prisma = new PrismaClient()

const PALETTE: Record<string, [string, string]> = {
  DOG: ['#f6c28b', '#c97b34'],
  CAT: ['#b6c8e8', '#5b7bb5'],
  BIRD: ['#bfe3c6', '#3f8f5c'],
  RABBIT: ['#e9c9df', '#a8629a'],
  OTHER: ['#dcd6cb', '#8a7f70'],
}

const PAW = `
  <g fill="rgba(255,255,255,0.92)">
    <ellipse cx="400" cy="380" rx="105" ry="86"/>
    <ellipse cx="278" cy="278" rx="49" ry="60" transform="rotate(-18 278 278)"/>
    <ellipse cx="522" cy="278" rx="49" ry="60" transform="rotate(18 522 278)"/>
    <ellipse cx="348" cy="188" rx="43" ry="56" transform="rotate(-8 348 188)"/>
    <ellipse cx="452" cy="188" rx="43" ry="56" transform="rotate(8 452 188)"/>
  </g>`

/** Immagine segnaposto: solo per popolare il prototipo. */
async function placeholderPhoto(species: string, caption: string) {
  const [from, to] = PALETTE[species] ?? PALETTE.OTHER
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="800" height="600" fill="url(#g)"/>
    ${PAW}
    <text x="400" y="530" font-family="sans-serif" font-size="34" font-weight="bold"
          fill="rgba(255,255,255,0.95)" text-anchor="middle">${caption}</text>
  </svg>`

  const { data, info } = await sharp(Buffer.from(svg))
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
  return {
    data: new Uint8Array(data),
    mimeType: "image/jpeg",
    width: info.width,
    height: info.height,
    position: 0,
  }
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

async function main() {
  console.log('Pulisco i dati esistenti…')
  await prisma.sighting.deleteMany()
  await prisma.photo.deleteMany()
  await prisma.post.deleteMany()
  await prisma.pushSubscription.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  const [giulia, marco, sara] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Giulia Rossi',
        email: 'giulia@example.it',
        phone: '333 1234567',
        passwordHash,
        alertLat: 41.8919,
        alertLng: 12.4693,
        alertCity: 'Roma',
        alertRadiusKm: 10,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Marco Bianchi',
        email: 'marco@example.it',
        phone: '347 7654321',
        passwordHash,
        alertLat: 45.4642,
        alertLng: 9.19,
        alertCity: 'Milano',
        alertRadiusKm: 5,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sara Conti',
        email: 'sara@example.it',
        phone: '340 9988776',
        passwordHash,
        alertLat: 40.8518,
        alertLng: 14.2681,
        alertCity: 'Napoli',
        alertRadiusKm: 20,
      },
    }),
  ])

  const posts = [
    {
      author: giulia,
      kind: 'LOST',
      title: 'Smarrito Pongo, meticcio marrone, zona Trastevere',
      species: 'DOG',
      breed: 'Meticcio',
      petName: 'Pongo',
      sex: 'M',
      ageRange: 'ADULTO',
      size: 'MEDIA',
      color: 'Marrone con macchia bianca sul petto',
      hasCollar: true,
      hasMicrochip: true,
      microchip: '380260012345678',
      neutered: true,
      vaccinated: true,
      description:
        'Pongo e scappato durante i fuochi d artificio di sabato sera. E molto timido con gli sconosciuti e tende a nascondersi sotto le auto parcheggiate.',
      extraNotes:
        'Non inseguitelo: si spaventa e scappa. Se lo vedete, sedetevi a terra e chiamatelo con voce bassa, oppure avvisatemi subito con la posizione.',
      address: 'Piazza Trilussa',
      city: 'Roma',
      province: 'RM',
      lat: 41.8896,
      lng: 12.4695,
      eventDate: daysAgo(3),
      createdAt: daysAgo(3),
      caption: 'Pongo',
    },
    {
      author: marco,
      kind: 'FOUND',
      title: 'Trovato gatto tigrato vicino al Parco Sempione',
      species: 'CAT',
      breed: 'Europeo',
      sex: 'F',
      ageRange: 'GIOVANE',
      size: 'PICCOLA',
      color: 'Tigrata grigia, punta della coda bianca',
      hasCollar: false,
      hasMicrochip: false,
      description:
        'Trovata ieri sera vicino all ingresso del parco. E in buona salute, molto affettuosa e affamata. Per ora la tengo io in casa, al sicuro.',
      extraNotes:
        'Sembra abituata a stare in appartamento. Chi la riconosce mi descriva un segno particolare prima di venire a prenderla.',
      address: 'Parco Sempione, ingresso Arco della Pace',
      city: 'Milano',
      province: 'MI',
      lat: 45.4756,
      lng: 9.1725,
      eventDate: daysAgo(1),
      createdAt: daysAgo(1),
      caption: 'Gattina tigrata',
    },
    {
      author: sara,
      kind: 'ADOPTION',
      title: 'Luna cerca casa: dolcissima, sterilizzata e vaccinata',
      species: 'DOG',
      breed: 'Meticcio taglia media',
      petName: 'Luna',
      sex: 'F',
      ageRange: 'ADULTO',
      size: 'MEDIA',
      color: 'Nera con petto bianco',
      hasMicrochip: true,
      neutered: true,
      vaccinated: true,
      goodWithKids: true,
      goodWithPets: true,
      description:
        'Luna ha circa 4 anni, e stata recuperata da una cucciolata di strada e vive in stallo da otto mesi. E equilibrata, cammina bene al guinzaglio e adora i bambini.',
      extraNotes:
        'Cerchiamo una famiglia con un po di spazio e tempo per le passeggiate. Affido con preaffido e controlli post adozione. Consegna in tutta la Campania.',
      address: 'Zona Vomero',
      city: 'Napoli',
      province: 'NA',
      lat: 40.8449,
      lng: 14.2298,
      eventDate: daysAgo(30),
      createdAt: daysAgo(6),
      caption: 'Luna',
    },
    {
      author: giulia,
      kind: 'LOST',
      title: 'Smarrito pappagallino verde in zona San Giovanni',
      species: 'BIRD',
      petName: 'Kiwi',
      sex: 'M',
      ageRange: 'GIOVANE',
      size: 'PICCOLA',
      color: 'Verde con testa gialla',
      description:
        'Kiwi e volato via da una finestra aperta martedi mattina. Non e abituato a stare fuori e risponde al suo nome fischiettando.',
      extraNotes:
        'Si posa spesso su balconi e tende da sole. Se lo vedete, provate a mettere una ciotola d acqua e avvisatemi.',
      address: 'Via Appia Nuova, altezza San Giovanni',
      city: 'Roma',
      province: 'RM',
      lat: 41.8848,
      lng: 12.5119,
      eventDate: daysAgo(2),
      createdAt: daysAgo(2),
      caption: 'Kiwi',
    },
    {
      author: marco,
      kind: 'ADOPTION',
      title: 'Due gattini di 3 mesi cercano famiglia (adozione di coppia)',
      species: 'CAT',
      breed: 'Europeo',
      sex: 'UNKNOWN',
      ageRange: 'CUCCIOLO',
      size: 'PICCOLA',
      color: 'Uno nero, uno bianco e rosso',
      vaccinated: true,
      goodWithKids: true,
      goodWithPets: true,
      description:
        'Fratellini trovati in un cortile a luglio. Sono svezzati, usano la lettiera e sono abituati alla presenza di persone. Li diamo solo insieme.',
      extraNotes: 'Prima vaccinazione fatta, sverminati. Richiesta zanzariera alle finestre.',
      address: 'Zona Navigli',
      city: 'Milano',
      province: 'MI',
      lat: 45.4498,
      lng: 9.1755,
      eventDate: daysAgo(10),
      createdAt: daysAgo(4),
      caption: 'Gattini in adozione',
    },
    {
      author: sara,
      kind: 'FOUND',
      title: 'Trovato coniglio nano in un giardino condominiale',
      species: 'RABBIT',
      sex: 'UNKNOWN',
      ageRange: 'ADULTO',
      size: 'PICCOLA',
      color: 'Bianco e marrone',
      description:
        'Girava spaventato nel cortile del palazzo. E chiaramente un animale domestico: si lascia prendere in braccio senza problemi.',
      extraNotes: 'Lo tengo in un box al chiuso. Cerco il proprietario prima di trovargli una casa.',
      address: 'Via Toledo',
      city: 'Napoli',
      province: 'NA',
      lat: 40.8419,
      lng: 14.2489,
      eventDate: daysAgo(5),
      createdAt: daysAgo(5),
      caption: 'Coniglietto',
    },
    {
      author: giulia,
      kind: 'LOST',
      title: 'Smarrita gatta rossa a Monteverde, risponde a Zoe',
      species: 'CAT',
      petName: 'Zoe',
      sex: 'F',
      ageRange: 'ADULTO',
      size: 'MEDIA',
      color: 'Rossa, occhi verdi',
      hasMicrochip: true,
      neutered: true,
      description:
        'Zoe e uscita dal terrazzo giovedi notte. Non e abituata alla strada, probabilmente si e nascosta in un garage o in un giardino della zona.',
      extraNotes:
        'Se sentite miagolare in un box o in una cantina, per favore controllate e chiamatemi a qualsiasi ora.',
      address: 'Via Fonteiana, Monteverde',
      city: 'Roma',
      province: 'RM',
      lat: 41.8798,
      lng: 12.4526,
      eventDate: daysAgo(1),
      createdAt: daysAgo(1),
      caption: 'Zoe',
    },
    {
      author: marco,
      kind: 'LOST',
      title: 'Smarrito Whisky, beagle, zona Bologna centro',
      species: 'DOG',
      breed: 'Beagle',
      petName: 'Whisky',
      sex: 'M',
      ageRange: 'ADULTO',
      size: 'MEDIA',
      color: 'Tricolore classico beagle',
      hasCollar: true,
      hasMicrochip: true,
      vaccinated: true,
      description:
        'Whisky ha seguito una traccia durante una passeggiata e si e allontanato ai Giardini Margherita. E goloso e si avvicina a chi ha del cibo.',
      extraNotes: 'Collare rosso con medaglietta e numero di telefono inciso.',
      address: 'Giardini Margherita',
      city: 'Bologna',
      province: 'BO',
      lat: 44.4813,
      lng: 11.3548,
      eventDate: daysAgo(7),
      createdAt: daysAgo(7),
      caption: 'Whisky',
    },
  ] as const

  console.log('Creo gli annunci…')
  const created = []
  for (const item of posts) {
    const photo = await placeholderPhoto(item.species, item.caption)
    const post = await prisma.post.create({
      data: {
        kind: item.kind,
        title: item.title,
        species: item.species,
        breed: 'breed' in item ? (item.breed ?? null) : null,
        petName: 'petName' in item ? (item.petName ?? null) : null,
        sex: 'sex' in item ? (item.sex ?? null) : null,
        ageRange: 'ageRange' in item ? (item.ageRange ?? null) : null,
        size: 'size' in item ? (item.size ?? null) : null,
        color: 'color' in item ? (item.color ?? null) : null,
        hasCollar: 'hasCollar' in item ? Boolean(item.hasCollar) : false,
        hasMicrochip: 'hasMicrochip' in item ? Boolean(item.hasMicrochip) : false,
        microchip: 'microchip' in item ? (item.microchip ?? null) : null,
        neutered: 'neutered' in item ? (item.neutered ?? null) : null,
        vaccinated: 'vaccinated' in item ? (item.vaccinated ?? null) : null,
        goodWithKids: 'goodWithKids' in item ? (item.goodWithKids ?? null) : null,
        goodWithPets: 'goodWithPets' in item ? (item.goodWithPets ?? null) : null,
        description: item.description,
        extraNotes: 'extraNotes' in item ? (item.extraNotes ?? null) : null,
        address: item.address,
        city: item.city,
        province: item.province,
        lat: item.lat,
        lng: item.lng,
        eventDate: item.eventDate,
        createdAt: item.createdAt,
        contactName: item.author.name,
        contactPhone: item.author.phone,
        contactEmail: item.author.email,
        authorId: item.author.id,
        photos: { create: [photo] },
      },
    })
    created.push(post)
  }

  console.log('Aggiungo qualche avvistamento…')
  await prisma.sighting.create({
    data: {
      postId: created[0].id,
      authorId: marco.id,
      message:
        'Mi sembra di averlo visto stamattina presto vicino al mercato di Porta Portese, correva verso il lungotevere.',
      lat: 41.8846,
      lng: 12.4756,
      address: 'Porta Portese, Roma',
      createdAt: daysAgo(1),
    },
  })
  await prisma.sighting.create({
    data: {
      postId: created[0].id,
      authorId: sara.id,
      message: 'Ho lasciato una ciotola d acqua sotto il ponte, tenete d occhio quella zona.',
      createdAt: daysAgo(0),
    },
  })

  console.log(`\n✅ Fatto: ${created.length} annunci, 3 utenti.`)
  console.log('Accedi con: giulia@example.it / marco@example.it / sara@example.it')
  console.log('Password: password123\n')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
