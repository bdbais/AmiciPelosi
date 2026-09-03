'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ROLES, type Role } from '@/lib/moderation-types'
import { readJson, type ApiError } from '@/lib/http'

/**
 * Bloccare o sbloccare una persona, e - solo per un amministratore -
 * cambiarle il ruolo.
 *
 * Il motivo del blocco e' obbligatorio: e' quello che la persona legge
 * quando prova ad accedere, e un "sei bloccato" senza spiegazione non
 * insegna niente a nessuno.
 */
export function AdminUserActions({
  userId,
  banned,
  role,
  viewerRole,
}: {
  userId: string
  banned: boolean
  role: Role
  viewerRole: Role
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [banning, setBanning] = useState(false)
  const [reason, setReason] = useState('')
  const [nextRole, setNextRole] = useState<Role>(role)
  const [error, setError] = useState<string | null>(null)

  const reasonOk = reason.trim().length >= 3 && reason.trim().length <= 300

  async function send(body: Record<string, unknown>, failure: string) {
    setError(null)
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? failure)
        return false
      }
      router.refresh()
      return true
    } catch {
      setError(`${failure} Controlla la connessione e riprova.`)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function ban() {
    if (!reasonOk) {
      setError('Scrivi un motivo: da 3 a 300 caratteri.')
      return
    }
    const ok = await send({ action: 'ban', reason: reason.trim() }, 'Non sono riuscito a bloccare questa persona.')
    if (ok) {
      setBanning(false)
      setReason('')
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      {error && (
        <div className="alert error" style={{ margin: 0 }}>
          {error}
        </div>
      )}

      {banned ? (
        <div className="inline" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => send({ action: 'unban' }, 'Non sono riuscito a sbloccare questa persona.')}
            disabled={busy}
          >
            {busy ? 'Attendi…' : 'Sblocca'}
          </button>
        </div>
      ) : banning ? (
        <>
          <input
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo che leggerà la persona"
            aria-label="Motivo del blocco"
            maxLength={300}
            disabled={busy}
            autoFocus
          />
          <div className="inline" style={{ gap: 6 }}>
            <button type="button" className="btn danger small" onClick={ban} disabled={busy || !reasonOk}>
              {busy ? 'Attendi…' : 'Conferma il blocco'}
            </button>
            <button type="button" className="btn ghost small" onClick={() => setBanning(false)} disabled={busy}>
              Annulla
            </button>
          </div>
        </>
      ) : (
        <div className="inline" style={{ gap: 6 }}>
          <button type="button" className="btn danger small" onClick={() => setBanning(true)} disabled={busy}>
            Blocca
          </button>
        </div>
      )}

      {viewerRole === 'ADMIN' && (
        <div className="inline" style={{ gap: 6 }}>
          <select
            value={nextRole}
            onChange={(event) => setNextRole(event.target.value as Role)}
            aria-label="Ruolo"
            disabled={busy}
            style={{ width: 'auto' }}
          >
            {(Object.keys(ROLES) as Role[]).map((key) => (
              <option key={key} value={key}>
                {ROLES[key]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => send({ action: 'role', role: nextRole }, 'Non sono riuscito a cambiare il ruolo.')}
            disabled={busy || nextRole === role}
          >
            Salva
          </button>
        </div>
      )}
    </div>
  )
}
