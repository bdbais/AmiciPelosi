import { NextResponse, after } from 'next/server'
import { getDb } from '@/db'
import { photos, posts } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { postSchema, triState, firstIssue } from '@/lib/validators'
import { processUpload } from '@/lib/images'
import { deletePhoto, putPhoto } from '@/lib/photoStorage'
import { nearbyRecipients, notifyNearbyUsers } from '@/lib/push'
import { listPosts } from '@/lib/queries'
import { MAX_PHOTOS } from '@/lib/constants'
import { crossOriginResponse, sameOrigin } from '@/lib/http'

/** Un numero dalla query string, o il valore di riserva se non e' un numero. */
function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value)
  return value !== null && Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const hasCenter =
    params.has('lat') && params.has('lng') && Number.isFinite(lat) && Number.isFinite(lng)

  const result = await listPosts({
    kind: params.get('kind'),
    species: params.get('species'),
    status: params.get('status') ?? 'OPEN',
    query: params.get('q'),
    center: hasCenter ? { lat, lng } : null,
    radiusKm: numberParam(params.get('radius'), 10),
    take: numberParam(params.get('take'), 60),
    skip: numberParam(params.get('skip'), 0),
  })

  return NextResponse.json({ posts: result })
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Accedi per pubblicare un annuncio' }, { status: 401 })
  }

  // Un tipo di contenuto sbagliato deve dire cos'e' sbagliato, non esplodere:
  // formData() lancia un TypeError, e chi integra si trova un 500 senza indizi.
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Invia il modulo come multipart/form-data: le foto viaggiano con esso.' },
      { status: 400 },
    )
  }

  const raw = Object.fromEntries(
    Array.from(form.entries()).filter(([, value]) => typeof value === 'string'),
  )
  const parsed = postSchema.safeParse({
    ...raw,
    hasMicrochip: raw.hasMicrochip === 'on' || raw.hasMicrochip === 'true',
    hasCollar: raw.hasCollar === 'on' || raw.hasCollar === 'true',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssue(parsed.error) },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Su una segnalazione senza vita non si caricano fotografie, mai: chi la
  // legge sta gia' ricevendo la peggiore notizia della settimana, e taglia,
  // colore, razza e il punto esatto bastano per sapere se andare a controllare.
  // Il controllo sta qui e non solo nel modulo, perche' e' qui che conta.
  const files =
    data.kind === 'FOUND_DEAD'
      ? []
      : form
          .getAll('photos')
          .filter((file): file is File => file instanceof File && file.size > 0)
          .slice(0, MAX_PHOTOS)

  const db = await getDb()

  const created = await db
    .insert(posts)
    .values({
      kind: data.kind,
      title: data.title,
      species: data.species,
      breed: data.breed || null,
      petName: data.petName || null,
      sex: data.sex || null,
      ageRange: data.ageRange || null,
      size: data.size || null,
      color: data.color || null,
      hasMicrochip: Boolean(data.hasMicrochip),
      microchip: data.microchip || null,
      hasCollar: Boolean(data.hasCollar),
      neutered: triState(data.neutered),
      vaccinated: triState(data.vaccinated),
      goodWithKids: triState(data.goodWithKids),
      goodWithPets: triState(data.goodWithPets),
      description: data.description,
      extraNotes: data.extraNotes || null,
      // La durata ha senso solo per uno stallo: altrove sarebbe rumore.
      fosterPeriod: data.kind === 'FOSTER' ? data.fosterPeriod || null : null,
      address: data.address,
      city: data.city,
      province: data.province || null,
      lat: data.lat,
      lng: data.lng,
      eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
      contactName: data.contactName,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      // Chiuso finche' non e' chi pubblica a dire il contrario.
      contactMode: data.contactOpen ? 'OPEN' : 'REQUEST',
      authorId: user.id,
    })
    .returning({ id: posts.id })

  const postId = created[0].id

  try {
    const processed = await Promise.all(files.map(processUpload))
    for (const [index, photo] of processed.entries()) {
      // L'id serve prima della scrittura: e anche la chiave nello storage.
      const id = crypto.randomUUID()
      const stored = await putPhoto(id, photo.data, photo.mimeType)
      try {
        await db.insert(photos).values({
          id,
          postId,
          mimeType: photo.mimeType,
          width: photo.width,
          height: photo.height,
          position: index,
          storageKey: stored.storageKey,
          data: stored.data ? Buffer.from(stored.data) : null,
        })
      } catch (error) {
        // La riga non c'e', quindi nessuno arrivera' mai a questa chiave:
        // meglio toglierla subito che lasciarla a pesare nello storage.
        await deletePhoto(stored.storageKey).catch(() => undefined)
        throw error
      }
    }
  } catch (error) {
    console.error('Salvataggio foto non riuscito:', error)
    // L'annuncio resta pubblicato: senza foto e meno utile, ma non inutile.
  }

  // Le notifiche partono dopo la risposta: chi ha appena pubblicato non deve
  // aspettare cento POST verso Google. Il numero che la pagina mostra e' la
  // stima di chi verra' avvisato, calcolata prima.
  const announced = {
    id: postId,
    kind: data.kind,
    title: data.title,
    species: data.species,
    city: data.city,
    lat: data.lat,
    lng: data.lng,
    authorId: user.id,
  }
  const recipients = await nearbyRecipients(announced).catch((error) => {
    console.error('Ricerca dei vicini non riuscita:', error)
    return []
  })
  after(() =>
    notifyNearbyUsers(announced, recipients).catch((error) => {
      console.error('Notifiche di prossimita non inviate:', error)
    }),
  )

  return NextResponse.json({ post: { id: postId }, notified: recipients.length }, { status: 201 })
}
