'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'
import { IDEA_VOTES, type IdeaVoteValue } from '@/lib/moderation-types'

/**
 * I tre tasti del voto e la riga di commento, che parte insieme al voto.
 *
 * Non c'e' un tasto «salva» a parte: si preme la parola che si pensa, e
 * quella parte con il commento scritto fin li'. Chi vuole solo aggiustare il
 * commento ripreme il suo voto. Un voto solo a testa: il server sovrascrive.
 */
export function IdeaVote({
  ideaId,
  myVote,
}: {
  ideaId: string
  myVote: { value: IdeaVoteValue; comment: string | null } | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState(myVote?.comment ?? '')
  const [error, setError] = useState<string | null>(null)

  async function vote(value: IdeaVoteValue) {
    setError(null)
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/idee/${ideaId}/voto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, comment: comment.trim() || undefined }),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a salvare il voto.')
        return
      }
      router.refresh()
    } catch {
      setError('Non sono riuscito a salvare il voto. Controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 8, marginTop: 10 }}>
      {error && <div className="alert error">{error}</div>}
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor={`idea-comment-${ideaId}`}>Una riga tua (facoltativa)</label>
        <input
          id={`idea-comment-${ideaId}`}
          type="text"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={300}
          disabled={busy}
          placeholder="Es. Solo se prima si chiude la verifica degli enti"
        />
      </div>
      <div className="inline" role="group" aria-label="Il tuo voto">
        {(Object.keys(IDEA_VOTES) as IdeaVoteValue[]).map((value) => {
          const active = myVote?.value === value
          return (
            <button
              key={value}
              type="button"
              className={`chip${active ? ' active' : ''}`}
              aria-pressed={active}
              onClick={() => vote(value)}
              disabled={busy}
            >
              {IDEA_VOTES[value]}
            </button>
          )
        })}
        {busy && <span className="small muted">Salvo…</span>}
      </div>
    </div>
  )
}
