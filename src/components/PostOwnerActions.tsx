'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const RESOLVED_LABEL: Record<string, string> = {
  LOST: '🎉 L ho ritrovato: chiudi l annuncio',
  FOUND: '✅ Restituito al proprietario: chiudi',
  ADOPTION: '🏡 Adottato: chiudi l annuncio',
}

export function PostOwnerActions({
  postId,
  status,
  kind,
}: {
  postId: string
  status: string
  kind: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function setStatus(next: 'OPEN' | 'RESOLVED') {
    setBusy(true)
    await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setBusy(false)
    router.refresh()
  }

  async function remove() {
    if (!confirm('Eliminare definitivamente questo annuncio?')) return
    setBusy(true)
    const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    setBusy(false)
    if (response.ok) {
      router.push('/profilo')
      router.refresh()
    }
  }

  return (
    <div className="card">
      <h2>Gestisci il tuo annuncio</h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {status === 'OPEN' ? (
          <button
            type="button"
            className="btn block"
            onClick={() => setStatus('RESOLVED')}
            disabled={busy}
          >
            {RESOLVED_LABEL[kind] ?? 'Chiudi l annuncio'}
          </button>
        ) : (
          <button
            type="button"
            className="btn secondary block"
            onClick={() => setStatus('OPEN')}
            disabled={busy}
          >
            Riapri l annuncio
          </button>
        )}
        <button type="button" className="btn danger block" onClick={remove} disabled={busy}>
          Elimina
        </button>
      </div>
    </div>
  )
}
