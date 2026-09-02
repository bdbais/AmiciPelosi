'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ThankYou } from './ThankYou'
import { thankYouForResolved } from '@/lib/messages'
import { useSound } from './SoundProvider'
import { OUTCOMES, outcomeIsHappy, type Outcome } from '@/lib/constants'

/**
 * Chiudere un annuncio, in tutti i modi in cui una ricerca puo finire.
 *
 * Prima si poteva chiudere solo bene, e chi aveva smesso di sperare aveva due
 * scelte: lasciarlo aperto per sempre, o cancellarlo - e allora chi teneva gli
 * occhi aperti continuava a cercare un animale che non c'e piu.
 *
 * Le chiusure tristi non fanno festa: niente suono, niente ringraziamento
 * allegro. Si dice quello che si puo dire, e si sta zitti sul resto.
 */

/** Gli esiti che hanno senso per ogni tipo di annuncio, nell'ordine giusto. */
const BY_KIND: Record<string, Outcome[]> = {
  LOST: ['HOME', 'DIED', 'GAVE_UP', 'OTHER_END'],
  FOUND: ['RETURNED', 'ADOPTED', 'OTHER_END'],
  FOSTER: ['FOSTERED', 'ADOPTED', 'OTHER_END'],
  ADOPTION: ['ADOPTED', 'FOSTERED', 'OTHER_END'],
  FOUND_DEAD: ['OTHER_END'],
}

const SAD_WORDS: Partial<Record<Outcome, string>> = {
  DIED: 'Mi dispiace. Grazie per averlo detto: chi lo stava cercando può smettere, e non è poco.',
  GAVE_UP:
    'Hai fatto quello che si poteva fare. L annuncio resta chiuso, e se un giorno cambia qualcosa lo riapri in un tocco.',
  OTHER_END: 'Annuncio chiuso.',
}

export function PostOwnerActions({
  postId,
  status,
  kind,
}: {
  postId: string
  status: string
  kind: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sad, setSad] = useState(false)
  const { playSuccess } = useSound()

  const options = BY_KIND[kind] ?? ['OTHER_END']

  async function close(outcome: Outcome) {
    setBusy(true)
    await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESOLVED', outcome }),
    })
    setBusy(false)
    setChoosing(false)

    if (outcomeIsHappy(outcome)) {
      setSad(false)
      setMessage(thankYouForResolved(kind))
      playSuccess()
    } else {
      setSad(true)
      setMessage(SAD_WORDS[outcome] ?? 'Annuncio chiuso.')
    }
    router.refresh()
  }

  async function reopen() {
    setBusy(true)
    await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'OPEN' }),
    })
    setBusy(false)
    setMessage(null)
    router.refresh()
  }

  async function remove() {
    if (!confirm('Eliminare definitivamente questo annuncio?')) return
    setBusy(true)
    const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    setBusy(false)
    if (response.ok) {
      router.push('/profilo')
      router.refresh()
    }
  }

  return (
    <div className="card">
      <h2>Gestisci il tuo annuncio</h2>
      {message && (sad ? <p className="quiet-note">{message}</p> : <ThankYou message={message} />)}

      <div className="stack" style={{ marginTop: 12 }}>
        {status === 'OPEN' ? (
          choosing ? (
            <>
              <p className="section-hint">Com è andata a finire?</p>
              {options.map((outcome) => (
                <button
                  key={outcome}
                  type="button"
                  className={`btn block ${outcomeIsHappy(outcome) ? '' : 'secondary'}`}
                  onClick={() => close(outcome)}
                  disabled={busy}
                >
                  {OUTCOMES[outcome].label}
                </button>
              ))}
              <button type="button" className="btn ghost block" onClick={() => setChoosing(false)}>
                Annulla
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn block"
              onClick={() => setChoosing(true)}
              disabled={busy}
            >
              Chiudi l annuncio
            </button>
          )
        ) : (
          <button type="button" className="btn secondary block" onClick={reopen} disabled={busy}>
            Riapri l annuncio
          </button>
        )}
        <button type="button" className="btn danger block" onClick={remove} disabled={busy}>
          Elimina
        </button>
      </div>
    </div>
  )
}
