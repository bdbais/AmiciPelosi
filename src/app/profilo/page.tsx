import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { listPosts } from '@/lib/queries'
import { PostCard } from '@/components/PostCard'
import { AccountType } from '@/components/AccountType'
import { listPetsOf } from '@/lib/pets'
import { pendingRequestsFor } from '@/lib/contacts'
import { ContactRequestList } from '@/components/ContactRequestList'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Il mio profilo - Amici Pelosi' }

export default async function ProfilePage() {
  const user = await currentUser()
  if (!user) redirect('/accedi')

  const [posts, myPets, requests] = await Promise.all([
    listPosts({ authorId: user.id, status: 'ALL', take: 100 }),
    listPetsOf(user.id),
    pendingRequestsFor(user.id),
  ])

  const open = posts.filter((post) => post.status === 'OPEN')
  const closed = posts.filter((post) => post.status === 'RESOLVED')

  return (
    <div className="container">
      <h1 className="page-title">Ciao {user.name.split(' ')[0]} 👋</h1>
      <p className="page-sub">{user.email}</p>

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
        <ContactRequestList requests={requests} />
      </div>

      <div className="card">
        <h2>Chi sei</h2>
        <p className="section-hint">
          Serve a due cose: aprire l&apos;inserimento in blocco a canili, gattili e associazioni, e
          permettere a chi lo vuole di mandare la scheda sanitaria al proprio veterinario.
        </p>
        <AccountType current={user.accountType} />
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
