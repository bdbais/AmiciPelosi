'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { reverseGeocode, useGeolocation } from '@/lib/useGeolocation'
import { readJson, type ApiError } from '@/lib/http'
import { PET_STATUSES, type PetStatus } from '@/lib/constants'

/**
 * Le due decisioni che riguardano una scheda: chi la vede, e il giorno brutto.
 *
 * Sono insieme perche' sono le uniche due cose che cambiano lo stato delle
 * cose. Tutto il resto - le foto, il diario - si aggiunge e basta.
 */
export function PetActions({
  petId,
  petName,
  shared,
  hasPhotos,
  status,
}: {
  petId: string
  petName: string
  shared: boolean
  hasPhotos: boolean
  status: string
}) {
  const router = useRouter()
  const { locate, loading } = useGeolocation()
  const [isShared, setIsShared] = useState(shared)
  const [state, setState] = useState<PetStatus>((status as PetStatus) in PET_STATUSES ? (status as PetStatus) : 'ACTIVE')
  const [changing, setChanging] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [place, setPlace] = useState<{ lat: number; lng: number; address: string; city: string } | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /**
   * Un PATCH sulla scheda. L'interfaccia cambia subito, per non far aspettare;
   * se poi il server non risponde si torna indietro e lo si dice, altrimenti
   * la spunta resta accesa su una cosa che non e' mai stata salvata.
   */
  async function patch(body: Record<string, unknown>, undo: () => void, failure: string) {
    setError(null)
    try {
      const response = await fetch(`/api/pets/${petId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        undo()
        setError(json.error ?? failure)
        return
      }
      router.refresh()
    } catch {
      undo()
      setError(`${failure} Controlla la connessione e riprova.`)
    }
  }

  function toggleShare() {
    const next = !isShared
    setIsShared(next)
    return patch(
      { sharedWithCircle: next },
      () => setIsShared(!next),
      'Non sono riuscito a cambiare chi la vede.',
    )
  }

  function changeStatus(next: PetStatus) {
    const before = state
    setState(next)
    setChanging(false)
    return patch({ status: next }, () => setState(before), 'Non sono riuscito a cambiare lo stato.')
  }

  async function findPlace() {
    const coords = await locate()
    if (!coords) return
    const resolved = await reverseGeocode(coords.lat, coords.lng)
    setPlace({
      lat: coords.lat,
      lng: coords.lng,
      address: resolved?.address ?? '',
      city: resolved?.city ?? '',
    })
  }

  async function publishLost() {
    if (!place) return
    setError(null)
    setBusy(true)

    try {
      const response = await fetch(`/api/pets/${petId}/smarrito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...place, description }),
      })
      const json = await readJson<ApiError & { post?: { id: string } }>(response)

      if (!response.ok || !json.post) {
        setError(json.error ?? 'Non sono riuscito a pubblicare.')
        return
      }

      router.push(`/annunci/${json.post.id}?pubblicato=1`)
    } catch {
      setError('Non sono riuscito a pubblicare: controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      {error && !lostOpen && <div className="alert error">{error}</div>}
      <div className="card">
        <h2>Chi può vederlo</h2>
        <label className="checkbox">
          <input type="checkbox" checked={isShared} onChange={toggleShare} />
          Condividi questa scheda con le mie persone fidate
        </label>
        <p className="section-hint" style={{ margin: 0 }}>
          {isShared
            ? 'Le persone a cui hai dato la chiave vedono la scheda e il diario. Nessun altro, mai.'
            : 'Adesso la vedi solo tu. Nemmeno le persone fidate, finché non accendi questa riga.'}
        </p>
      </div>

      <div className="card">
        <h2>A che punto è la sua storia</h2>
        {!changing ? (
          <>
            <p className="section-hint">
              Adesso: <strong>{PET_STATUSES[state].label}</strong>. {PET_STATUSES[state].hint}
            </p>
            <button type="button" className="btn ghost small" onClick={() => setChanging(true)}>
              Cambia
            </button>
          </>
        ) : (
          <div className="stack">
            {(Object.keys(PET_STATUSES) as PetStatus[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`btn block ${key === state ? '' : 'secondary'}`}
                onClick={() => changeStatus(key)}
              >
                {PET_STATUSES[key].label}
              </button>
            ))}
            <button type="button" className="btn ghost block" onClick={() => setChanging(false)}>
              Lascia com è
            </button>
          </div>
        )}
      </div>

      {state === 'ACTIVE' && (
      <div className="card">
        <h2>Se dovesse sparire</h2>
        {!lostOpen ? (
          <>
            <p className="section-hint">
              Pubblica l&apos;annuncio con le foto che hai già preparato, senza cercare niente. È
              il motivo per cui questa scheda esiste.
            </p>
            <button type="button" className="btn secondary" onClick={() => setLostOpen(true)}>
              🔎 {petName} è sparito
            </button>
          </>
        ) : (
          <div className="stack">
            {error && <div className="alert error">{error}</div>}
            <div className="alert info">
              <strong>Da qui in poi diventa pubblico.</strong> Le tre foto di {petName} vengono
              copiate nell&apos;annuncio e le vedrà chiunque — è quello che serve perché qualcuno lo
              riconosca. La scheda privata resta com&apos;è, e il libretto sanitario non esce di
              casa.
              {!hasPhotos && ' Attenzione: non hai ancora caricato nessuna foto.'}
            </div>
            <button type="button" className="btn secondary small" onClick={findPlace} disabled={loading}>
              {loading ? 'Cerco…' : place ? `📍 ${place.address || 'Posizione presa'}` : '📍 Da dove è sparito'}
            </button>
            <label className="field">
              <span>Cosa è successo</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Es. Scappato durante i fuochi, è molto timido con gli sconosciuti"
                maxLength={2000}
              />
            </label>
            <div className="inline">
              <button type="button" className="btn ghost small" onClick={() => setLostOpen(false)}>
                Annulla
              </button>
              <span className="spacer" />
              <button type="button" className="btn" onClick={publishLost} disabled={busy || !place}>
                {busy ? 'Pubblico…' : 'Pubblica e avvisa la zona'}
              </button>
            </div>
            {!place && (
              <p className="section-hint" style={{ margin: 0 }}>
                Serve la zona: è quella che fa squillare i telefoni giusti.
              </p>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
