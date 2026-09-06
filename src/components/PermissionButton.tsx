'use client'

import { useEffect, useState } from 'react'
import {
  browserName,
  permissionLabel,
  readPermission,
  unlockSteps,
  type PermissionKey,
  type PermissionState,
} from '@/lib/permissions'

/**
 * Il tasto che porta dove si sblocca il permesso.
 *
 * Fa la cosa giusta a seconda di dove sei: se il permesso non e' mai stato
 * chiesto lo chiede, con un tocco; se e' stato negato apre i passi precisi per
 * il tuo browser, perche' da qui dentro nessuno puo' aprirti quel pannello.
 */
export function PermissionButton({
  kind,
  compact = false,
  onGranted,
}: {
  kind: PermissionKey
  compact?: boolean
  onGranted?: () => void
}) {
  const [state, setState] = useState<PermissionState | null>(null)
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState(false)
  const label = permissionLabel(kind)

  useEffect(() => {
    let alive = true
    void readPermission(kind).then((value) => {
      if (alive) setState(value)
    })
    return () => {
      alive = false
    }
  }, [kind])

  /** Chiedere il permesso e' l'unico modo di farlo comparire: nessuna scorciatoia. */
  async function ask() {
    setAsking(true)
    if (kind === 'notifications') {
      const result = await Notification.requestPermission()
      setState(result === 'default' ? 'prompt' : result)
      if (result === 'granted') onGranted?.()
    } else {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setState('granted')
            onGranted?.()
            resolve()
          },
          (error) => {
            setState(error.code === 1 ? 'denied' : 'prompt')
            resolve()
          },
          { timeout: 10000 },
        )
      })
    }
    setAsking(false)
    // Il permesso puo' essere cambiato altrove nel frattempo.
    setState(await readPermission(kind))
  }

  if (state === null || state === 'granted') return null

  if (state === 'unsupported') {
    return (
      <p className="small muted" style={{ margin: 0 }}>
        {browserName()} non gestisce {label.title.toLowerCase()}.
      </p>
    )
  }

  if (state === 'prompt') {
    return (
      <button type="button" className="btn secondary small" onClick={ask} disabled={asking}>
        {asking ? 'Aspetto…' : `🔓 Consenti ${label.title.toLowerCase()}`}
      </button>
    )
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <button type="button" className="btn secondary small" onClick={() => setOpen(!open)}>
        🔒 {compact ? 'Come si sblocca' : `${label.title}: come si sblocca`}
      </button>
      {open && (
        <div className="alert info" style={{ margin: 0 }}>
          <p className="small" style={{ margin: '0 0 6px' }}>
            Su {browserName()}, in tre passi. Da qui non posso aprirtelo io: i browser lo vietano
            apposta, e fanno bene.
          </p>
          <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {unlockSteps(kind).map((step) => (
              <li key={step} style={{ marginBottom: 4 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
