'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PET_EVENT_KINDS, RECURRING_EVENT_KINDS, type PetEventKind } from '@/lib/constants'
import { readJson, type ApiError } from '@/lib/http'

/**
 * Il diario di una vita.
 *
 * Le visite, i vaccini, il parto, il compleanno. Serve a due cose molto
 * diverse: avere sottomano la storia clinica quando il veterinario la chiede,
 * e ricordarsi che il quattro di marzo e' il giorno in cui e' arrivato.
 */
export function PetDiary({ petId }: { petId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<PetEventKind>('VET')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [happenedAt, setHappenedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const response = await fetch(`/api/pets/${petId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title, note, happenedAt }),
      })

      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a salvare.')
        return
      }

      setTitle('')
      setNote('')
      setOpen(false)
      router.refresh()
    } catch {
      setError('Non sono riuscito a salvare: controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn secondary small" onClick={() => setOpen(true)}>
        ➕ Aggiungi al diario
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="stack">
      {error && <div className="alert error">{error}</div>}
      <div className="chips">
        {(Object.keys(PET_EVENT_KINDS) as PetEventKind[]).map((key) => (
          <button
            type="button"
            key={key}
            className={`chip${kind === key ? ' active' : ''}`}
            onClick={() => setKind(key)}
          >
            {PET_EVENT_KINDS[key].emoji} {PET_EVENT_KINDS[key].label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Di cosa si tratta</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          required
          placeholder={kind === 'BIRTHDAY' ? 'Es. Compie gli anni' : 'Es. Richiamo trivalente'}
        />
      </label>
      <label className="field">
        <span>Quando</span>
        <input
          type="date"
          value={happenedAt}
          onChange={(event) => setHappenedAt(event.target.value)}
          required
        />
      </label>
      {RECURRING_EVENT_KINDS.includes(kind) && (
        <p className="section-hint" style={{ marginTop: -6 }}>
          Torna ogni anno: te lo ricorderemo.
        </p>
      )}
      <label className="field">
        <span>Dettagli</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          placeholder="Cosa ha detto il veterinario, il peso, la cura da fare"
        />
      </label>
      <div className="inline">
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
          Annulla
        </button>
        <span className="spacer" />
        <button type="submit" className="btn small" disabled={busy || title.trim().length < 2}>
          {busy ? 'Salvo…' : 'Salva'}
        </button>
      </div>
    </form>
  )
}
