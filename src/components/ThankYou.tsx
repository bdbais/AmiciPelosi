'use client'

import { useEffect, useState } from 'react'

/**
 * Messaggio di ringraziamento: compare con delicatezza e si puo chiudere.
 * Non blocca mai quello che la persona stava facendo.
 */
export function ThankYou({
  message,
  tone = 'success',
  autoHideMs,
}: {
  message: string
  tone?: 'success' | 'info'
  autoHideMs?: number
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!autoHideMs) return
    const timer = setTimeout(() => setVisible(false), autoHideMs)
    return () => clearTimeout(timer)
  }, [autoHideMs])

  if (!visible) return null

  return (
    <div className={`thank-you ${tone}`} role="status">
      <span className="text">{message}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Chiudi il messaggio">
        ✕
      </button>
    </div>
  )
}
