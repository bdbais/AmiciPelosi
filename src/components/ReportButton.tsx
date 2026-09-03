'use client'

import Link from 'next/link'
import { useState } from 'react'
import { REPORT_REASONS, type ReportReason } from '@/lib/moderation-types'
import { readJson, type ApiError } from '@/lib/http'

/**
 * Segnalare un annuncio a chi modera.
 *
 * I motivi sono quattro e sono le regole del sito: persone nelle foto,
 * denaro, vendita. Il testo libero c'e' solo per "altro", perche' una
 * segnalazione a scelta e' facile da gestire e una lettera no. Il tasto e'
 * discreto: sta in fondo, e non deve sembrare una cosa da fare per sport.
 */
export function ReportButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('PEOPLE_IN_PHOTO')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<'idle' | 'sent' | 'login' | 'already'>('idle')
  const [error, setError] = useState<string | null>(null)

  const noteRequired = reason === 'OTHER'
  const noteOk = !noteRequired || note.trim().length >= 3

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!noteOk) {
      setError('Spiega in una riga cosa non va.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reason, note: note.trim() || undefined }),
      })
      if (response.status === 401) {
        setState('login')
        return
      }
      if (response.status === 409) {
        setState('already')
        return
      }
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a inviare la segnalazione.')
        return
      }
      setState('sent')
    } catch {
      setError('Non sono riuscito a inviare la segnalazione. Controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'sent') {
    return <p className="small muted">Grazie, chi modera guarderà.</p>
  }
  if (state === 'already') {
    return <p className="small muted">L’hai già segnalato: chi modera lo vedrà.</p>
  }
  if (state === 'login') {
    return (
      <p className="small muted">
        Per segnalare un annuncio devi <Link href="/accedi">accedere</Link>.
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" className="btn ghost small" onClick={() => setOpen(true)}>
        Segnala questo annuncio
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card report-form">
      <h2>Cosa non va in questo annuncio?</h2>
      {error && <div className="alert error">{error}</div>}
      <div className="stack" style={{ gap: 8 }}>
        {(Object.keys(REPORT_REASONS) as ReportReason[]).map((key) => (
          <label key={key} className="report-choice">
            <input
              type="radio"
              name="reason"
              value={key}
              checked={reason === key}
              onChange={() => setReason(key)}
              disabled={busy}
            />
            <span>{REPORT_REASONS[key]}</span>
          </label>
        ))}
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor={`report-note-${postId}`}>
          {noteRequired ? 'Spiega in una riga *' : 'Vuoi aggiungere qualcosa? (facoltativo)'}
        </label>
        <input
          id={`report-note-${postId}`}
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          required={noteRequired}
          disabled={busy}
        />
      </div>
      <div className="inline">
        <button type="submit" className="btn small" disabled={busy || !noteOk}>
          {busy ? 'Attendi…' : 'Invia'}
        </button>
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)} disabled={busy}>
          Annulla
        </button>
      </div>
    </form>
  )
}
