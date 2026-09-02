'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { PET_PHOTO_SLOTS, SPECIES, SEXES, type PetPhotoSlot } from '@/lib/constants'
import { readJson, type ApiError } from '@/lib/http'
import { resizeImageFile, UNREADABLE_PHOTO } from '@/lib/resizeImage'
import { LibrettoScanner } from './LibrettoScanner'

/**
 * La scheda di un animale di casa.
 *
 * Le tre foto hanno posizioni fisse - muso, fianco sinistro, fianco destro -
 * perche' non sono decorazione: sono quelle che si mandano il giorno in cui
 * sparisce, e servono proprio quelle inquadrature.
 */
/** Una scheda gia' scritta, da riaprire e correggere. */
export type PetInitial = {
  id: string
  name: string
  species: string
  breed: string | null
  sex: string | null
  birthDate: string | null
  color: string | null
  microchip: string | null
  notes: string | null
  intakeDate: string | null
  exitDate: string | null
  neutered: boolean | null
  vaccinated: boolean | null
  tested: string | null
  goodWithCats: boolean | null
  goodWithDogs: boolean | null
  goodWithKids: boolean | null
  careNotes: string | null
}

/** I tre stati che nel modulo sono una tendina: si', no, non lo so. */
function triText(value: boolean | null | undefined) {
  return value === true ? 'true' : value === false ? 'false' : ''
}

