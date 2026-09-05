'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'
import { IDEA_STATUSES, type IdeaStatus as Status } from '@/lib/moderation-types'

/**
 * La tendina dello stato, solo per l'amministratore. Il tasto «Salva» e'
 * spento finche' non si sceglie uno stato diverso: cosi' non si registra
 * un'azione che non cambia niente.
 */
export function IdeaStatus({ ideaId, status }: { ideaId: string; status: Status }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<Status>(status)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/idee/${ideaId}/stato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: chosen }),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a cambiare lo stato.')
        return
      }
      router.refresh()
    } catch {
      setError('Non sono riuscito a cambiare lo stato. Controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 8, marginTop: 10 }}>
      {error && <div className="alert error">{error}</div>}
      <div className="inline">
        <label htmlFor={`idea-status-${ideaId}`} className="small muted">
          Stato
        </label>
        <select
          id={`idea-status-${ideaId}`}
          value={chosen}
          onChange={(event) => setChosen(event.target.value as Status)}
          disabled={busy}
          style={{ width: 'auto' }}
        >
          {(Object.keys(IDEA_STATUSES) as Status[]).map((value) => (
            <option key={value} value={value}>
              {IDEA_STATUSES[value]}
            </option>
          ))}
        </select>
        <button type="button" className="btn small" onClick={save} disabled={busy || chosen === status}>
          {busy ? 'Attendi…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
