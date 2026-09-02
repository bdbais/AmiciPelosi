'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'

type Person = {
  id: string
  name: string
  email: string
  scope: string
  primaryVet: boolean
  accountType: string
}

/**
 * Le persone fidate: chi ha una copia della chiave di casa.
 *
 * Si aggiungono per email perche' e l'unica cosa che si sa a memoria di una
 * persona. Non e un'amicizia reciproca ne una richiesta da accettare: e una
 * chiave che si da, e che si puo' riprendere in qualsiasi momento.
 */
export function TrustedPeople({ people }: { people: Person[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNote(null)
    setBusy(true)

    const response = await fetch('/api/trusted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const json = await readJson<ApiError & { person?: { name: string }; alreadyThere?: boolean }>(
      response,
    )

    if (!response.ok) {
      setError(json.error ?? 'Non sono riuscito ad aggiungerla.')
      setBusy(false)
      return
    }

    setEmail('')
    setNote(
      json.alreadyThere
        ? `${json.person?.name} ce l'aveva già.`
        : `${json.person?.name} adesso può vedere gli animali che scegli di condividere.`,
    )
    setBusy(false)
    router.refresh()
  }

  async function remove(id: string) {
    await fetch(`/api/trusted?id=${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function change(id: string, next: { scope?: string; primaryVet?: boolean }) {
    await fetch('/api/trusted', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...next }),
    })
    router.refresh()
  }

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      {note && <div className="alert info">{note}</div>}

      {people.length === 0 ? (
        <p className="section-hint" style={{ margin: 0 }}>
          Non hai ancora dato la chiave a nessuno. Va benissimo così: le schede restano tue e
          basta.
        </p>
      ) : (
        <div className="trusted-list">
          {people.map((person) => (
            <div className="trusted-row" key={person.id}>
              <span className="tr-mark" aria-hidden="true">
                {person.accountType === 'VET' ? '🩺' : '🤝'}
              </span>
              <span className="tr-who">
                <strong>
                  {person.name}
                  {person.primaryVet && <span className="tr-tag">veterinario di riferimento</span>}
                </strong>
                <em>{person.email}</em>
                <em>
                  {person.scope === 'MEDICAL'
                    ? 'Vede solo la parte sanitaria'
                    : 'Vede tutto quello che condividi'}
                </em>
              </span>
              <span className="tr-buttons">
                {person.accountType === 'VET' && !person.primaryVet && (
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => change(person.id, { primaryVet: true })}
                  >
                    È il mio veterinario
                  </button>
                )}
                {!person.primaryVet && (
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() =>
                      change(person.id, { scope: person.scope === 'MEDICAL' ? 'ALL' : 'MEDICAL' })
                    }
                  >
                    {person.scope === 'MEDICAL' ? 'Dagli tutto' : 'Solo la salute'}
                  </button>
                )}
                <button type="button" className="btn ghost small" onClick={() => remove(person.id)}>
                  Togli
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="inline">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email di una persona fidata"
          required
          style={{ flex: 1, minWidth: 180 }}
          aria-label="Email della persona fidata"
        />
        <button type="submit" className="btn secondary small" disabled={busy}>
          {busy ? 'Aggiungo…' : 'Dai la chiave'}
        </button>
      </form>
      <p className="section-hint" style={{ margin: 0 }}>
        Deve essere già iscritta ad Amici Pelosi. Vedrà solo gli animali che tu marchi come
        condivisi, e nient&apos;altro del tuo profilo. Togliere la chiave ha effetto subito.
        <br />
        A chi è registrato come veterinario diamo di partenza la sola parte sanitaria. Se è{' '}
        <strong>il tuo</strong> veterinario, quello che lo conosce da anni, puoi nominarlo di
        riferimento e dargli tutto: uno solo, perché «di riferimento» al plurale non vuol dire
        niente.
      </p>
    </div>
  )
}
