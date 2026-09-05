'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'

/**
 * Il modulo per un'idea nuova. Chiuso di default: la pagina serve a votare,
 * e il modulo aperto in cima spingerebbe le idee sotto la piega.
 */
export function IdeaNew() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ready = title.trim().length >= 3 && body.trim().length >= 10

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const response = await fetch('/api/admin/idee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a salvare l’idea.')
        return
      }
      setTitle('')
      setBody('')
      setOpen(false)
      router.refresh()
    } catch {
      setError('Non sono riuscito a salvare l’idea. Controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn secondary small" onClick={() => setOpen(true)}>
        Aggiungi un’idea
      </button>
    )
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Aggiungi un’idea</h2>
      <p className="section-hint">
        Scrivila come la diresti a voce: cosa, e perché adesso o perché non ancora. La leggono solo chi modera e chi
        amministra.
      </p>
      {error && <div className="alert error">{error}</div>}
      <div className="field">
        <label htmlFor="idea-title">Titolo *</label>
        <input
          id="idea-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          disabled={busy}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="idea-body">L’idea *</label>
        <textarea
          id="idea-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          disabled={busy}
          required
        />
        <p className="hint">
          Puoi usare gli elenchi con «-» e il grassetto con **due asterischi**. {body.length}/2000
        </p>
      </div>
      <div className="inline">
        <button type="submit" className="btn small" disabled={busy || !ready}>
          {busy ? 'Attendi…' : 'Salva l’idea'}
        </button>
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)} disabled={busy}>
          Annulla
        </button>
      </div>
    </form>
  )
}
