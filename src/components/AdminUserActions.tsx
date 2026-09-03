'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ROLES, type Role, type SuspectOf } from '@/lib/moderation-types'
import { readJson, type ApiError } from '@/lib/http'

/**
 * Bloccare o sbloccare una persona, e - solo per un amministratore -
 * cambiarle il ruolo. Piu' quello che riguarda i suoi browser: bloccarli
 * insieme all'account, riaprirli, e sciogliere il sospetto "somiglia a un
 * bloccato".
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
  suspectOf = null,
  suspectReason = null,
  deviceBanned = false,
}: {
  userId: string
  banned: boolean
  role: Role
  viewerRole: Role
  /** Il bloccato a cui somiglia, se c'e' un sospetto ancora aperto. */
  suspectOf?: SuspectOf | null
  suspectReason?: string | null
  /** Uno dei browser usati di recente e' bloccato. */
  deviceBanned?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [banning, setBanning] = useState(false)
  const [reason, setReason] = useState('')
  // Se somiglia a un bloccato, il blocco del browser e' quasi sempre quello
  // che si vuole: e' rientrato da li'. Altrimenti no, perche' un telefono
  // puo' essere di famiglia.
  const [banDevices, setBanDevices] = useState(Boolean(suspectOf))
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
    const ok = await send(
      { action: 'ban', reason: reason.trim(), banDevices },
      'Non sono riuscito a bloccare questa persona.',
    )
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

      {suspectOf && (
        <div className="alert warn" style={{ margin: 0 }}>
          Somiglia a{' '}
          <Link href={`/persone/${suspectOf.id}`} style={{ fontWeight: 700 }}>
            {suspectOf.name}
          </Link>
          {suspectOf.bannedReason ? ` (bloccato: ${suspectOf.bannedReason})` : ' (bloccato)'}.
          {suspectReason ? ` ${suspectReason[0].toUpperCase()}${suspectReason.slice(1)}.` : ''}
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              className="btn secondary small"
              onClick={() => send({ action: 'clear_suspect' }, 'Non sono riuscito a togliere il sospetto.')}
              disabled={busy}
            >
              Non è la stessa persona
            </button>
          </div>
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
          <label className="report-choice small">
            <input
              type="checkbox"
              checked={banDevices}
              onChange={(event) => setBanDevices(event.target.checked)}
              disabled={busy}
            />
            <span>Blocca anche il dispositivo (chi si registra da lì non entra)</span>
          </label>
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

      {/*
        Sbloccare l'account non riapre i browser: sono due decisioni. Il
        tasto compare finche' uno dei suoi browser recenti resta bloccato.
      */}
      {deviceBanned && (
        <div className="inline" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => send({ action: 'unban_devices' }, 'Non sono riuscito a sbloccare i dispositivi.')}
            disabled={busy}
          >
            Sblocca i dispositivi
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
