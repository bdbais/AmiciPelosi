import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ACCOUNT_TYPES, type AccountType } from '@/lib/constants'
import { publicProfile } from '@/lib/people'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/**
 * Il profilo pubblico di una persona.
 *
 * Risponde a una domanda sola, "di chi mi sto fidando?", con tre numeri e una
 * data. Non c'e' un recapito, non c'e' un'email, non c'e' una posizione, e
 * non ci devono arrivare: sono le tre cose che questo sito ha promesso di non
 * mostrare mai, e un profilo e' esattamente il posto dove qualcuno prima o
 * poi proverebbe a rimetterle.
 */
export default async function PersonPage({ params }: Props) {
  const { id } = await params
  const person = await publicProfile(id)
  if (!person) notFound()

  const type = ACCOUNT_TYPES[person.accountType as AccountType]
  const since =
    person.accountAgeDays === 0
      ? 'da oggi'
      : person.accountAgeDays === 1
        ? 'da ieri'
        : person.accountAgeDays < 60
          ? `da ${person.accountAgeDays} giorni`
          : person.accountAgeDays < 730
            ? `da ${Math.floor(person.accountAgeDays / 30)} mesi`
            : `da ${Math.floor(person.accountAgeDays / 365)} anni`

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <p style={{ marginTop: 18 }}>
        <Link href="/bacheca" className="muted small">
          ← Torna alla bacheca
        </Link>
      </p>

      <div className="inline" style={{ marginBottom: 6 }}>
        {type && person.accountType !== 'PERSON' && (
          <span className="badge account">
            {type.emoji} {type.label}
          </span>
        )}
        <span className="small muted">Qui {since}</span>
      </div>
      <h1 className="page-title" style={{ marginTop: 0 }}>
        {person.name}
      </h1>

      <div className="card">
        <div className="person-stats">
          <div>
            <span className="ps-n">{person.published}</span>
            <span className="ps-l">annunci pubblicati</span>
          </div>
          <div>
            <span className="ps-n">{person.answered}</span>
            <span className="ps-l">annunci a cui ha risposto</span>
          </div>
          <div>
            <span className="ps-n">❤️ {person.thanks}</span>
            <span className="ps-l">grazie ricevuti</span>
          </div>
        </div>
        <p className="section-hint" style={{ margin: 0 }}>
          Un grazie lo dà solo chi ha pubblicato un annuncio, a chi l&apos;ha aiutato davvero:
          con una segnalazione, o dopo avergli dato il contatto. Non si compra e non si chiede.
        </p>
      </div>

      <div className="card">
        <h2>Per contattarla</h2>
        <p className="section-hint" style={{ margin: 0 }}>
          Qui non trovi un telefono né un&apos;email, e non li trovi da nessuna parte: si chiedono
          dall&apos;annuncio, e a decidere se darli è lei.
        </p>
      </div>
    </div>
  )
}
