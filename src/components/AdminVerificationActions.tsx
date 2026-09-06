'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'

/**
 * Approvare o rifiutare chi si e' dichiarato ente.
 *
 * Il motivo del rifiuto e' obbligatorio: e' la frase che la persona legge nel
 * profilo, e da cui capisce cosa portare la prossima volta («il link non
 * apre», «la pagina non parla di un gattile»). La nota di chi approva no:
 * e' un appunto per il registro, e quasi sempre non serve.
 */
export function AdminVerificationActions({ userId, rejected = false }: { userId: string; rejected?: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const noteOk = note.trim().length >= 3 && note.trim().length <= 300

  async function decide(decision: 'approve' | 'reject') {
    setError(null)
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/verifiche/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a registrare la decisione.')
        return
      }
      setMode('idle')
      setNote('')
      router.refresh()
    } catch {
      setError('Non sono riuscito a registrare la decisione. Controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'idle') {
    return (
      <div className="stack" style={{ gap: 8, marginTop: 8 }}>
        {error && <div className="alert error">{error}</div>}
        <div className="inline">
          <button type="button" className="btn small" onClick={() => setMode('approve')} disabled={busy}>
            Approva
          </button>
          {!rejected && (
            <button type="button" className="btn danger small" onClick={() => setMode('reject')} disabled={busy}>
              Rifiuta
            </button>
          )}
        </div>
      </div>
    )
  }

  const rejecting = mode === 'reject'
  return (
    <div className="stack" style={{ gap: 8, marginTop: 8 }}>
      {error && <div className="alert error">{error}</div>}
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor={`note-${userId}`}>
          {rejecting ? 'Motivo che leggerà la persona *' : 'Una nota per il registro (facoltativa)'}
        </label>
        <input
          id={`note-${userId}`}
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          disabled={busy}
          placeholder={rejecting ? 'Es. Il link non porta a una pagina del gattile' : ''}
        />
      </div>
      <div className="inline">
        <button
          type="button"
          className={`btn small${rejecting ? ' danger' : ''}`}
          onClick={() => decide(rejecting ? 'reject' : 'approve')}
          disabled={busy || (rejecting && !noteOk) || (!rejecting && note.trim().length > 300)}
        >
          {busy ? 'Attendi…' : rejecting ? 'Conferma il rifiuto' : 'Conferma l’approvazione'}
        </button>
        <button type="button" className="btn ghost small" onClick={() => setMode('idle')} disabled={busy}>
          Annulla
        </button>
      </div>
    </div>
  )
}
