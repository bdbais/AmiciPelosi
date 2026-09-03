'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ACCOUNT_TYPES, type AccountType as Kind } from '@/lib/constants'
import { readJson, type ApiError } from '@/lib/http'
import { formatDate } from '@/lib/format'
import { LocationField } from './LocationField'
import { OrgLogo } from './OrgLogo'
import { resizeLogo, UNREADABLE_PHOTO } from '@/lib/resizeImage'
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

/** A che punto e' la verifica di chi si e' dichiarato ente. */
export type VerificationState = {
  status: string
  proofUrl: string | null
  /** ISO: e' la data della decisione, anche per un rifiuto. */
  verifiedAt: string | null
  /** Il motivo del rifiuto, o la nota di chi ha approvato. */
  note: string | null
}

/** Il logo dell'ente com'e' adesso: l'ora del caricamento, o null se non c'e'. */
export type LogoState = {
  userId: string
  /** ISO dell'ultimo caricamento: cambia l'indirizzo dell'immagine, cosi' il browser non tiene la vecchia. */
  uploadedAt: string | null
}

export function AccountType({
  current,
  org,
  verification,
  logo,
}: {
  current: string
  org?: OrgData
  verification?: VerificationState
  logo?: LogoState
}) {
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
  const status = verification?.status ?? 'NONE'
  // Cambiare tipo rifa' la verifica da capo: lo stato mostrato vale solo
  // per il tipo con cui e' stata chiesta.
  const sameKind = kind === current

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

      {/*
        Lo stato della verifica, prima di tutto il resto: e' la risposta alla
        domanda «perche' non mi si apre l'inserimento in blocco».
      */}
      {kind !== 'PERSON' && sameKind && status === 'PENDING' && (
        <div className="alert info">
          <strong>In attesa di verifica.</strong>{' '}
          {verification?.proofUrl
            ? `Chi modera guarderà ${verification.proofUrl} e poi decide.`
            : 'Non hai ancora dato un link: mettilo qui sotto, altrimenti chi modera non ha niente da guardare.'}{' '}
          Fino ad allora vali come una persona.
        </div>
      )}
      {kind !== 'PERSON' && sameKind && status === 'VERIFIED' && (
        <div className="alert info">
          <strong>✓ Verificato</strong>
          {verification?.verifiedAt ? ` il ${formatDate(verification.verifiedAt)}` : ''}.
          {verification?.note ? ` ${verification.note}` : ''} Se cambi tipo, la verifica si rifà.
        </div>
      )}
      {kind !== 'PERSON' && sameKind && status === 'REJECTED' && (
        <div className="alert error">
          <strong>Rifiutato:</strong> {verification?.note ?? 'senza un motivo scritto'}. Puoi ripresentare
          la richiesta con un altro link, qui sotto.
        </div>
      )}
      {kind !== 'PERSON' && !sameKind && (
        <p className="section-hint">
          Chi modera deve approvarti prima che il tipo valga: fino ad allora pubblichi come una
          persona.
        </p>
      )}

      {kind !== 'PERSON' && (
        <label className="field">
          <span>Un link che dimostri chi sei *</span>
          <input
            type="url"
            name="proofUrl"
            required
            maxLength={300}
            defaultValue={verification?.proofUrl ?? undefined}
            placeholder="https://…"
          />
          <p className="hint" style={{ marginTop: 4 }}>
            Il sito, la pagina Facebook o Instagram, l’iscrizione all’albo: chi modera lo guarda
            prima di approvarti.
          </p>
        </label>
      )}

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
            Il bollino di ente lo mette una persona dopo aver guardato il link qui sopra: chiunque
            potrebbe scrivere «canile» in un modulo. Nel frattempo potete pubblicare lo stesso, come
            una persona.
          </p>
        </div>
      )}

      {/*
        Il logo sta fuori dal modulo dei dati: e' un file, parte da solo e non
        aspetta il «Salva». Si carica solo se il tipo dichiarato e' gia' stato
        salvato come ente (sameKind): prima il server lo rifiuterebbe, e un
        tasto che porta a un errore e' peggio di un tasto che non c'e'.
      */}
      {needsOrg && sameKind && logo && (
        <LogoField logo={logo} verified={status === 'VERIFIED'} />
      )}

      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Salvo…' : 'Salva'}
      </button>
    </form>
  )
}

/**
 * Carica, mostra e toglie il logo dell'ente.
 *
 * Il file viene ridotto nel browser a un quadrato di 256 pixel prima di
 * partire, come le foto degli annunci: il server accetta un MB e non di
 * piu', e un PNG da telefono ne pesa dieci. L'anteprima la si vede anche in
 * attesa di verifica, ma con la scritta che lo dice: gli altri non lo
 * vedranno finche' una persona non ha approvato l'account.
 */
function LogoField({ logo, verified }: { logo: LogoState; verified: boolean }) {
  const router = useRouter()
  const [uploadedAt, setUploadedAt] = useState<string | null>(logo.uploadedAt)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const resized = await resizeLogo(file)
      if (!resized) {
        setError(UNREADABLE_PHOTO)
        return
      }
      const body = new FormData()
      body.append('file', resized)
      const response = await fetch('/api/me/logo', { method: 'POST', body })
      const json = await readJson<ApiError & { updatedAt?: string }>(response)
      if (!response.ok) {
        setError(json.error ?? 'Non sono riuscito a caricare il logo.')
        return
      }
      setUploadedAt(json.updatedAt ?? new Date().toISOString())
      router.refresh()
    } catch {
      setError('Non sono riuscito a caricare il logo: controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setError(null)
    setBusy(true)
    try {
      const response = await fetch('/api/me/logo', { method: 'DELETE' })
      if (!response.ok) {
        const json = await readJson<ApiError>(response)
        setError(json.error ?? 'Non sono riuscito a togliere il logo.')
        return
      }
      setUploadedAt(null)
      router.refresh()
    } catch {
      setError('Non sono riuscito a togliere il logo: controlla la connessione e riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Il logo</h3>
      <p className="section-hint">
        Compare accanto al vostro nome negli annunci e nel profilo. Solo il logo dell&apos;ente:
        niente foto di persone.
      </p>
      {error && <div className="alert error">{error}</div>}
      <div className="inline" style={{ gap: 14, alignItems: 'center' }}>
        {uploadedAt ? (
          <OrgLogo userId={logo.userId} version={uploadedAt} large />
        ) : (
          <span className="small muted">Nessun logo caricato.</span>
        )}
        <div className="stack" style={{ gap: 6 }}>
          <label className="btn secondary small" style={{ cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Attendi…' : uploadedAt ? 'Cambia il logo' : 'Carica il logo'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={upload}
              disabled={busy}
              style={{ display: 'none' }}
            />
          </label>
          {uploadedAt && (
            <button type="button" className="btn ghost small" onClick={remove} disabled={busy}>
              Togli
            </button>
          )}
        </div>
      </div>
      {uploadedAt && !verified && (
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          Lo vedranno gli altri dopo la verifica.
        </p>
      )}
    </div>
  )
}
