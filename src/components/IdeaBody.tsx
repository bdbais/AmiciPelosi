'use client'

import { useState } from 'react'

/**
 * Il testo di un'idea, chiuso alle prime sei righe se e' lungo. Il markdown
 * lo rende il server e arriva qui gia' fatto: questo componente sa solo
 * aprire e chiudere.
 */
export function IdeaBody({ long, children }: { long: boolean; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(!long)
  return (
    <div>
      <div className={`idea-body${expanded ? '' : ' clamped'}`}>{children}</div>
      {long && (
        <button type="button" className="btn ghost small" style={{ padding: '4px 0' }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Chiudi' : 'Leggi tutto'}
        </button>
      )}
    </div>
  )
}
