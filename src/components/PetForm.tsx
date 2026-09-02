'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { PET_PHOTO_SLOTS, SPECIES, SEXES, type PetPhotoSlot } from '@/lib/constants'
import { readJson, type ApiError } from '@/lib/http'

/**
 * La scheda di un animale di casa.
 *
 * Le tre foto hanno posizioni fisse - muso, fianco sinistro, fianco destro -
 * perche' non sono decorazione: sono quelle che si mandano il giorno in cui
 * sparisce, e servono proprio quelle inquadrature.
 */
export function PetForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Partial<Record<PetPhotoSlot, string>>>({})
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSending(true)

    const response = await fetch('/api/pets', {
      method: 'POST',
      body: new FormData(event.currentTarget),
    })

    if (!response.ok) {
      const json = await readJson<ApiError>(response)
      setError(json.error ?? 'Non sono riuscito a salvare la scheda.')
      setSending(false)
      return
    }

    formRef.current?.reset()
    setChosen({})
    setSending(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button type="button" className="btn block" onClick={() => setOpen(true)}>
        ➕ Aggiungi un animale
      </button>
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} className="stack">
      {error && <div className="alert error">{error}</div>}

      <div className="alert info">
        <strong>🔒 Questa scheda è tua e resta tua.</strong> Non finisce in bacheca, non compare
        nelle ricerche, non la vede nessuno. La compili adesso che è tutto tranquillo perché il
        giorno in cui dovesse servirti non avresti la testa per cercare tre foto buone. Se vuoi,
        puoi darne accesso a qualche persona fidata: lo decidi dopo, una per una, e puoi
        cambiare idea quando vuoi.
      </div>

      <div className="card">
        <h3>Chi è</h3>
        <label className="field">
          <span>Come si chiama</span>
          <input type="text" name="name" required maxLength={60} placeholder="Es. Pongo" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Specie</span>
            <select name="species" defaultValue="DOG">
              {Object.entries(SPECIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.emoji} {value.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sesso</span>
            <select name="sex" defaultValue="">
              <option value="">Non indicato</option>
              {Object.entries(SEXES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Razza</span>
            <input type="text" name="breed" maxLength={60} placeholder="Meticcio" />
          </label>
          <label className="field">
            <span>Colore e segni</span>
            <input type="text" name="color" maxLength={60} placeholder="Marrone, macchia bianca" />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Data di nascita</span>
            <input type="date" name="birthDate" />
          </label>
          <label className="field">
            <span>Microchip</span>
            <input type="text" name="microchip" maxLength={40} placeholder="380260012345678" />
          </label>
        </div>
        <p className="section-hint" style={{ margin: 0 }}>
          Il numero del microchip è la cosa che ritrova un animale più in fretta di qualunque
          annuncio. Se ce l&apos;hai sotto mano, scrivilo adesso: al canile lo leggono in un minuto.
        </p>
      </div>

      <div className="card">
        <h3>Le tre foto che contano</h3>
        <p className="section-hint">
          Chi lo incontra per strada lo vede di lato, non in posa. Per questo servono proprio
          queste tre inquadrature — e i due fianchi spesso non si somigliano.
        </p>
        <div className="pet-slots">
          {(Object.keys(PET_PHOTO_SLOTS) as PetPhotoSlot[]).map((slot) => (
            <label className="pet-slot" key={slot}>
              <span className="ps-title">{PET_PHOTO_SLOTS[slot].label}</span>
              <span className="ps-hint">{PET_PHOTO_SLOTS[slot].hint}</span>
              <input
                type="file"
                name={`photo_${slot}`}
                accept="image/*"
                onChange={(event) =>
                  setChosen((prev) => ({ ...prev, [slot]: event.target.files?.[0]?.name }))
                }
              />
              {chosen[slot] && <span className="ps-ok">✓ {chosen[slot]}</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Qualsiasi altra cosa</h3>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Note</span>
          <textarea
            name="notes"
            maxLength={2000}
            placeholder="Come si comporta con gli sconosciuti, di cosa ha paura, allergie, cure in corso"
          />
        </label>
      </div>

      <div className="inline">
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          Annulla
        </button>
        <span className="spacer" />
        <button type="submit" className="btn" disabled={sending}>
          {sending ? 'Salvo…' : 'Salva la scheda'}
        </button>
      </div>
    </form>
  )
}
