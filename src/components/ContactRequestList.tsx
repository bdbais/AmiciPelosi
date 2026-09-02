'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { readJson, type ApiError } from '@/lib/http'
import { accountTypeLabel } from '@/lib/constants'
import { ThanksButton } from './ThanksButton'

export type PendingRequest = {
  id: string
  message: string
  postId: string
  postTitle: string
  createdAt: Date
  thankedAt: Date | null
  fromUserId: string
  who: {
    name: string
    accountType: string
    accountAgeDays: number
    published: number
    thanks: number
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
export function ContactRequestList({
  requests,
  accepted = [],
}: {
  requests: PendingRequest[]
  /** Quelle a cui hai gia' detto di si': da qui parte il grazie. */
  accepted?: PendingRequest[]
}) {
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

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      {requests.length === 0 && (
        <p className="section-hint" style={{ margin: 0 }}>
          Nessuna richiesta in attesa.
        </p>
      )}
      {requests.map((request) => (
        <div key={request.id} className="card" style={{ margin: 0 }}>
          <RequestHeader request={request} />
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

      {accepted.length > 0 && (
        <>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            <strong>A chi l&apos;hai dato.</strong> Se poi ti ha aiutato davvero, diglielo: un grazie
            è l&apos;unica cosa che qui si può ricevere, e resta sul suo profilo.
          </p>
          {accepted.map((request) => (
            <div key={request.id} className="card" style={{ margin: 0 }}>
              <RequestHeader request={request} />
              <ThanksButton
                target={{ contactRequestId: request.id }}
                done={request.thankedAt != null}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/** Chi chiede e su cosa. Il nome porta al profilo pubblico, dove non c'e' nessun recapito. */
function RequestHeader({ request }: { request: PendingRequest }) {
  const who = request.who
  return (
    <>
      <p className="small muted" style={{ margin: '0 0 6px' }}>
        su <strong>{request.postTitle}</strong>
      </p>
      <p style={{ margin: '0 0 8px' }}>{request.message}</p>
      {who && (
        <p className="small muted" style={{ margin: '0 0 10px' }}>
          <Link href={`/persone/${request.fromUserId}`} className="person-link">
            {who.name}
          </Link>
          {who.accountType !== 'PERSON' && ` · ${accountTypeLabel(who.accountType) ?? 'ente'}`}
          {' · account da '}
          {who.accountAgeDays === 0
            ? 'oggi'
            : who.accountAgeDays === 1
              ? 'un giorno'
              : `${who.accountAgeDays} giorni`}
          {' · '}
          {who.published === 0 ? 'non ha mai pubblicato' : `${who.published} annunci pubblicati`}
          {' · '}
          {who.thanks === 0
            ? 'nessun grazie ricevuto'
            : who.thanks === 1
              ? '❤️ 1 grazie ricevuto'
              : `❤️ ${who.thanks} grazie ricevuti`}
        </p>
      )}
    </>
  )
}
