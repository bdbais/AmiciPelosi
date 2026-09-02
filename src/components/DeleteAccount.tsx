'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Il pulsante che mantiene la promessa scritta nei termini.
 *
 * Chiede di scrivere una parola invece di un "sei sicuro?": un tocco per
 * sbaglio non deve portare via anni di diario. E dice prima cosa sparisce,
 * perche' dopo non c'e' modo di tornare indietro.
 */
export function DeleteAccount({ email }: { email: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    const response = await fetch('/api/me', { method: 'DELETE' })
    if (!response.ok) {
      setError('Non sono riuscito a cancellare l’account. Riprova.')
      setBusy(false)
      return
    }
    router.push('/?addio=1')
    router.refresh()
  }

  if (!open) {
    return (
      <button type="button" className="btn danger small" onClick={() => setOpen(true)}>
        Cancella il mio account
      </button>
    )
  }

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      <div className="alert error">
        <strong>Spariscono per sempre:</strong> i tuoi annunci e le loro foto, le segnalazioni che
        hai scritto, le schede dei tuoi animali con il diario e il libretto, la tua zona di avviso
        e le richieste di contatto. Non teniamo una copia di cortesia: è quello che c’è scritto nei
        termini, e vale.
      </div>
      <label className="field">
        <span>
          Per confermare scrivi <strong>{email}</strong>
        </span>
        <input
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
        />
      </label>
      <div className="inline">
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
          Lascia stare
        </button>
        <span className="spacer" />
        <button
          type="button"
          className="btn danger small"
          onClick={remove}
          disabled={busy || typed.trim().toLowerCase() !== email.toLowerCase()}
        >
          {busy ? 'Cancello…' : 'Cancella tutto'}
        </button>
      </div>
    </div>
  )
}
