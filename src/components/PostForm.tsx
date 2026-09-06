'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LocationField } from './LocationField'
import type { Home } from './PlacePicker'
import type { Coords } from '@/lib/useGeolocation'
import {
  AGE_RANGES,
  KINDS,
  MAX_PHOTOS,
  SEXES,
  SIZES,
  SPECIES,
  type Kind,
  type Species,
} from '@/lib/constants'
import { resizeImageFile, UNREADABLE_PHOTO } from '@/lib/resizeImage'
import { useSound } from './SoundProvider'
import { readJson } from '@/lib/http'

type Preview = { file: File; url: string }

/** Un annuncio gia' pubblicato, per riaprirlo e correggerlo. */
export type PostInitial = {
  id: string
  kind: string
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
  fosterPeriod: string | null
  address: string
  city: string
  province: string | null
  lat: number
  lng: number
  eventDate: string
  contactName: string
  contactPhone: string | null
  contactEmail: string | null
  contactMode: string
  photos: { id: string }[]
}

/** I tre stati che nel modulo sono una tendina: si', no, non lo so. */
function triText(value: boolean | null | undefined) {
  return value === true ? 'true' : value === false ? 'false' : ''
}

/**
 * Il titolo che scriveremmo noi: «Gatto smarrito a Monselice».
 *
 * Il titolo e' il campo su cui ci si blocca: si sa cosa e' successo ma non
 * come si dice in una riga. Lo componiamo da tipo, specie e comune, e chi
 * vuole lo cambia. Per «Altro» non sappiamo che animale e': resta «Animale».
 */
function suggestTitle(kind: string, species: string, city: string) {
  const animal =
    species !== 'OTHER' && species in SPECIES ? SPECIES[species as Species].label : 'Animale'
  const what =
    kind === 'LOST'
      ? `${animal} smarrito`
      : kind === 'FOUND'
        ? `${animal} trovato`
        : kind === 'FOUND_DEAD'
          ? `${animal} trovato senza vita`
          : kind === 'FOSTER'
            ? `${animal} cerca uno stallo`
            : `${animal} in adozione`
  const where = city.trim()
  return where ? `${what} a ${where}` : what
}

