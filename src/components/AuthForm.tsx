'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { readJson, type ApiError } from '@/lib/http'
import { ACCOUNT_TYPES, type AccountType } from '@/lib/constants'

const ERRORI: Record<string, string> = {
  'google-non-configurato': 'L accesso con Google non e ancora configurato su questo server.',
  'accesso-annullato': 'Accesso con Google annullato.',
  'stato-non-valido': 'Sessione di accesso scaduta: riprova.',
  'google-non-riuscito': 'Google non ha completato l accesso: riprova.',
  'email-non-verificata':
    'Il tuo account Google non ha un indirizzo email verificato: verificalo su Google, oppure registrati con email e password.',
  'account-bloccato': 'Questo account è stato bloccato.',
  'dispositivo-bloccato': 'Da questo dispositivo non è possibile usare Amici Pelosi.',
}

/** L'errore arrivato dall'accesso con Google, con il motivo del blocco se c'e'. */
function errorFromParams(params: URLSearchParams): string | null {
  const code = params.get('errore') ?? ''
  const base = ERRORI[code] ?? null
  if (code !== 'account-bloccato' || !base) return base
  const reason = params.get('motivo')?.trim()
  return reason ? `${base} Motivo: ${reason}` : base
}

export function AuthForm({ mode, googleEnabled }: { mode: 'login' | 'register'; googleEnabled: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(errorFromParams(params))
  const [busy, setBusy] = useState(false)
  // Il tipo scelto si tiene in uno stato solo per far comparire il campo del
  // link: chi si dichiara ente deve dare una prova, una persona no.
  const [kind, setKind] = useState<AccountType>('PERSON')
  // Le sei scelte di «Chi sei?» stanno chiuse: quasi tutti sono una persona,
  // e un elenco di canili e veterinari davanti a chi vuole solo iscriversi e'
  // una pagina in piu' da leggere nel momento sbagliato.
  const [showTypes, setShowTypes] = useState(false)
  const isRegister = mode === 'register'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await readJson<ApiError>(response)

    if (!response.ok) {
      setError(json.error ?? 'Qualcosa e andato storto.')
      setBusy(false)
      return
    }

    // Un ente, una colonia o un veterinario hanno altro da dire (dove sta,
    // come si chiama): si va prima al profilo. Una persona va dritta agli avvisi.
    const orgLike = isRegister && payload.accountType && payload.accountType !== 'PERSON'
    router.push(!isRegister ? '/bacheca' : orgLike ? '/profilo?benvenuto=1' : '/notifiche?benvenuto=1')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>{isRegister ? 'Crea il tuo account' : 'Bentornato'}</h2>
      <p className="section-hint">
        {isRegister
          ? 'Ti serve per pubblicare annunci e ricevere le notifiche della tua zona. Un account riconoscibile rende gli annunci piu affidabili per tutti.'
          : 'Accedi per pubblicare e gestire i tuoi annunci.'}
      </p>

      {error && <div className="alert error">{error}</div>}

      {googleEnabled ? (
        <>
          <a href="/api/auth/google" className="btn google block">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/>
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"/>
              <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z"/>
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/>
            </svg>
            Continua con Google
          </a>
          <div className="divider">
            <span>oppure</span>
          </div>
        </>
      ) : null}

      {isRegister && (
        <>
          <div className="field">
            <label htmlFor="name">Nome *</label>
            <input id="name" name="name" type="text" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="phone">Telefono</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" />
            <p className="hint">Facoltativo: lo proponiamo come contatto nei tuoi annunci.</p>
          </div>
          {showTypes ? (
            <fieldset className="field account-choice">
              <legend>Chi sei? *</legend>
              {(Object.keys(ACCOUNT_TYPES) as AccountType[]).map((key) => (
                <label key={key} className="account-option">
                  <input
                    type="radio"
                    name="accountType"
                    value={key}
                    checked={kind === key}
                    onChange={() => setKind(key)}
                  />
                  <span>
                    <span aria-hidden="true">{ACCOUNT_TYPES[key].emoji}</span> {ACCOUNT_TYPES[key].label}
                    <small>{ACCOUNT_TYPES[key].hint}</small>
                  </span>
                </label>
              ))}
              <p className="hint">Si può cambiare dopo, dal profilo.</p>
            </fieldset>
          ) : (
            <div className="field">
              <input type="hidden" name="accountType" value="PERSON" />
              <p className="hint" style={{ marginTop: 0 }}>
                Sei un’associazione, un canile, un gattile, una colonia o un veterinario?{' '}
                <button type="button" className="linkish" onClick={() => setShowTypes(true)}>
                  Dillo qui
                </button>
              </p>
            </div>
          )}
          {/*
            Scrivere «canile» non costa niente: il tipo vale solo dopo che chi
            modera ha guardato una pagina che lo dimostri. Fino ad allora si
            pubblica come una persona.
          */}
          {kind !== 'PERSON' && (
            <div className="field">
              <label htmlFor="proofUrl">Un link che dimostri chi sei *</label>
              <input
                id="proofUrl"
                name="proofUrl"
                type="url"
                required
                maxLength={300}
                placeholder="https://…"
                autoComplete="url"
              />
              <p className="hint">
                Il sito, la pagina Facebook o Instagram, l’iscrizione all’albo: chi modera lo guarda
                prima di approvarti. Nel frattempo puoi già pubblicare, come una persona.
              </p>
            </div>
          )}
        </>
      )}

      <div className="field">
        <label htmlFor="email">Email *</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="field">
        <label htmlFor="password">Password *</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />
        {isRegister && <p className="hint">Almeno 8 caratteri.</p>}
      </div>

      <button type="submit" className="btn block" disabled={busy}>
        {busy ? 'Attendi…' : isRegister ? 'Registrati' : 'Accedi'}
      </button>

      <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
        {isRegister ? (
          <>
            Hai gia un account? <Link href="/accedi">Accedi</Link>
          </>
        ) : (
          <>
            Non hai un account? <Link href="/registrati">Registrati</Link>
          </>
        )}
      </p>
    </form>
  )
}
