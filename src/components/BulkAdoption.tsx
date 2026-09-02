'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { AGE_RANGES, MAX_PHOTOS, SEXES, SIZES, SPECIES } from '@/lib/constants'
import { resizeImageFile, UNREADABLE_PHOTO } from '@/lib/resizeImage'
import { readJson } from '@/lib/http'
import { LocationField } from './LocationField'
import type { Coords } from '@/lib/useGeolocation'

type Done = { id: string; name: string }

/**
 * Inserire venti gatti uno dopo l'altro.
 *
 * Il modulo normale chiede ogni volta indirizzo, comune, contatti e mappa: per
 * una famiglia che pubblica un annuncio all'anno va benissimo, per un gattile
 * con venti gatti da piazzare sono venti volte le stesse otto risposte, e
 * infatti non lo fa nessuno e i gatti restano su Facebook.
 *
 * Qui la parte che non cambia si scrive una volta e resta in cima; sotto gira
 * solo quello che cambia da un animale all'altro. Dopo ogni salvataggio il
 * modulo si svuota e il cursore torna sul nome, pronto per il prossimo.
 */
export function BulkAdoption({
  contact,
  place,
}: {
  contact: { name: string; phone: string; email: string; address: string; city: string }
  place: Coords | null
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [where, setWhere] = useState<Coords | null>(place)
  const [address, setAddress] = useState(contact.address)
  const [city, setCity] = useState(contact.city)
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([])
  const [done, setDone] = useState<Done[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function addPhotos(files: FileList | null) {
    if (!files) return
    const chosen = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    // Solo quello che esce dalla canvas, senza EXIF: quella illeggibile si scarta.
    const resized = await Promise.all(chosen.map((file) => resizeImageFile(file)))
    const next = resized
      .filter((file): file is File => file !== null)
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    if (next.length < chosen.length) setError(UNREADABLE_PHOTO)
    setPhotos((current) => [...current, ...next])
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!where) {
      setError('Indica dove si trovano: tocca il punto sulla mappa.')
      return
    }
    if (!city.trim()) {
      setError('Manca il comune.')
      return
    }

    const body = new FormData(event.currentTarget)
    body.set('kind', 'ADOPTION')
    body.set('lat', String(where.lat))
    body.set('lng', String(where.lng))
    body.set('address', address)
    body.set('city', city)
    body.set('contactName', contact.name)
    if (contact.phone) body.set('contactPhone', contact.phone)
    if (contact.email) body.set('contactEmail', contact.email)
    for (const photo of photos) body.append('photos', photo.file)

    setBusy(true)
    try {
      const response = await fetch('/api/posts', { method: 'POST', body })
      const json = await readJson<{ post: { id: string }; error: string }>(response)

      if (!response.ok || !json.post) {
        setError(json.error ?? 'Non sono riuscito a pubblicare.')
        return
      }

      const created = json.post
      const name = String(body.get('petName') || body.get('title') || 'senza nome')
      setDone((current) => [{ id: created.id, name }, ...current])

      // Si svuota solo la parte che cambia: zona e contatti restano in cima.
      formRef.current?.reset()
      for (const photo of photos) URL.revokeObjectURL(photo.url)
      setPhotos([])
      nameRef.current?.focus()
      router.refresh()
    } catch {
      setError('Non sono riuscito a pubblicare: controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Dove si trovano</h2>
        <p className="section-hint">
          Vale per tutti quelli che inserisci adesso. Se l’hai già scritto nel profilo, è già qui.
        </p>
        <div className="field-row">
          <label className="field">
            <span>Indirizzo o riferimento</span>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={200}
            />
          </label>
          <label className="field">
            <span>Comune</span>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={80}
            />
          </label>
        </div>
        <LocationField value={where} onChange={setWhere} radiusKm={2} emoji="🏛️" />
        <p className="hint">
          I contatti sono quelli della struttura: <strong>{contact.name}</strong>
          {contact.phone ? ` · ${contact.phone}` : ''}
          {contact.email ? ` · ${contact.email}` : ''}. Il recapito resta comunque nascosto: chi è
          interessato lo chiede e rispondete voi.
        </p>
      </div>

      <form ref={formRef} onSubmit={submit} className="card">
        <h2>Il prossimo</h2>
        {error && <div className="alert error">{error}</div>}

        <div className="field-row">
          <label className="field">
            <span>Nome *</span>
            <input ref={nameRef} type="text" name="petName" required maxLength={60} autoFocus />
          </label>
          <label className="field">
            <span>Specie *</span>
            <select name="species" defaultValue="CAT">
              {Object.entries(SPECIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.emoji} {value.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Sesso</span>
            <select name="sex" defaultValue="">
              <option value="">Non indicato</option>
              {Object.entries(SEXES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Età</span>
            <select name="ageRange" defaultValue="">
              <option value="">Non indicata</option>
              {Object.entries(AGE_RANGES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Taglia</span>
            <select name="size" defaultValue="">
              <option value="">Non indicata</option>
              {Object.entries(SIZES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Razza</span>
            <input type="text" name="breed" maxLength={60} placeholder="Europeo, meticcio…" />
          </label>
          <label className="field">
            <span>Colore e segni</span>
            <input type="text" name="color" maxLength={60} />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Sterilizzato</span>
            <select name="neutered" defaultValue="">
              <option value="">Non indicato</option>
              <option value="true">Sì</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="field">
            <span>Vaccinato</span>
            <select name="vaccinated" defaultValue="">
              <option value="">Non indicato</option>
              <option value="true">Sì</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="field">
            <span>Con i bambini</span>
            <select name="goodWithKids" defaultValue="">
              <option value="">Non so</option>
              <option value="true">Sì</option>
              <option value="false">Meglio di no</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Titolo dell’annuncio *</span>
          <input
            type="text"
            name="title"
            required
            maxLength={120}
            placeholder="Es. Nina cerca casa: due anni, dolcissima"
          />
        </label>

        <label className="field">
          <span>Com’è *</span>
          <textarea
            name="description"
            required
            maxLength={4000}
            rows={4}
            placeholder="Carattere, come si comporta con gli altri, cosa cercate per lui"
          />
        </label>

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
        <div className="inline">
          <button
            type="button"
            className="btn secondary small"
            onClick={() => fileInput.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
          >
            📷 Foto ({photos.length})
          </button>
          <span className="spacer" />
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Pubblico…' : 'Pubblica e passa al prossimo'}
          </button>
        </div>
        {photos.length > 0 && (
          <div className="photo-preview" style={{ marginTop: 12 }}>
            {photos.map((photo, index) => (
              <div className="item" key={photo.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`Foto ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(photo.url)
                    setPhotos((current) => current.filter((_, i) => i !== index))
                  }}
                  aria-label="Rimuovi foto"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </form>

      {done.length > 0 && (
        <div className="card">
          <h2>Pubblicati adesso ({done.length})</h2>
          <div className="stack" style={{ gap: 6 }}>
            {done.map((item) => (
              <Link key={item.id} href={`/annunci/${item.id}`} className="small">
                🐾 {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
