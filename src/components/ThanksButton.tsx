'use client'

import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'

type Target = { sightingId: string } | { contactRequestId: string }

/**
 * Il cuoricino.
 *
 * Lo vede solo chi ha pubblicato l'annuncio, accanto a chi l'ha aiutato. Un
 * clic e resta scritto: non si toglie, non si ripete, e non serve ricaricare
 * la pagina per vederlo cambiare. Se il server dice che era gia' fatto, per
 * chi guarda e' la stessa cosa di averlo appena fatto.
 */
export function ThanksButton({ target, done }: { target: Target; done: boolean }) {
  const [sent, setSent] = useState(done)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/grazie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a mandare il grazie. Riprova.')
        return
      }
      setSent(true)
    } catch {
      setError('Non sono riuscito a mandare il grazie: controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return <span className="thanks-done">❤️ Grazie inviato</span>
  }

  return (
    <span className="inline">
      <button type="button" className="btn ghost small thanks-btn" onClick={send} disabled={busy}>
        {busy ? 'Invio…' : '❤️ Grazie'}
      </button>
      {error && <span className="small" style={{ color: 'var(--lost)' }}>{error}</span>}
    </span>
  )
}
