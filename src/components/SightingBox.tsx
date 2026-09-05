'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { reverseGeocode, useGeolocation } from '@/lib/useGeolocation'
import { readPhotoPlace } from '@/lib/exifGps'
import { resizeImageFile, UNREADABLE_PHOTO } from '@/lib/resizeImage'
import { PermissionButton } from './PermissionButton'
import { ThankYou } from './ThankYou'
import { thankYou } from '@/lib/messages'
import { useSound } from './SoundProvider'
import { readJson, type ApiError } from '@/lib/http'

type Place = { lat: number; lng: number; address: string; from: 'device' | 'photo' }

/**
 * "Guarda, qui c'e' un gatto che sembra il tuo."
 *
 * E' il gesto per cui esiste tutta l'app: uno riceve l'avviso, si guarda
 * attorno, riconosce l'animale della foto e lo dice. Deve costare pochi
 * secondi, quindi la posizione parte da sola appena si comincia a scrivere -
 * quando arriva il momento di inviare e' gia' li - e la foto si scatta con un
 * tocco.
 */
export function SightingBox({ postId, canPost }: { postId: string; canPost: boolean }) {
  const router = useRouter()
  const { locate, loading, error: geoError } = useGeolocation()
  const [message, setMessage] = useState('')
  const [place, setPlace] = useState<Place | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [thanks, setThanks] = useState<string | null>(null)
  const { playSuccess } = useSound()
  const asked = useRef(false)
  // La posizione della foto ha la precedenza, ma il GPS del telefono puo
  // rispondere dopo: senza questo segno arriverebbe in ritardo e la coprirebbe.
  const fromPhoto = useRef(false)
  // Due ingressi separati e non uno solo: su Android «capture» apre la
  // fotocamera e basta, e chi aveva gia scattato di corsa non riusciva piu ad
  // allegare quello che aveva in mano.
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  if (!canPost) {
    return (
      <p className="muted small">
        <Link href="/accedi" style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>
          Accedi
        </Link>{' '}
        per segnalare un avvistamento.
      </p>
    )
  }

  async function describe(lat: number, lng: number, from: Place['from']) {
    const resolved = await reverseGeocode(lat, lng)
    setPlace({
      lat,
      lng,
      address: [resolved?.address, resolved?.city].filter(Boolean).join(', '),
      from,
    })
  }

  async function attachPosition(manual = false) {
    const coords = await locate()
    if (!coords) return
    if (fromPhoto.current && !manual) return
    fromPhoto.current = false
    await describe(coords.lat, coords.lng, 'device')
  }

  /** Alla prima parola scritta chiediamo la posizione, una volta sola. */
  function onFirstKeystroke() {
    if (asked.current) return
    asked.current = true
    void attachPosition()
  }

  /**
   * La foto sa dove e stata scattata meglio di quanto lo sappia il telefono
   * adesso: chi fotografa il gatto per strada e poi allega da casa manderebbe
   * tutti a casa sua. Se dentro c'e il GPS vince lui.
   */
  async function onPhotoChosen(file: File | null) {
    setError(null)
    if (!file) {
      setPhoto(null)
      return
    }
    // L'ordine conta: il GPS si legge dall'originale, perche' il passaggio
    // dalla canvas che segue butta via l'EXIF - e deve farlo, e' quello che
    // impedisce di caricare le coordinate di casa insieme alla foto.
    const shot = await readPhotoPlace(file)
    const resized = await resizeImageFile(file)
    if (!resized) {
      setPhoto(null)
      if (cameraInput.current) cameraInput.current.value = ''
      if (galleryInput.current) galleryInput.current.value = ''
      setError(UNREADABLE_PHOTO)
      return
    }
    setPhoto(resized)
    if (!shot) return
    fromPhoto.current = true
    await describe(shot.lat, shot.lng, 'photo')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSending(true)

    const body = new FormData()
    body.set('message', message)
    if (place) {
      body.set('lat', String(place.lat))
      body.set('lng', String(place.lng))
      body.set('address', place.address)
    }
    if (photo) body.append('photos', photo)

    try {
      const response = await fetch(`/api/posts/${postId}/sightings`, { method: 'POST', body })

      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a inviare la segnalazione.')
        return
      }

      setMessage('')
      setPlace(null)
      setPhoto(null)
      fromPhoto.current = false
      if (cameraInput.current) cameraInput.current.value = ''
      if (galleryInput.current) galleryInput.current.value = ''
      setThanks(thankYou('sighting'))
      playSuccess()
      router.refresh()
    } catch {
      setError('Non sono riuscito a inviare la segnalazione: controlla la connessione e riprova.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {error && <div className="alert error">{error}</div>}
      {thanks && <ThankYou message={thanks} autoHideMs={9000} />}
      <textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value)
          onFirstKeystroke()
        }}
        placeholder="Es. Qui in via Roma c’è un gatto rosso che sembra il tuo, sta sotto le auto"
        maxLength={1000}
        required
        aria-label="Messaggio di segnalazione"
      />

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => void onPhotoChosen(event.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void onPhotoChosen(event.target.files?.[0] ?? null)}
      />

      <div className="inline">
        <button
          type="button"
          className="btn secondary small"
          onClick={() => cameraInput.current?.click()}
        >
          📷 Fotografalo
        </button>
        <button
          type="button"
          className="btn secondary small"
          onClick={() => galleryInput.current?.click()}
        >
          🖼️ Dalla galleria
        </button>
        {photo && <span className="small muted">✓ {photo.name}</span>}
        <button
          type="button"
          className="btn secondary small"
          onClick={() => void attachPosition(true)}
          disabled={loading}
        >
          {loading ? 'Cerco…' : place ? '📍 Posizione allegata' : '📍 Allega la posizione'}
        </button>
        {place?.address && <span className="small muted">{place.address}</span>}
        <span className="spacer" />
        <button type="submit" className="btn small" disabled={sending || message.trim().length < 3}>
          {sending ? 'Invio…' : 'Invia'}
        </button>
      </div>
      {geoError && !place && (
        <div className="inline">
          <span className="small muted">{geoError}</span>
          <PermissionButton kind="geolocation" compact onGranted={() => void attachPosition(true)} />
        </div>
      )}
      {place?.from === 'photo' && (
        <p className="small muted" style={{ margin: 0 }}>
          Ho preso il punto dalla foto, cioè da dove l’hai scattata. Se non è quello giusto tocca
          «Posizione allegata» per usare dove sei adesso.
        </p>
      )}
      <p className="small muted" style={{ margin: 0 }}>
        La posizione e la foto sono quello che fa la differenza: chi cerca sa dove correre e
        riconosce il suo animale senza doverti richiamare.
      </p>
    </form>
  )
}
