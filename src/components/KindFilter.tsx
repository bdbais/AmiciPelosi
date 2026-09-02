'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { KINDS, SPECIES } from '@/lib/constants'

export function KindFilter({ counts }: { counts: Record<string, number> }) {
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')

  const activeKind = params.get('tipo') ?? ''
  const activeSpecies = params.get('specie') ?? ''

  function navigate(next: Record<string, string>) {
    const search = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value)
      else search.delete(key)
    }
    router.push(search.toString() ? `/bacheca?${search}` : '/bacheca')
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          navigate({ q: query.trim() })
        }}
        className="inline"
      >
        <input
          type="search"
          placeholder="Cerca per nome, razza, citta…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ flex: 1, minWidth: 180 }}
          aria-label="Cerca annunci"
        />
        <button type="submit" className="btn secondary">
          Cerca
        </button>
      </form>

      <div className="chips">
        <button
          type="button"
          className={`chip ${activeKind ? '' : 'active'}`}
          onClick={() => navigate({ tipo: '' })}
        >
          Tutti ({total})
        </button>
        {Object.entries(KINDS).map(([key, value]) => (
          <button
            key={key}
            type="button"
            className={`chip ${activeKind === key ? 'active' : ''}`}
            onClick={() => navigate({ tipo: activeKind === key ? '' : key })}
          >
            {value.emoji} {value.label} ({counts[key] ?? 0})
          </button>
        ))}
      </div>

      <div className="chips">
        {Object.entries(SPECIES).map(([key, value]) => (
          <button
            key={key}
            type="button"
            className={`chip ${activeSpecies === key ? 'active' : ''}`}
            onClick={() => navigate({ specie: activeSpecies === key ? '' : key })}
          >
            {value.emoji} {value.label}
          </button>
        ))}
      </div>
    </div>
  )
}
