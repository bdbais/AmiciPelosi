'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { LocationField } from './LocationField'
import type { Coords } from '@/lib/useGeolocation'
import { AGE_RANGES, KINDS, MAX_PHOTOS, SEXES, SIZES, SPECIES } from '@/lib/constants'
import { resizeImageFile } from '@/lib/resizeImage'
import { useSound } from './SoundProvider'
import { readJson } from '@/lib/http'

type Preview = { file: File; url: string }

export function PostForm({ defaultContact }: { defaultContact: { name: string; phone: string } }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const { playSuccess } = useSound()

  const [kind, setKind] = useState<string>('LOST')
  const [species, setSpecies] = useState<string>('DOG')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [photos, setPhotos] = useState<Preview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [photoConsent, setPhotoConsent] = useState(false)

  const isAdoption = kind === 'ADOPTION'

  async function addPhotos(files: FileList | null) {
    if (!files) return
    const selected = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    // Alleggeriamo le foto qui: il server riceve gia immagini pronte.
    const next = await Promise.all(
      selected.map(async (file) => {
        const resized = await resizeImageFile(file)
        return { file: resized, url: URL.createObjectURL(resized) }
      }),
    )
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

    setSubmitting(true)
    try {
      const response = await fetch('/api/posts', { method: 'POST', body: formData })
      const json = await readJson<{ post: { id: string }; notified: number; error: string }>(
        response,
      )
      if (!response.ok || !json.post) {
        setError(json.error ?? 'Non sono riuscito a pubblicare l annuncio.')
        setSubmitting(false)
        return
      }
      playSuccess()
      router.push(`/annunci/${json.post.id}?pubblicato=1&avvisati=${json.notified ?? 0}`)
      router.refresh()
    } catch {
      setError('Errore di rete: riprova.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack">
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <h2>Di cosa si tratta?</h2>
        <p className="section-hint">Scegli il tipo di annuncio.</p>
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

        <div className="field" style={{ marginTop: 18 }}>
          <label htmlFor="title">Titolo dell annuncio *</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder={
              kind === 'LOST'
                ? 'Es. Smarrito meticcio marrone in zona Trastevere'
                : kind === 'FOUND'
                  ? 'Es. Trovato gatto tigrato vicino al parco'
                  : 'Es. Luna cerca casa: dolcissima e vaccinata'
            }
          />
        </div>
      </div>

      <div className="card">
        <h2>Foto</h2>
        <p className="section-hint">
          Una buona foto e la cosa piu utile di tutte: fino a {MAX_PHOTOS} immagini.
        </p>
        <div className="alert info">
          <strong>⚠️ Nelle foto deve esserci solo l animale.</strong> Non caricare immagini
          con persone, neanche di spalle o sullo sfondo, e nemmeno foto che mostrino
          targhe, citofoni o numeri civici. Servono a riconoscere il pelosetto, non a
          identificare chi c era intorno.
        </div>
        <div className="alert info">
          <strong>💶 Qui non si scambia denaro.</strong> Nessuna ricompensa per un
          ritrovamento, nessun compenso per uno stallo, nessuna vendita di animali. Non e
          questo lo scopo del sito.
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
        <button
          type="button"
          className="btn secondary"
          onClick={() => fileInput.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
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

      <div className="card">
        <h2>Zona</h2>
        <p className="section-hint">
          {kind === 'LOST'
            ? 'Dove e stato visto l ultima volta.'
            : kind === 'FOUND'
              ? 'Dove lo hai trovato.'
              : 'Dove si trova ora l animale.'}{' '}
          Serve anche per avvisare chi vive li vicino.
        </p>

        <LocationField
          value={coords}
          onChange={setCoords}
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
            {isAdoption ? 'Disponibile dal' : kind === 'LOST' ? 'Data dello smarrimento' : 'Data del ritrovamento'}
          </label>
          <input id="eventDate" name="eventDate" type="date" />
        </div>
      </div>

      <div className="card">
        <h2>Caratteristiche</h2>
        <p className="section-hint">Piu dettagli dai, piu e facile riconoscerlo.</p>

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

        <div className="row">
          <div className="field">
            <label htmlFor="petName">Nome (se lo conosci)</label>
            <input id="petName" name="petName" type="text" placeholder="Es. Luna" />
          </div>
          <div className="field">
            <label htmlFor="breed">Razza</label>
            <input id="breed" name="breed" type="text" placeholder="Es. meticcio, europeo…" />
          </div>
        </div>

        <div className="row-3">
          <div className="field">
            <label htmlFor="sex">Sesso</label>
            <select id="sex" name="sex" defaultValue="">
              <option value="">Non specificato</option>
              {Object.entries(SEXES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ageRange">Eta</label>
            <select id="ageRange" name="ageRange" defaultValue="">
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
            <select id="size" name="size" defaultValue="">
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
            type="text"
            placeholder="Es. marrone con macchia bianca sul petto"
          />
        </div>

        <div className="row">
          <div className="field">
            <label className="checkbox">
              <input type="checkbox" name="hasCollar" /> Indossa collare o pettorina
            </label>
            <label className="checkbox" style={{ marginTop: 10 }}>
              <input type="checkbox" name="hasMicrochip" /> Ha il microchip
            </label>
          </div>
          <div className="field">
            <label htmlFor="microchip">Numero microchip (se noto)</label>
            <input id="microchip" name="microchip" type="text" inputMode="numeric" />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="neutered">Sterilizzato</label>
            <select id="neutered" name="neutered" defaultValue="">
              <option value="">Non so</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="vaccinated">Vaccinato</label>
            <select id="vaccinated" name="vaccinated" defaultValue="">
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
              <select id="goodWithKids" name="goodWithKids" defaultValue="">
                <option value="">Non so</option>
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="goodWithPets">Va d accordo con altri animali</label>
              <select id="goodWithPets" name="goodWithPets" defaultValue="">
                <option value="">Non so</option>
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Racconta</h2>
        <div className="field">
          <label htmlFor="description">Descrizione *</label>
          <textarea
            id="description"
            name="description"
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
        <div className="field">
          <label htmlFor="extraNotes">Altre informazioni utili</label>
          <textarea
            id="extraNotes"
            name="extraNotes"
            maxLength={2000}
            placeholder="Terapie in corso, paure, come avvicinarlo, orari in cui e stato avvistato…"
          />
          <p className="hint">
            Se e spaventato, scrivi come avvicinarlo senza farlo scappare: aiuta molto chi lo incontra.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Contatti</h2>
        <p className="section-hint">Come farsi trovare da chi ha notizie.</p>
        <div className="row">
          <div className="field">
            <label htmlFor="contactName">Nome di riferimento *</label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              required
              defaultValue={defaultContact.name}
            />
          </div>
          <div className="field">
            <label htmlFor="contactPhone">Telefono</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={defaultContact.phone}
              placeholder="Es. 333 1234567"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="contactEmail">Email</label>
          <input id="contactEmail" name="contactEmail" type="email" />
          <p className="hint">I contatti sono visibili a chi apre l annuncio.</p>
        </div>
      </div>

      <label className="checkbox" style={{ marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={photoConsent}
          onChange={(event) => setPhotoConsent(event.target.checked)}
        />
        Confermo che nelle foto non compaiono persone, e che non sto chiedendo ne offrendo
        denaro.
      </label>

      <button type="submit" className="btn block" disabled={submitting || !photoConsent}>
        {submitting ? 'Pubblico…' : '🐾 Pubblica annuncio'}
      </button>
      <p className="hint" style={{ textAlign: 'center' }}>
        Chi ha attivato le notifiche nella zona ricevera un avviso. Leggi le{' '}
        <a href="/regole" style={{ textDecoration: 'underline' }}>
          regole di pubblicazione
        </a>
        .
      </p>
    </form>
  )
}
