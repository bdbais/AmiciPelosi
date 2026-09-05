'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    } catch {
      // Senza rete non si esce, ma il pulsante non deve restare grigio per sempre.
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn ghost small hide-sm" onClick={logout} disabled={busy}>
      Esci
    </button>
  )
}
