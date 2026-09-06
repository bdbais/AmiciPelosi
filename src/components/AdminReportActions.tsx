'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'

/**
 * I due esiti di una segnalazione: l'annuncio va via, o resta.
 *
 * Il motivo della rimozione parte precompilato con la descrizione della
 * segnalazione, perche' quasi sempre e' proprio quello; ma chi modera lo
 * legge e lo puo' cambiare, visto che e' la frase che l'autore si trovera'
 * davanti.
 */
export function AdminReportActions({
  reportId,
  suggestedReason,
}: {
  reportId: string
  suggestedReason: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [reason, setReason] = useState(suggestedReason)
  const [error, setError] = useState<string | null>(null)

  async function decide(outcome: 'REMOVED' | 'KEPT') {
    setError(null)
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, reason: outcome === 'REMOVED' ? reason.trim() : undefined }),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a registrare la decisione.')
        return
      }
      router.refresh()
    } catch {
      setError('Non sono riuscito a registrare la decisione. Controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 8, marginTop: 8 }}>
      {error && <div className="alert error">{error}</div>}
      {removing ? (
        <>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`reason-${reportId}`}>Motivo che leggerà l’autore</label>
            <input
              id={`reason-${reportId}`}
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
              disabled={busy}
            />
          </div>
          <div className="inline">
            <button
              type="button"
              className="btn small"
              onClick={() => decide('REMOVED')}
              disabled={busy || reason.trim().length < 3}
            >
              {busy ? 'Attendi…' : 'Conferma la rimozione'}
            </button>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setRemoving(false)}
              disabled={busy}
            >
              Annulla
            </button>
          </div>
        </>
      ) : (
        <div className="inline">
          <button
            type="button"
            className="btn danger small"
            onClick={() => setRemoving(true)}
            disabled={busy}
          >
            Rimuovi l’annuncio
          </button>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => decide('KEPT')}
            disabled={busy}
          >
            {busy ? 'Attendi…' : 'Lascia com’è'}
          </button>
        </div>
      )}
    </div>
  )
}
