'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'

export type PendingRequest = {
  id: string
  message: string
  postId: string
  postTitle: string
  createdAt: Date
  who: {
    name: string
    accountType: string
    accountAgeDays: number
    published: number
  } | null
}

/**
 * Chi ti ha chiesto il contatto, e cosa si sa di lui.
 *
 * Non un punteggio e non un giudizio: due numeri asciutti, perche' un account
 * aperto stamattina che non ha mai pubblicato niente e' una cosa diversa da chi
 * e' qui da un anno, e chi deve rispondere ha il diritto di vedere la
 * differenza. A decidere e' lui, non il sito.
 */
export function ContactRequestList({ requests }: { requests: PendingRequest[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(id: string, accept: boolean) {
    setBusy(id)
    setError(null)
    try {
      const response = await fetch(`/api/contatti/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a registrare la risposta. Riprova.')
        return
      }
      router.refresh()
    } catch {
      setError('Non sono riuscito a registrare la risposta: controlla la connessione e riprova.')
    } finally {
      setBusy(null)
    }
  }

  if (requests.length === 0) {
    return (
      <p className="section-hint" style={{ margin: 0 }}>
        Nessuna richiesta in attesa.
      </p>
    )
  }

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      {requests.map((request) => (
        <div key={request.id} className="card" style={{ margin: 0 }}>
          <p className="small muted" style={{ margin: '0 0 6px' }}>
            su <strong>{request.postTitle}</strong>
          </p>
          <p style={{ margin: '0 0 8px' }}>{request.message}</p>
          {request.who && (
            <p className="small muted" style={{ margin: '0 0 10px' }}>
              {request.who.name}
              {request.who.accountType !== 'PERSON' && ' · ente'}
              {' · account da '}
              {request.who.accountAgeDays === 0
                ? 'oggi'
                : request.who.accountAgeDays === 1
                  ? 'un giorno'
                  : `${request.who.accountAgeDays} giorni`}
              {' · '}
              {request.who.published === 0
                ? 'non ha mai pubblicato'
                : `${request.who.published} annunci pubblicati`}
            </p>
          )}
          <div className="inline">
            <button
              type="button"
              className="btn small"
              onClick={() => decide(request.id, true)}
              disabled={busy === request.id}
            >
              Dagli il contatto
            </button>
            <button
              type="button"
              className="btn secondary small"
              onClick={() => decide(request.id, false)}
              disabled={busy === request.id}
            >
              No
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
