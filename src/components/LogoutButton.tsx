'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
    setBusy(false)
  }

  return (
    <button type="button" className="btn ghost small hide-sm" onClick={logout} disabled={busy}>
      Esci
    </button>
  )
}
