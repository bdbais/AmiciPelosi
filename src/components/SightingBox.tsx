'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { reverseGeocode, useGeolocation } from '@/lib/useGeolocation'
import { ThankYou } from './ThankYou'
import { thankYou } from '@/lib/messages'
import { useSound } from './SoundProvider'
import { readJson, type ApiError } from '@/lib/http'

/**
 * "Guarda, qui c'e' un gatto che sembra il tuo."
 *
 * E' il gesto per cui esiste tutta l'app: uno riceve l'avviso, si guarda
 * attorno, riconosce l'animale della foto e lo dice. Deve costare pochi
 * secondi, quindi la posizione parte da sola appena si comincia a scrivere -
 * quando arriva il momento di inviare e' gia' li - e la foto si scatta con un
 * tocco, senza passare dalla galleria.
 */
export function SightingBox({ postId, canPost }: { postId: string; canPost: boolean }) {
  const router = useRouter()
  const { locate, loading } = useGeolocation()
  const [message, setMessage] = useState('')
  const [place, setPlace] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [thanks, setThanks] = useState<string | null>(null)
  const { playSuccess } = useSound()
  const asked = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)

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

  async function attachPosition() {
    const coords = await locate()
    if (!coords) return
    const resolved = await reverseGeocode(coords.lat, coords.lng)
    setPlace({
      lat: coords.lat,
      lng: coords.lng,
      address: [resolved?.address, resolved?.city].filter(Boolean).join(', '),
    })
  }

  /** Alla prima parola scritta chiediamo la posizione, una volta sola. */
  function onFirstKeystroke() {
    if (asked.current) return
    asked.current = true
    void attachPosition()
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

    const response = await fetch(`/api/posts/${postId}/sightings`, { method: 'POST', body })

    if (!response.ok) {
      const json = await readJson<ApiError>(response)
      setError(json.error ?? 'Non sono riuscito a inviare la segnalazione.')
      setSending(false)
      return
    }

    setMessage('')
    setPlace(null)
    setPhoto(null)
    if (fileInput.current) fileInput.current.value = ''
    setSending(false)
    setThanks(thankYou('sighting'))
    playSuccess()
    router.refresh()
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
        placeholder="Es. Qui in via Roma c e un gatto rosso che sembra il tuo, sta sotto le auto"
        maxLength={1000}
        required
        aria-label="Messaggio di segnalazione"
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
      />

      <div className="inline">
        <button
          type="button"
          className="btn secondary small"
          onClick={() => fileInput.current?.click()}
        >
          {photo ? '📷 Foto pronta' : '📷 Fotografalo'}
        </button>
        <button
          type="button"
          className="btn secondary small"
          onClick={attachPosition}
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
      <p className="small muted" style={{ margin: 0 }}>
        La posizione e la foto sono quello che fa la differenza: chi cerca sa dove correre e
        riconosce il suo animale senza doverti richiamare.
      </p>
    </form>
  )
}