export function PostForm({
  defaultContact,
  initial,
  defaultKind,
  home,
}: {
  defaultContact: { name: string; phone: string }
  initial?: PostInitial
  /** Il tipo con cui aprire il modulo: viene dalla scelta in /nuovo. */
  defaultKind?: string
  /** La zona salvata nel profilo, per il tasto «La mia zona» sulla mappa. */
  home?: Home | null
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const { playSuccess } = useSound()

  const [kind, setKind] = useState<string>(initial?.kind ?? defaultKind ?? 'LOST')
  // Correggendo si puo' ancora cambiare tipo, ma i tasti compaiono solo a
  // chi lo chiede: il caso e' raro e la fila di tasti in cima confondeva tutti.
  const [changingKind, setChangingKind] = useState(false)
  const [species, setSpecies] = useState<string>(initial?.species ?? 'DOG')
  const [coords, setCoords] = useState<Coords | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null,
  )
  const [address, setAddress] = useState(initial?.address ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [province, setProvince] = useState(initial?.province ?? '')
  const [title, setTitle] = useState(
    initial?.title ?? suggestTitle(initial?.kind ?? defaultKind ?? 'LOST', 'DOG', ''),
  )
  // Finche' nessuno lo tocca, il titolo segue tipo, specie e comune. Chi lo
  // scrive a mano non se lo vede riscrivere sotto le dita; chi lo svuota
  // del tutto torna a farselo proporre.
  const [titleTouched, setTitleTouched] = useState(Boolean(initial))
  const [photos, setPhotos] = useState<Preview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Chi corregge un annuncio la spunta l'ha gia' data quando l'ha pubblicato.
  const [photoConsent, setPhotoConsent] = useState(Boolean(initial))
  const [contactOpen, setContactOpen] = useState(initial?.contactMode === 'OPEN')
  // Il blocco dei contatti parte chiuso se il nome c'e' gia' (viene dal
  // profilo): si riapre da solo se il browser trova un campo obbligatorio vuoto.
  const [contactsOpen, setContactsOpen] = useState(
    !(initial?.contactName ?? defaultContact.name).trim(),
  )
  /** Le fotografie gia' pubblicate che si e' deciso di togliere. */
  const [dropped, setDropped] = useState<string[]>([])
  const editing = Boolean(initial)
  const kept = (initial?.photos ?? []).filter((photo) => !dropped.includes(photo.id))

  const isAdoption = kind === 'ADOPTION'
  const sighting = kind === 'LOST' || kind === 'FOUND'
  const kindInfo = KINDS[kind as Kind]

  useEffect(() => {
    if (!titleTouched) setTitle(suggestTitle(kind, species, city))
  }, [kind, species, city, titleTouched])

  async function addPhotos(files: FileList | null) {
    if (!files) return
    const selected = Array.from(files).slice(0, MAX_PHOTOS - photos.length - kept.length)
    // Alleggeriamo le foto qui: il server riceve gia immagini pronte, e senza
    // l'EXIF con le coordinate. Quella che non si riesce a leggere si scarta.
    const resized = await Promise.all(selected.map((file) => resizeImageFile(file)))
    const next = resized
      .filter((file): file is File => file !== null)
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    if (next.length < selected.length) setError(UNREADABLE_PHOTO)
    setPhotos((current) => [...current, ...next])
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].url)
      return current.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!coords) {
      setError('Indica la zona: usa il GPS o tocca il punto sulla mappa.')
      return
    }

    const formData = new FormData(event.currentTarget)
    formData.set('lat', String(coords.lat))
    formData.set('lng', String(coords.lng))
    for (const photo of photos) formData.append('photos', photo.file)
    for (const id of dropped) formData.append('removePhotos', id)

    setSubmitting(true)
    try {
      // Una correzione non e' una pubblicazione: non riparte l'avviso di zona,
      // altrimenti chi sistema un refuso sveglia mezzo quartiere una seconda volta.
      const response = await fetch(
        initial ? `/api/posts/${initial.id}` : '/api/posts',
        { method: initial ? 'PATCH' : 'POST', body: formData },
      )
      const json = await readJson<{ post: { id: string }; notified: number; error: string }>(
        response,
      )
      if (!response.ok || !json.post) {
        setError(
          json.error ??
            (initial
              ? 'Non sono riuscito a salvare le correzioni.'
              : 'Non sono riuscito a pubblicare l annuncio.'),
        )
        setSubmitting(false)
        return
      }
      playSuccess()
      router.push(
        initial
          ? `/annunci/${json.post.id}?corretto=1`
          : `/annunci/${json.post.id}?pubblicato=1&avvisati=${json.notified ?? 0}`,
      )
      router.refresh()
    } catch {
      setError('Errore di rete: riprova.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      {error && <div className="alert error">{error}</div>}

      {/*
        Il tipo e' gia' stato scelto, in /nuovo: qui si vede e basta. Il campo
        parte lo stesso, nascosto, perche' il server lo legge dal modulo.
      */}
      {changingKind ? (
        <div className="segmented">
          {Object.entries(KINDS).map(([key, value]) => (
            <span key={key}>
              <input
                type="radio"
                name="kind"
                id={`kind-${key}`}
                value={key}
                checked={kind === key}
                onChange={() => setKind(key)}
              />
              <label htmlFor={`kind-${key}`}>
                {value.emoji} {value.label}
              </label>
            </span>
          ))}
        </div>
      ) : (
        <div className="kind-badge">
          <input type="hidden" name="kind" value={kind} />
          <span className={`badge ${kind}`}>
            {kind === 'FOUND_DEAD' ? <span className="quiet-dot" aria-hidden="true" /> : kindInfo?.emoji}{' '}
            {kindInfo?.label ?? kind}
          </span>
          {editing ? (
            <button type="button" className="linkish small" onClick={() => setChangingKind(true)}>
              cambia
            </button>
          ) : (
            <Link href="/nuovo" className="small" style={{ textDecoration: 'underline' }}>
              cambia
            </Link>
          )}
        </div>
      )}

      {kind === 'FOUND_DEAD' ? (
        <div className="card quiet-card">
          <h2>
            <span className="quiet-dot" aria-hidden="true" /> Niente fotografie
          </h2>
          <p className="section-hint" style={{ margin: 0 }}>
            Su questa segnalazione non si caricano immagini, e non è una svista: chi la legge sta
            cercando il proprio animale da giorni. Bastano <strong>tipo di animale, taglia,
            colore, razza</strong> e il punto esatto — sono quelli che gli fanno capire se deve
            andare a controllare.
          </p>
        </div>
      ) : (
      <div className="card">
        <h2>Foto</h2>
        <p className="section-hint">
          Una buona foto e la cosa piu utile di tutte: fino a {MAX_PHOTOS} immagini.
        </p>
        <div className="alert info">
          <strong>⚠️ Nelle foto solo l’animale.</strong> Niente persone, neanche di spalle o
          sullo sfondo; niente targhe, citofoni o numeri civici.{' '}
          <strong>💶 Qui non si scambia denaro:</strong> nessuna ricompensa, nessun compenso per
          uno stallo, nessuna vendita.
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void addPhotos(event.target.files)
            event.target.value = ''
          }}
        />
        {kept.length > 0 && (
          <>
            <p className="section-hint" style={{ marginBottom: 6 }}>
              Già pubblicate:
            </p>
            <div className="photo-preview">
              {kept.map((photo) => (
                <div className="item" key={photo.id}>
                  <img src={`/api/photos/${photo.id}`} alt="Foto dell’annuncio" />
                  <button
                    type="button"
                    onClick={() => setDropped((current) => [...current, photo.id])}
                    aria-label="Togli questa foto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        <button
          type="button"
          className="btn secondary"
          onClick={() => fileInput.current?.click()}
          disabled={photos.length + kept.length >= MAX_PHOTOS}
        >
          📷 Aggiungi foto
        </button>
        {photos.length > 0 && (
          <div className="photo-preview">
            {photos.map((photo, index) => (
              <div className="item" key={photo.url}>
                <img src={photo.url} alt={`Foto ${index + 1}`} />
                <button type="button" onClick={() => removePhoto(index)} aria-label="Rimuovi foto">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="card">
        <h2>Che animale è</h2>
        <div className="field">
          <span className="label">Specie *</span>
          <div className="segmented">
            {Object.entries(SPECIES).map(([key, value]) => (
              <span key={key}>
                <input
                  type="radio"
                  name="species"
                  id={`species-${key}`}
                  value={key}
                  checked={species === key}
                  onChange={() => setSpecies(key)}
                />
                <label htmlFor={`species-${key}`}>
                  {value.emoji} {value.label}
                </label>
              </span>
            ))}
          </div>
        </div>

        {/*
          Il nome dell'animale, non quello di chi scrive: le due etichette si
          confondevano. Per uno stallo o un'adozione il nome sta nella
          descrizione, dove gia' lo raccontano.
        */}
        {sighting && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="petName">Come si chiama l’animale, se lo sai</label>
            <input
              id="petName"
              name="petName"
              defaultValue={initial?.petName ?? undefined}
              type="text"
              placeholder="Es. Luna"
            />
          </div>
        )}
      </div>

      <div className="card">
        <h2>Dove</h2>
        <p className="section-hint">
          {kind === 'LOST'
            ? 'Dove e stato visto l ultima volta.'
            : kind === 'FOUND' || kind === 'FOUND_DEAD'
              ? 'Dove lo hai trovato.'
              : 'Dove si trova ora l animale.'}{' '}
          Serve anche per avvisare chi vive li vicino.
        </p>

        <LocationField
          value={coords}
          onChange={setCoords}
          home={home}
          onAddressResolved={(resolved) => {
            if (resolved.address) setAddress(resolved.address)
            if (resolved.city) setCity(resolved.city)
            if (resolved.province) setProvince(resolved.province)
          }}
        />

        <div className="row" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="address">Indirizzo o riferimento *</label>
            <input
              id="address"
              name="address"
              type="text"
              required
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Via, quartiere o punto di riferimento"
            />
          </div>
          <div className="field">
            <label htmlFor="city">Comune *</label>
            <input
              id="city"
              name="city"
              type="text"
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Es. Roma"
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="province">Provincia o zona</label>
            <input
              id="province"
              name="province"
              type="text"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="eventDate">
              {isAdoption
                ? 'Disponibile dal'
                : kind === 'LOST'
                  ? 'Quando è sparito'
                  : kind === 'FOSTER'
                    ? 'Da quando'
                    : 'Quando lo hai trovato'}
            </label>
            <input id="eventDate" name="eventDate" type="date" defaultValue={initial?.eventDate} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Racconta</h2>
        <div className="field">
          <label htmlFor="title">Titolo dell’annuncio *</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setTitleTouched(event.target.value.trim().length > 0)
            }}
          />
          <p className="hint">Lo abbiamo proposto noi: cambialo se vuoi.</p>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="description">Descrizione *</label>
          <textarea
            id="description"
            name="description"
            defaultValue={initial?.description}
            required
            minLength={10}
            maxLength={4000}
            placeholder={
              isAdoption
                ? 'Com e il suo carattere, con chi sta bene, che casa gli serve…'
                : 'Come si comporta con gli sconosciuti, se si spaventa, com era il collare…'
            }
          />
        </div>
      </div>

      {/*
        Tutto quello che aiuta a riconoscerlo ma che nessuno deve compilare per
        forza. Chiuso: chi ha fretta pubblica con sei campi, chi ha tempo apre
        e aggiunge. I nomi dei campi sono quelli di sempre, il server non se ne accorge.
      */}
      <details className="fold">
        <summary>
          <span>
            Altri dettagli
            <span className="sub">Razza, taglia, colore, microchip…</span>
          </span>
        </summary>
        <div className="fold-body">
          <div className="row">
            <div className="field">
              <label htmlFor="breed">Razza</label>
              <input id="breed" name="breed" defaultValue={initial?.breed ?? undefined} type="text" placeholder="Es. meticcio, europeo…" />
            </div>
            <div className="field">
              <label htmlFor="sex">Sesso</label>
              <select id="sex" name="sex" defaultValue={initial?.sex ?? ''}>
                <option value="">Non specificato</option>
                {Object.entries(SEXES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="ageRange">Età</label>
              <select id="ageRange" name="ageRange" defaultValue={initial?.ageRange ?? ''}>
                <option value="">Non specificata</option>
                {Object.entries(AGE_RANGES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="size">Taglia</label>
              <select id="size" name="size" defaultValue={initial?.size ?? ''}>
                <option value="">Non specificata</option>
                {Object.entries(SIZES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="color">Colore e segni particolari</label>
            <input
              id="color"
              name="color"
              defaultValue={initial?.color ?? undefined}
              type="text"
              placeholder="Es. marrone con macchia bianca sul petto"
            />
          </div>

          <div className="row">
            <div className="field">
              <label className="checkbox">
                <input type="checkbox" name="hasCollar" defaultChecked={initial?.hasCollar} /> Indossa collare o pettorina
              </label>
              <label className="checkbox" style={{ marginTop: 10 }}>
                <input type="checkbox" name="hasMicrochip" defaultChecked={initial?.hasMicrochip} /> Ha il microchip
              </label>
            </div>
            <div className="field">
              <label htmlFor="microchip">Numero microchip (se noto)</label>
              <input id="microchip" name="microchip" defaultValue={initial?.microchip ?? undefined} type="text" inputMode="numeric" />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="neutered">Sterilizzato</label>
              <select id="neutered" name="neutered" defaultValue={triText(initial?.neutered)}>
                <option value="">Non so</option>
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="vaccinated">Vaccinato</label>
              <select id="vaccinated" name="vaccinated" defaultValue={triText(initial?.vaccinated)}>
                <option value="">Non so</option>
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          {isAdoption && (
            <div className="row">
              <div className="field">
                <label htmlFor="goodWithKids">Va d accordo con i bambini</label>
                <select id="goodWithKids" name="goodWithKids" defaultValue={triText(initial?.goodWithKids)}>
                  <option value="">Non so</option>
                  <option value="true">Si</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="goodWithPets">Va d accordo con altri animali</label>
                <select id="goodWithPets" name="goodWithPets" defaultValue={triText(initial?.goodWithPets)}>
                  <option value="">Non so</option>
                  <option value="true">Si</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          )}

          {kind === 'FOSTER' && (
            <div className="field">
              <label htmlFor="fosterPeriod">Per quanto tempo</label>
              <input
                id="fosterPeriod"
                name="fosterPeriod"
                type="text"
                maxLength={120}
                defaultValue={initial?.fosterPeriod ?? undefined}
                placeholder="Es. due mesi, o finché non si fa vivo il padrone"
              />
              <p className="hint">
                Uno stallo senza una durata è un’adozione non detta: scrivila anche se è
                approssimativa, chi si offre ha bisogno di sapere a cosa dice di sì.
              </p>
            </div>
          )}

          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="extraNotes">Altre informazioni utili</label>
            <textarea
              id="extraNotes"
              name="extraNotes"
              defaultValue={initial?.extraNotes ?? undefined}
              maxLength={2000}
              placeholder="Terapie in corso, paure, come avvicinarlo, orari in cui e stato avvistato…"
            />
            <p className="hint">
              Se e spaventato, scrivi come avvicinarlo senza farlo scappare: aiuta molto chi lo incontra.
            </p>
          </div>
        </div>
      </details>

      <details
        className="fold"
        open={contactsOpen}
        onToggle={(event) => setContactsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            Come vuoi essere contattato
            <span className="sub">Il tuo nome, telefono, email</span>
          </span>
        </summary>
        <div className="fold-body">
          <div className="row">
            <div className="field">
              <label htmlFor="contactName">Il tuo nome, per chi ti contatta *</label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                required
                defaultValue={initial?.contactName ?? defaultContact.name}
                onInvalid={() => setContactsOpen(true)}
              />
            </div>
            <div className="field">
              <label htmlFor="contactPhone">Telefono</label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                defaultValue={initial?.contactPhone ?? defaultContact.phone}
                placeholder="Es. 333 1234567"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="contactEmail">Email</label>
            <input
              id="contactEmail"
              name="contactEmail"
              defaultValue={initial?.contactEmail ?? undefined}
              type="email"
              onInvalid={() => setContactsOpen(true)}
            />
          </div>

          {/*
            La scelta che conta piu' di tutte le altre in questo modulo.

            Di partenza il recapito non lo vede nessuno: chi ha notizie te lo
            chiede e decidi tu. L'altra strada esiste perche' qualcuno la vuole -
            in una ricerca disperata un minuto conta - ma va spiegata per quello
            che e', non nascosta dietro una parola gentile.
          */}
          <label className="checkbox" style={{ marginTop: 6 }}>
            <input
              type="checkbox"
              name="contactOpen"
              checked={contactOpen}
              onChange={(event) => setContactOpen(event.target.checked)}
            />
            Mostra subito il mio numero a chi è entrato nel sito
          </label>
          <p className="hint" style={{ marginTop: 6 }}>
            {contactOpen
              ? 'Attenzione: lo vedrà chiunque abbia un account, e un numero dato non si può più riprendere. Ti possono arrivare telefonate da chi finge di aver trovato il tuo animale per chiederti dei soldi: non mandare mai niente prima di averlo visto.'
              : 'Consigliato. Il tuo numero resta nascosto: chi ha notizie ti scrive due righe, tu leggi chi è e decidi se dargli il contatto. Gli avvistamenti con foto e posizione ti arrivano comunque, senza bisogno di chiedere niente.'}
          </p>
        </div>
      </details>

      {kind !== 'FOUND_DEAD' && (
        <label className="checkbox" style={{ marginBottom: 14 }}>
          <input
            type="checkbox"
            checked={photoConsent}
            onChange={(event) => setPhotoConsent(event.target.checked)}
          />
          Confermo che nelle foto non compaiono persone, e che non sto chiedendo né offrendo
          denaro.
        </label>
      )}

      <button
        type="submit"
        className="btn block"
        disabled={submitting || (kind !== 'FOUND_DEAD' && !photoConsent)}
      >
        {submitting
          ? editing
            ? 'Salvo…'
            : 'Pubblico…'
          : editing
            ? '💾 Salva le correzioni'
            : '🐾 Pubblica annuncio'}
      </button>
      <p className="hint" style={{ textAlign: 'center' }}>
        {editing
          ? 'Le correzioni non fanno ripartire l’avviso di zona: chi ti segue non viene svegliato una seconda volta. '
          : 'Chi ha attivato le notifiche nella zona ricevera un avviso. '}
        Leggi le{' '}
        <a href="/regole" style={{ textDecoration: 'underline' }}>
          regole di pubblicazione
        </a>
        .
      </p>
    </form>
  )
}
