'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * La banda che ricorda all'amministratore che sta guardando con gli occhi
 * di un altro. Sta sopra tutto e non si chiude: l'unico modo per farla
 * sparire e' tornare a se stessi.
 */
export function ImpersonationBanner({ name }: { name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function stop() {
    setBusy(true)
    try {
      await fetch('/api/admin/impersona', { method: 'DELETE' })
    } catch {
      // Se la rete manca, il cookie scade da solo entro mezz'ora.
    } finally {
      setBusy(false)
      router.push('/admin/persone')
      router.refresh()
    }
  }

  return (
    <div className="impersonation-banner" role="status">
      <span>
        Stai vedendo il sito come <strong>{name}</strong>. Solo lettura: non puoi modificare niente a nome
        suo.
      </span>
      <button type="button" className="btn small" onClick={() => void stop()} disabled={busy}>
        {busy ? 'Torno…' : 'Torna a te'}
      </button>
    </div>
  )
}
