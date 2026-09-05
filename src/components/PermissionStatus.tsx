'use client'

import { useEffect, useState } from 'react'
import { PermissionButton } from './PermissionButton'
import { permissionLabel, readPermission, type PermissionKey, type PermissionState } from '@/lib/permissions'

const WORDS: Record<PermissionState, { text: string; color: string }> = {
  granted: { text: 'Consentito', color: '#14663a' },
  prompt: { text: 'Non ancora chiesto', color: '#94491c' },
  denied: { text: 'Negato', color: '#a12020' },
  unsupported: { text: 'Non disponibile qui', color: '#6b6b6b' },
}

/** Una riga per permesso: com'e' messo adesso e il tasto per cambiarlo. */
export function PermissionStatus({ kind }: { kind: PermissionKey }) {
  const [state, setState] = useState<PermissionState | null>(null)
  const label = permissionLabel(kind)

  const refresh = () => void readPermission(kind).then(setState)
  useEffect(refresh, [kind])

  return (
    <div className="card">
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{label.title}</h2>
        {state && (
          <span className="small" style={{ color: WORDS[state].color, fontWeight: 600 }}>
            {WORDS[state].text}
          </span>
        )}
      </div>
      <p className="section-hint">{label.why}</p>
      <PermissionButton kind={kind} onGranted={refresh} />
    </div>
  )
}
