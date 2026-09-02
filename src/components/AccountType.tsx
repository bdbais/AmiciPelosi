'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ACCOUNT_TYPES, type AccountType as Kind } from '@/lib/constants'
import { readJson, type ApiError } from '@/lib/http'
import { LocationField } from './LocationField'
import type { Coords } from '@/lib/useGeolocation'

/**
 * Chi sei, detto una volta sola.
 *
 * Un canile scrive i propri dati e non li riscrive piu; un veterinario diventa
 * scegliibile da chi vuole mandargli la scheda sanitaria del proprio animale.
 * Una persona non deve compilare niente.
 */
/** I dati dell'ente gia' scritti, che il modulo deve rimostrare. */
export type OrgData = {
  orgName: string | null
  orgAddress: string | null
  orgCity: string | null
  orgPhone: string | null
  orgEmail: string | null
  orgSite: string | null
  orgHours: string | null
  orgFacebook: string | null
  orgInstagram: string | null
  orgLat: number | null
  orgLng: number | null
}

export function AccountType({ current, org }: { current: string; org?: OrgData }) {
  const router = useRouter()
  const [kind, setKind] = useState<Kind>((current as Kind) in ACCOUNT_TYPES ? (current as Kind) : 'PERSON')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  // La posizione della struttura: la scrivono una volta e poi la ereditano
  // tutti gli animali che pubblicano, senza rimetterla ogni volta.
  const [where, setWhere] = useState<Coords | null>(
    org?.orgLat != null && org?.orgLng != null ? { lat: org.orgLat, lng: org.orgLng } : null,
  )

  const needsOrg = kind !== 'PERSON' && kind !== 'VET' && kind !== 'COLONY'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          accountType: kind,
          orgLat: where?.lat,
          orgLng: where?.lng,
        }),
      })

      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a salvare.')
        return
      }

      setSaved(true)
      router.refresh()
    } catch {
      setError('Non sono riuscito a salvare: controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert info">Salvato.</div>}

      <div className="account-picks">
        {(Object.keys(ACCOUNT_TYPES) as Kind[]).map((key) => (
          <button
            type="button"
            key={key}
            className={`account-pick${kind === key ? ' active' : ''}`}
            onClick={() => {
              setKind(key)
              setSaved(false)
            }}
          >
            <span className="ap-mark" aria-hidden="true">
              {ACCOUNT_TYPES[key].emoji}
            </span>
            <span className="ap-body">
              <strong>{ACCOUNT_TYPES[key].label}</strong>
              <em>{ACCOUNT_TYPES[key].hint}</em>
            </span>
          </button>
        ))}
      </div>

      {kind === 'VET' && (
        <div className="alert info">
          <strong>Cosa cambia.</strong> Chi ti conosce potrà darti la <strong>scheda sanitaria</strong>{' '}
          dei suoi animali: identità, microchip, libretto e le visite registrate. Non il resto del
          diario, e non gli appunti di famiglia. È il proprietario a scegliere te, uno per uno, e
          può revocare in qualsiasi momento.
        </div>
      )}

      {/*
        Una colonia non ha un nome da struttura, un telefono, un orario: ha un
        posto. Si riusa la posizione dell'ente, perche' e' la stessa domanda -
        "da dove partono i tuoi annunci" - con una risposta diversa.
      */}
      {kind === 'COLONY' && (
        <div className="card">
          <h3>Dove sta la colonia</h3>
          <p className="section-hint">
            Non compare in nessuna pagina: serve a far partire i tuoi annunci già posizionati, e a
            far arrivare prima a te un gatto ritrovato lì vicino. Per il resto vali come una persona:
            niente inserimento in blocco, niente bollino di ente.
          </p>
          <LocationField value={where} onChange={setWhere} radiusKm={2} emoji="🐈‍⬛" />
          <label className="field" style={{ marginTop: 14 }}>
            <span>Comune</span>
            <input type="text" name="orgCity" defaultValue={org?.orgCity ?? undefined} maxLength={80} />
          </label>
        </div>
      )}

      {needsOrg && (
        <div className="card">
          <h3>I dati della struttura</h3>
          <p className="section-hint">
            Si scrivono adesso e non si riscrivono più: valgono per ogni animale che pubblicate.
          </p>
          <label className="field">
            <span>Nome</span>
            <input type="text" name="orgName" defaultValue={org?.orgName ?? undefined} maxLength={120} placeholder="Es. Rifugio Le Zampe" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Indirizzo</span>
              <input type="text" name="orgAddress" defaultValue={org?.orgAddress ?? undefined} maxLength={200} />
            </label>
            <label className="field">
              <span>Comune</span>
              <input type="text" name="orgCity" defaultValue={org?.orgCity ?? undefined} maxLength={80} />
            </label>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <span className="label">Dove siete sulla mappa</span>
            <p className="hint" style={{ marginTop: 0 }}>
              Tocca il punto giusto: da qui in poi ogni animale che pubblicate parte già
              posizionato, e chi cerca nel raggio di pochi chilometri vi trova.
            </p>
            <LocationField value={where} onChange={setWhere} radiusKm={2} emoji="🏛️" />
          </div>

          <div className="field-row">
            <label className="field">
              <span>Telefono</span>
              <input type="text" name="orgPhone" defaultValue={org?.orgPhone ?? undefined} maxLength={30} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="text" name="orgEmail" defaultValue={org?.orgEmail ?? undefined} maxLength={120} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Sito</span>
              <input type="text" name="orgSite" defaultValue={org?.orgSite ?? undefined} maxLength={200} />
            </label>
            <label className="field">
              <span>Quando siete aperti</span>
              <input type="text" name="orgHours" defaultValue={org?.orgHours ?? undefined} maxLength={120} placeholder="Visite 9–12 e 15–17" />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Pagina Facebook</span>
              <input type="text" name="orgFacebook" defaultValue={org?.orgFacebook ?? undefined} maxLength={200} placeholder="facebook.com/…" />
            </label>
            <label className="field">
              <span>Instagram</span>
              <input type="text" name="orgInstagram" defaultValue={org?.orgInstagram ?? undefined} maxLength={200} placeholder="@nomeprofilo" />
            </label>
          </div>
          <p className="section-hint">
            Servono a ricordarvele al momento giusto: quando pubblicate un&apos;adozione, l&apos;app
            vi prepara il testo da incollare lì, con il collegamento all&apos;annuncio.
          </p>
          <p className="section-hint" style={{ margin: 0 }}>
            Il bollino di ente verificato lo mette una persona dopo un controllo: chiunque
            potrebbe scrivere «canile» in un modulo. Nel frattempo potete pubblicare lo stesso.
          </p>
        </div>
      )}

      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Salvo…' : 'Salva'}
      </button>
    </form>
  )
}
