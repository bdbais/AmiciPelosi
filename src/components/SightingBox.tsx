'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { reverseGeocode, useGeolocation } from '@/lib/useGeolocation'
import { ThankYou } from './ThankYou'
import { thankYou } from '@/lib/messages'
import { useSound } from './SoundProvider'
import { readJson, type ApiError } from '@/lib/http'

export function SightingBox({ postId, canPost }: { postId: string; canPost: boolean }) {
  const router = useRouter()
  const { locate, loading } = useGeolocation()
  const [message, setMessage] = useState('')
  const [place, setPlace] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [thanks, setThanks] = useState<string | null>(null)
  const { playSuccess } = useSound()

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

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSending(true)

    const response = await fetch(`/api/posts/${postId}/sightings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        lat: place?.lat,
        lng: place?.lng,
        address: place?.address,
      }),
    })

    if (!response.ok) {
      const json = await readJson<ApiError>(response)
      setError(json.error ?? 'Non sono riuscito a inviare la segnalazione.')
      setSending(false)
      return
    }

    setMessage('')
    setPlace(null)
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
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Es. Visto stamattina verso le 8 in via Roma, si e allontanato verso il parco"
        maxLength={1000}
        required
        aria-label="Messaggio di segnalazione"
      />
      <div className="inline">
        <button type="button" className="btn secondary small" onClick={attachPosition} disabled={loading}>
          {loading ? 'Cerco…' : '📍 Allega la mia posizione'}
        </button>
        {place && <span className="small muted">{place.address || 'Posizione allegata'}</span>}
        <span className="spacer" />
        <button type="submit" className="btn small" disabled={sending || message.trim().length < 3}>
          {sending ? 'Invio…' : 'Invia segnalazione'}
        </button>
      </div>
    </form>
  )
}