export function PetForm({
  isOrg = false,
  initial,
  onDone,
}: {
  isOrg?: boolean
  initial?: PetInitial
  onDone?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(Boolean(initial))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Partial<Record<PetPhotoSlot, string>>>({})
  // Questi due li puo compilare la lettura del libretto, quindi li teniamo noi.
  const [microchip, setMicrochip] = useState(initial?.microchip ?? '')
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '')
  const [libretto, setLibretto] = useState<File | null>(null)
  // Le foto gia' passate dalla canvas, una per casella: sono queste che partono,
  // mai quelle scelte nel modulo. Il passaggio toglie l'EXIF con le coordinate
  // GPS, e le foto di un animale di casa sono scattate quasi sempre a casa.
  const [ready, setReady] = useState<Partial<Record<PetPhotoSlot, File>>>({})
  const [preparing, setPreparing] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  async function onSlotChosen(slot: PetPhotoSlot, picked: File | null, input: HTMLInputElement) {
    setError(null)
    // Al lettore del libretto va l'originale: la lettura resta sul telefono, e
    // a piena risoluzione i numeri si leggono meglio. In rete va la copia ridotta.
    if (slot === 'DOCUMENT') setLibretto(picked)
    if (!picked) {
      setChosen((prev) => ({ ...prev, [slot]: undefined }))
      setReady((prev) => ({ ...prev, [slot]: undefined }))
      return
    }
    setPreparing((n) => n + 1)
    try {
      const resized = await resizeImageFile(picked)
      if (!resized) {
        input.value = ''
        setChosen((prev) => ({ ...prev, [slot]: undefined }))
        setReady((prev) => ({ ...prev, [slot]: undefined }))
        if (slot === 'DOCUMENT') setLibretto(null)
        setError(UNREADABLE_PHOTO)
        return
      }
      setChosen((prev) => ({ ...prev, [slot]: picked.name }))
      setReady((prev) => ({ ...prev, [slot]: resized }))
    } finally {
      setPreparing((n) => n - 1)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSending(true)

    const body = new FormData(event.currentTarget)
    // Il modulo ha dentro i file originali: si sostituiscono con quelli passati
    // dalla canvas, e dove non ce n'e' uno pronto la casella si toglie del tutto,
    // cosi' un originale non parte mai, nemmeno per sbaglio.
    for (const slot of Object.keys(PET_PHOTO_SLOTS) as PetPhotoSlot[]) {
      const file = ready[slot]
      if (file) body.set(`photo_${slot}`, file)
      else body.delete(`photo_${slot}`)
    }

    try {
      const response = await fetch(initial ? `/api/pets/${initial.id}` : '/api/pets', {
        method: initial ? 'PATCH' : 'POST',
        body,
      })

      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a salvare la scheda.')
        return
      }

      if (!initial) {
        formRef.current?.reset()
        setChosen({})
        setReady({})
        setMicrochip('')
        setBirthDate('')
        setLibretto(null)
        setOpen(false)
      }
      onDone?.()
      router.refresh()
    } catch {
      setError('Non sono riuscito a salvare la scheda: controlla la connessione e riprova.')
    } finally {
      setSending(false)
    }
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
          <input type="text" name="name" defaultValue={initial?.name} required maxLength={60} placeholder="Es. Pongo" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Specie</span>
            <select name="species" defaultValue={initial?.species ?? 'DOG'}>
              {Object.entries(SPECIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.emoji} {value.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sesso</span>
            <select name="sex" defaultValue={initial?.sex ?? ''}>
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
            <input type="text" name="breed" defaultValue={initial?.breed ?? undefined} maxLength={60} placeholder="Meticcio" />
          </label>
          <label className="field">
            <span>Colore e segni</span>
            <input type="text" name="color" defaultValue={initial?.color ?? undefined} maxLength={60} placeholder="Marrone, macchia bianca" />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Data di nascita</span>
            <input
              type="date"
              name="birthDate"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Microchip</span>
            <input
              type="text"
              name="microchip"
              maxLength={40}
              placeholder="380260012345678"
              value={microchip}
              onChange={(event) => setMicrochip(event.target.value)}
            />
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
          {initial
            ? ' Quelle che carichi adesso sostituiscono le vecchie, una casella per volta: le altre restano dove sono.'
            : ''}
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
                  void onSlotChosen(slot, event.target.files?.[0] ?? null, event.target)
                }
              />
              {chosen[slot] && <span className="ps-ok">✓ {chosen[slot]}</span>}
            </label>
          ))}
        </div>

        {/*
          Fuori dalle etichette, non dentro: un pulsante dentro una <label>
          riapre il selettore di file invece di fare il suo mestiere.
        */}
        <LibrettoScanner
          file={libretto}
          onFound={(found) => {
            if (found.microchip) setMicrochip(found.microchip)
            if (found.birthDate) setBirthDate(found.birthDate)
          }}
        />
      </div>

      {isOrg && (
        <div className="card">
          <h3>Per la gestione</h3>
          <p className="section-hint">
            Serve a voi e a chi adotta: sono le cose che al telefono vi chiedono venti volte.
          </p>
          <div className="field-row">
            <label className="field">
              <span>Entrato il</span>
              <input type="date" name="intakeDate" defaultValue={initial?.intakeDate ?? undefined} />
            </label>
            <label className="field">
              <span>Uscito il</span>
              <input type="date" name="exitDate" defaultValue={initial?.exitDate ?? undefined} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Sterilizzato</span>
              <select name="neutered" defaultValue={triText(initial?.neutered)}>
                <option value="">Non indicato</option>
                <option value="true">Sì</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="field">
              <span>Vaccinato</span>
              <select name="vaccinated" defaultValue={triText(initial?.vaccinated)}>
                <option value="">Non indicato</option>
                <option value="true">Sì</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Esami fatti</span>
            <input type="text" name="tested" defaultValue={initial?.tested ?? undefined} maxLength={120} placeholder="Es. FIV e FeLV negativi, test del 3/2026" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Con altri gatti</span>
              <select name="goodWithCats" defaultValue={triText(initial?.goodWithCats)}>
                <option value="">Non so</option>
                <option value="true">Sì</option>
                <option value="false">Meglio di no</option>
              </select>
            </label>
            <label className="field">
              <span>Con i cani</span>
              <select name="goodWithDogs" defaultValue={triText(initial?.goodWithDogs)}>
                <option value="">Non so</option>
                <option value="true">Sì</option>
                <option value="false">Meglio di no</option>
              </select>
            </label>
            <label className="field">
              <span>Con i bambini</span>
              <select name="goodWithKids" defaultValue={triText(initial?.goodWithKids)}>
                <option value="">Non so</option>
                <option value="true">Sì</option>
                <option value="false">Meglio di no</option>
              </select>
            </label>
          </div>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Cure in corso, o cose da sapere</span>
            <textarea
              name="careNotes"
              defaultValue={initial?.careNotes ?? undefined}
              maxLength={2000}
              placeholder="Terapie, diete, paure, com è arrivato"
            />
          </label>
        </div>
      )}

      <div className="card">
        <h3>Qualsiasi altra cosa</h3>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Note</span>
          <textarea
            name="notes"
            defaultValue={initial?.notes ?? undefined}
            maxLength={2000}
            placeholder="Come si comporta con gli sconosciuti, di cosa ha paura, allergie, cure in corso"
          />
        </label>
      </div>

      <div className="inline">
        <button
          type="button"
          className="btn ghost"
          onClick={() => (initial ? onDone?.() : setOpen(false))}
        >
          Annulla
        </button>
        <span className="spacer" />
        <button type="submit" className="btn" disabled={sending || preparing > 0}>
          {sending
            ? 'Salvo…'
            : preparing > 0
              ? 'Preparo le foto…'
              : initial
                ? 'Salva le correzioni'
                : 'Salva la scheda'}
        </button>
      </div>
    </form>
  )
}
