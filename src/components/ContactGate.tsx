'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ContactActions } from './ContactActions'
import { readJson, type ApiError } from '@/lib/http'

type Reason = 'OWNER' | 'OPEN' | 'ACCEPTED' | 'ANONYMOUS' | 'ASK' | 'PENDING' | 'DECLINED'

/**
 * Il recapito, e la porta davanti.
 *
 * Chi ha pubblicato non deve trovarsi il telefono in mano a chiunque passi:
 * lo da' a chi glielo chiede, dopo aver letto chi e' e cosa vuole. Costa un
 * passaggio in piu' a chi vuole davvero aiutare, e costa tutto a chi voleva
 * solo raccogliere numeri.
 */
export function ContactGate({
  postId,
  visible,
  reason,
  contactName,
  contactPhone,
  contactEmail,
  title,
}: {
  postId: string
  visible: boolean
  reason: Reason
  contactName: string
  contactPhone: string | null
  contactEmail: string | null
  title: string
}) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<Reason>(reason)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function ask() {
    setSending(true)
    setError(null)
    const response = await fetch(`/api/posts/${postId}/contatto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    setSending(false)
    if (!response.ok) {
      const json = await readJson<ApiError>(response)
      setError(json.error ?? 'Non sono riuscito a mandare la richiesta.')
      return
    }
    setState('PENDING')
  }

  if (visible) {
    return (
      <>
        <div className="spec-list">
          {contactPhone && (
            <div>
              <span className="k">Telefono</span>
              <span className="v">
                <a href={`tel:${contactPhone}`}>{contactPhone}</a>
              </span>
            </div>
          )}
          {contactEmail && (
            <div>
              <span className="k">Email</span>
              <span className="v">
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </span>
            </div>
          )}
        </div>
        <ContactActions
          contactName={contactName}
          contactPhone={contactPhone}
          contactEmail={contactEmail}
          title={title}
        />
        {reason === 'ACCEPTED' && (
          <p className="small muted" style={{ marginTop: 12 }}>
            Questo recapito te l’ha dato {contactName} rispondendo alla tua richiesta. Tienilo per
            te: non è pubblico.
          </p>
        )}
      </>
    )
  }

  if (state === 'ANONYMOUS') {
    return (
      <div style={{ marginTop: 14 }}>
        <p className="section-hint">
          Il recapito di chi ha pubblicato non è pubblico. Entra e chiediglielo: risponde lui.
        </p>
        <Link href="/accedi" className="btn secondary small">
          🔒 Entra per chiedere il contatto
        </Link>
      </div>
    )
  }

  if (state === 'PENDING') {
    return (
      <div className="alert info" style={{ marginTop: 14 }}>
        Richiesta mandata. {contactName} la vede e decide: se accetta, il recapito compare qui.
      </div>
    )
  }

  if (state === 'DECLINED') {
    return (
      <div style={{ marginTop: 14 }}>
        <p className="section-hint" style={{ margin: 0 }}>
          {contactName} ha preferito di no. Puoi comunque lasciare un avvistamento qui sotto: quello
          lo legge sempre.
        </p>
      </div>
    )
  }

  return (
    <div className="stack" style={{ marginTop: 14 }}>
      {error && <div className="alert error">{error}</div>}
      <p className="section-hint" style={{ margin: 0 }}>
        Il numero non è pubblico. Scrivi due righe a {contactName}: chi sei e perché lo cerchi.
        Decide lui se dartelo.
      </p>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Es. Abito in via Roma, credo di aver visto il tuo gatto stamattina in cortile."
        maxLength={600}
        aria-label="Perché chiedi il contatto"
      />
      <div className="inline">
        <button
          type="button"
          className="btn small"
          onClick={ask}
          disabled={sending || message.trim().length < 10}
        >
          {sending ? 'Mando…' : '🤝 Chiedi il contatto'}
        </button>
        <span className="small muted">Una richiesta sola per annuncio.</span>
      </div>
    </div>
  )
}
