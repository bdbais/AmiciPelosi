import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { listPosts } from '@/lib/queries'
import { PostCard } from '@/components/PostCard'
import { AccountType } from '@/components/AccountType'
import { listPetsOf } from '@/lib/pets'
import { isOrg } from '@/lib/constants'
import { acceptedRequestsFor, pendingRequestsFor } from '@/lib/contacts'
import { publicProfile } from '@/lib/people'
import { ContactRequestList } from '@/components/ContactRequestList'
import { DeleteAccount } from '@/components/DeleteAccount'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Il mio profilo - Amici Pelosi' }

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ benvenuto?: string }>
}) {
  const { benvenuto } = await searchParams
  const user = await currentUser()
  if (!user) redirect('/accedi')

  const [posts, myPets, requests, accepted, me] = await Promise.all([
    listPosts({ authorId: user.id, status: 'ALL', take: 100 }),
    listPetsOf(user.id),
    pendingRequestsFor(user.id),
    acceptedRequestsFor(user.id),
    publicProfile(user.id),
  ])

  const open = posts.filter((post) => post.status === 'OPEN')
  const closed = posts.filter((post) => post.status === 'RESOLVED')
  const role = user.role

  return (
    <div className="container">
      <h1 className="page-title">Ciao {user.name.split(' ')[0]} 👋</h1>
      <p className="page-sub">{user.email}</p>

      {(role === 'MODERATOR' || role === 'ADMIN') && (
        <p className="small" style={{ marginTop: -6 }}>
          {role === 'ADMIN' ? 'Sei amministratore' : 'Sei moderatore'}:{' '}
          <Link href="/admin">vai alla moderazione</Link>.
        </p>
      )}

      {/*
        Gli stessi tre numeri che vede chiunque apra il profilo pubblico: cosi'
        nessuno scopre da un altro cosa si dice di lui.
      */}
      <div className="card">
        <h2>Cosa hai fatto qui</h2>
        <div className="person-stats">
          <div>
            <span className="ps-n">{me?.published ?? 0}</span>
            <span className="ps-l">annunci pubblicati</span>
          </div>
          <div>
            <span className="ps-n">{me?.answered ?? 0}</span>
            <span className="ps-l">annunci a cui hai risposto</span>
          </div>
          <div>
            <span className="ps-n">❤️ {me?.thanks ?? 0}</span>
            <span className="ps-l">grazie ricevuti</span>
          </div>
        </div>
        <Link href={`/persone/${user.id}`} className="btn secondary small">
          Come ti vedono gli altri
        </Link>
      </div>

      <div className="card">
        <h2>I miei animali</h2>
        <p className="section-hint">
          La scheda privata di chi vive con te: le tre foto che servirebbero se sparisse, il
          microchip, il libretto e il diario della sua vita. Non la vede nessuno, a meno che tu non
          decida diversamente.
        </p>
        <Link href="/profilo/animali" className="btn secondary small">
          {myPets.length > 0 ? `Apri le tue schede (${myPets.length})` : 'Aggiungi il primo'}
        </Link>
      </div>

      <div className="card">
        <h2>Chi ti ha chiesto il contatto{requests.length > 0 && ` (${requests.length})`}</h2>
        <p className="section-hint">
          Il tuo numero non è pubblico: lo dai tu, a chi vuoi. Leggi cosa ti scrivono e decidi.
        </p>
        <ContactRequestList requests={requests} accepted={accepted} />
      </div>

      {isOrg(user.accountType) && (
        <div className="card">
          <h2>Inserimento rapido</h2>
          <p className="section-hint">
            Per chi ne ha venti da piazzare e non uno: zona e contatti si scrivono una volta, poi
            si va avanti a raffica.
          </p>
          <Link href="/profilo/enti" className="btn secondary small">
            ⚡ Inserisci in blocco
          </Link>
        </div>
      )}

      {benvenuto && (
        <div className="alert" style={{ borderColor: 'var(--brand)', background: 'var(--brand-soft)' }}>
          <strong>Benvenuto.</strong> Dicci chi sei qui sotto, poi{' '}
          <Link href="/notifiche?benvenuto=1" style={{ textDecoration: 'underline' }}>
            attiva gli avvisi della tua zona
          </Link>
          : è lì che il sito comincia a servire.
        </div>
      )}

      <div className="card" id="tipo">
        <h2>Chi sei</h2>
        <p className="section-hint">
          Serve a due cose: aprire l&apos;inserimento in blocco a canili, gattili e associazioni, e
          permettere a chi lo vuole di mandare la scheda sanitaria al proprio veterinario.
        </p>
        <AccountType
          current={user.accountType}
          org={{
            orgName: user.orgName,
            orgAddress: user.orgAddress,
            orgCity: user.orgCity,
            orgPhone: user.orgPhone,
            orgEmail: user.orgEmail,
            orgSite: user.orgSite,
            orgHours: user.orgHours,
            orgFacebook: user.orgFacebook,
            orgInstagram: user.orgInstagram,
            orgLat: user.orgLat,
            orgLng: user.orgLng,
          }}
        />
      </div>

      <div className="card">
        <h2>Il tuo account</h2>
        <p className="section-hint">
          Puoi andartene quando vuoi, e portare via tutto: è scritto nei termini d’uso ed è
          questo il pulsante che lo fa.
        </p>
        <DeleteAccount email={user.email} />
      </div>

      <div className="card">
        <h2>La tua zona di avviso</h2>
        <p className="section-hint">
          {user.alertLat != null
            ? `${user.alertCity || 'Zona impostata'} · raggio ${user.alertRadiusKm} km · avvisi ${
                user.alertsEnabled ? 'attivi' : 'sospesi'
              }`
            : 'Non hai ancora impostato la tua zona.'}
        </p>
        <Link href="/notifiche" className="btn secondary small">
          Gestisci notifiche
        </Link>
      </div>

      <h2 className="page-title" style={{ fontSize: '1.2rem' }}>
        Annunci attivi ({open.length})
      </h2>
      {open.length === 0 ? (
        <p className="muted small">
          Nessun annuncio attivo. <Link href="/nuovo">Pubblicane uno</Link>.
        </p>
      ) : (
        <div className="grid">
          {open.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="page-title" style={{ fontSize: '1.2rem' }}>
            Storico ({closed.length})
          </h2>
          <div className="grid">
            {closed.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
