'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PostModerationAction } from '@/lib/moderation-types'
import { readJson, type ApiError } from '@/lib/http'

const LABELS: Record<PostModerationAction, { button: string; confirm: string; failure: string }> = {
  close: {
    button: 'Chiudi',
    confirm: 'Conferma la chiusura',
    failure: 'Non sono riuscito a chiudere l’annuncio.',
  },
  remove: {
    button: 'Rimuovi',
    confirm: 'Conferma la rimozione',
    failure: 'Non sono riuscito a rimuovere l’annuncio.',
  },
  reopen: {
    button: 'Riapri',
    confirm: 'Conferma la riapertura',
    failure: 'Non sono riuscito a riaprire l’annuncio.',
  },
}

/**
 * Chiudere, rimuovere o riaprire un annuncio da parte di chi modera.
 *
 * Il motivo e' obbligatorio per chiudere e rimuovere: e' la frase che
 * l'autore leggera' in cima al suo annuncio, e "rimosso" senza un perche'
 * e' la cosa che fa scrivere email arrabbiate. La conferma sta in linea e
 * non in una finestra del browser, che dentro l'app Android compare con la
 * faccia del sistema e a volte non compare affatto.
 */
export function AdminPostActions({ postId, status }: { postId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PostModerationAction | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const needsReason = pending === 'close' || pending === 'remove'
  const reasonOk = reason.trim().length >= 3 && reason.trim().length <= 300

  function start(action: PostModerationAction) {
    setError(null)
    setReason('')
    setPending(action)
  }

  async function confirm() {
    if (!pending) return
    if (needsReason && !reasonOk) {
      setError('Scrivi un motivo: da 3 a 300 caratteri.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: pending, reason: reason.trim() || undefined }),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? LABELS[pending].failure)
        return
      }
      setPending(null)
      router.refresh()
    } catch {
      setError(`${LABELS[pending].failure} Controlla la connessione e riprova.`)
    } finally {
      setBusy(false)
    }
  }

  const available: PostModerationAction[] = status === 'OPEN' ? ['close', 'remove'] : ['reopen']

  return (
    <div className="stack" style={{ gap: 6 }}>
      {error && (
        <div className="alert error" style={{ margin: 0 }}>
          {error}
        </div>
      )}
      {pending ? (
        <>
          {needsReason && (
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo che leggerà l’autore"
              aria-label="Motivo"
              maxLength={300}
              disabled={busy}
              autoFocus
            />
          )}
          <div className="inline" style={{ gap: 6 }}>
            <button
              type="button"
              className={`btn small${pending === 'remove' ? ' danger' : ''}`}
              onClick={confirm}
              disabled={busy || (needsReason && !reasonOk)}
            >
              {busy ? 'Attendi…' : LABELS[pending].confirm}
            </button>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setPending(null)}
              disabled={busy}
            >
              Annulla
            </button>
          </div>
        </>
      ) : (
        <div className="inline" style={{ gap: 6 }}>
          {available.map((action) => (
            <button
              key={action}
              type="button"
              className={`btn small ${action === 'remove' ? 'danger' : 'secondary'}`}
              onClick={() => start(action)}
              disabled={busy}
            >
              {LABELS[action].button}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
