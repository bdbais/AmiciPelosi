'use client'

import { useEffect } from 'react'

const KEY = 'amici-pelosi:presenza'
const EVERY_MS = 60 * 60 * 1000

/**
 * Dice al server «sono qui, da app o da sito», al massimo una volta l'ora
 * per scheda. L'app Android e' Chrome a schermo intero: dal server non si
 * distingue, ma la pagina lo vede dal display-mode o dal referrer
 * android-app:// con cui e' stata aperta.
 */
export function Presence() {
  useEffect(() => {
    try {
      const last = Number(sessionStorage.getItem(KEY) ?? 0)
      if (Date.now() - last < EVERY_MS) return
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // sessionStorage assente (navigazione privata severa): si manda e basta.
    }
    const app =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      document.referrer.startsWith('android-app://')
    void fetch('/api/me/presenza', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: app ? 'APP' : 'SITO' }),
      keepalive: true,
    }).catch(() => undefined)
  }, [])
  return null
}
