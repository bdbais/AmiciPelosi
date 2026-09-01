'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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
    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      setError(json.error ?? 'Qualcosa e andato storto.')
      setBusy(false)
      return
    }

    router.push(isRegister ? '/notifiche' : '/')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>{isRegister ? 'Crea il tuo account' : 'Bentornato'}</h2>
      <p className="section-hint">
        {isRegister
          ? 'Ti serve per pubblicare annunci e ricevere le notifiche della tua zona.'
          : 'Accedi per pubblicare e gestire i tuoi annunci.'}
      </p>

      {error && <div className="alert error">{error}</div>}

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
