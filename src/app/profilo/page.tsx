import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { listPosts } from '@/lib/queries'
import { PostCard } from '@/components/PostCard'
import { AccountType } from '@/components/AccountType'
import { listPetsOf } from '@/lib/pets'
import { isOrg, effectiveAccountType, ACCOUNT_TYPES, type AccountType as Kind } from '@/lib/constants'
import { acceptedRequestsFor, pendingRequestsFor } from '@/lib/contacts'
import { publicProfile } from '@/lib/people'
import { ContactRequestList } from '@/components/ContactRequestList'
import { DeleteAccount } from '@/components/DeleteAccount'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Il mio profilo - Amici Pelosi' }

/** Una voce dell'elenco: dove porta, cosa e', e a destra un numero o uno stato. */
function MenuRow({
  href,
  icon,
  title,
  value,
  hot = false,
}: {
  href: string
  icon: string
  title: string
  value?: string
  hot?: boolean
}) {
  return (
    <Link href={href} className={hot ? 'hot' : undefined}>
      <span className="mi" aria-hidden="true">
        {icon}
      </span>
      <span className="mt">{title}</span>
      {value && <span className={`mv${hot ? ' hot' : ''}`}>{value}</span>}
    </Link>
  )
}

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
  const moderates = role === 'MODERATOR' || role === 'ADMIN'

  // Cosa ha detto di essere, e a che punto e' la verifica: la stessa frase
  // sta nel bollino in cima e nel riassunto di «Chi sei» chiuso.
  // undefined per una persona (o per un tipo che non conosciamo): e' il caso semplice.
  const declared =
    user.accountType !== 'PERSON' ? ACCOUNT_TYPES[user.accountType as Kind] : undefined
  const status = user.accountStatus
  const statusLabel =
    status === 'VERIFIED'
      ? 'verificato'
      : status === 'PENDING'
        ? 'in attesa di verifica'
        : status === 'REJECTED'
          ? 'rifiutato'
          : null
  const whoSummary = declared
    ? `${declared.label}${statusLabel ? ` · ${statusLabel}` : ''}`
    : 'Una persona'
  // «Chi sei» sta aperto solo se c'e' qualcosa da fare o da leggere li':
  // il primo arrivo, una verifica in corso, un rifiuto con il motivo.
  // (L'eta' dell'account non c'e' nella sessione: si fa senza.)
  const whoOpen = Boolean(benvenuto) || status === 'PENDING' || status === 'REJECTED'

  const zone =
    user.alertLat != null
      ? `${user.alertCity || 'zona impostata'} · ${user.alertRadiusKm} km${user.alertsEnabled ? '' : ' · spenti'}`
      : 'da impostare'

  return (
    <div className="container stack" style={{ maxWidth: 720 }}>
      {benvenuto && (
        <div className="alert" style={{ borderColor: 'var(--brand)', background: 'var(--brand-soft)' }}>
          <strong>Benvenuto.</strong> Dicci chi sei qui sotto, poi{' '}
          <Link href="/notifiche?benvenuto=1" style={{ textDecoration: 'underline' }}>
            attiva gli avvisi della tua zona
          </Link>
          : è lì che il sito comincia a servire.
        </div>
      )}

      {/*
        Chi sei per il sito, in una card: il nome, il bollino se sei un ente
        (o a che punto e' la verifica), e gli stessi tre numeri che vede
        chiunque apra il profilo pubblico, cosi' nessuno scopre da un altro
        cosa si dice di lui.
      */}
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Ciao {user.name.split(' ')[0]} 👋</h2>
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          {user.email}
          {declared && status === 'VERIFIED' && (
            <>
              {' '}
              <span className="badge account">
                {declared.emoji} {declared.label}
              </span>{' '}
              <span className="badge verified">verificato</span>
            </>
          )}
          {declared && status === 'PENDING' && (
            <>
              {' '}
              <a href="#chi-sei" className="badge pending">
                {declared.label}: in attesa di verifica
              </a>
            </>
          )}
          {declared && status === 'REJECTED' && (
            <>
              {' '}
              <a href="#chi-sei" className="badge rejected">
                {declared.label}: rifiutato
              </a>
            </>
          )}
        </p>
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

      {/*
        Le cose che si fanno da qui, una riga ciascuna. I numeri a destra
        dicono se c'e' qualcosa che aspetta: una richiesta di contatto in
        attesa e' l'unica che si accende.
      */}
      <nav className="menu-list" aria-label="Il tuo profilo">
        <MenuRow
          href="#annunci"
          icon="📋"
          title="I tuoi annunci"
          value={open.length === 1 ? '1 aperto' : `${open.length} aperti`}
        />
        <MenuRow
          href="#richieste"
          icon="✉️"
          title="Richieste di contatto"
          value={
            requests.length === 0
              ? 'nessuna in attesa'
              : requests.length === 1
                ? '1 in attesa'
                : `${requests.length} in attesa`
          }
          hot={requests.length > 0}
        />
        <MenuRow
          href="/profilo/animali"
          icon="🐾"
          title="I tuoi animali"
          value={myPets.length > 0 ? String(myPets.length) : 'aggiungi il primo'}
        />
        <MenuRow href="/notifiche" icon="🔔" title="Avvisi vicino a casa" value={zone} />
        {isOrg(effectiveAccountType(user)) && (
          <MenuRow href="/profilo/enti" icon="⚡" title="Inserimento rapido" value="in blocco" />
        )}
        {moderates && (
          <MenuRow
            href="/admin"
            icon="🛡️"
            title="Moderazione"
            value={role === 'ADMIN' ? 'amministratore' : 'moderatore'}
          />
        )}
      </nav>

      {/*
        Le richieste stanno aperte se ce n'e' una che aspetta: e' l'unica
        cosa di questa pagina che qualcun altro sta aspettando.
      */}
      <details className="fold" open={requests.length > 0}>
        <summary>
          <span>
            Richieste di contatto
            <span className="sub">
              {requests.length === 0
                ? 'Nessuna in attesa'
                : requests.length === 1
                  ? 'Una in attesa'
                  : `${requests.length} in attesa`}
              {accepted.length > 0 && ` · ${accepted.length} a cui l’hai dato`}
            </span>
          </span>
        </summary>
        <div className="fold-body" id="richieste">
          <p className="section-hint">
            Il tuo numero non è pubblico: lo dai tu, a chi vuoi. Leggi cosa ti scrivono e decidi.
          </p>
          <ContactRequestList requests={requests} accepted={accepted} />
        </div>
      </details>

      <details className="fold" id="chi-sei" open={whoOpen}>
        <summary>
          <span>
            Chi sei
            <span className="sub">{whoSummary}</span>
          </span>
        </summary>
        <div className="fold-body">
          <p className="section-hint">
            Serve a due cose: aprire l&apos;inserimento in blocco a canili, gattili e associazioni,
            e permettere a chi lo vuole di mandare la scheda sanitaria al proprio veterinario.
          </p>
          <AccountType
            current={user.accountType}
            verification={{
              status: user.accountStatus,
              proofUrl: user.proofUrl,
              proofNote: user.proofNote,
              verifiedAt: user.verifiedAt?.toISOString() ?? null,
              note: user.verificationNote,
            }}
            logo={{ userId: user.id, uploadedAt: user.orgLogoAt?.toISOString() ?? null }}
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
      </details>

      <details className="fold" open={open.length > 0}>
        <summary>
          <span>
            I tuoi annunci
            <span className="sub">
              {open.length === 0
                ? 'Nessuno aperto'
                : open.length === 1
                  ? 'Uno aperto'
                  : `${open.length} aperti`}
              {closed.length > 0 && ` · ${closed.length} nello storico`}
            </span>
          </span>
        </summary>
        <div className="fold-body" id="annunci">
          {open.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>
              Nessun annuncio aperto. <Link href="/nuovo">Pubblicane uno</Link>.
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
              <h3 style={{ margin: '18px 0 10px' }}>Storico ({closed.length})</h3>
              <div className="grid">
                {closed.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
      </details>

      <details className="fold">
        <summary>
          <span>
            Cancellare l&apos;account
            <span className="sub">Puoi andartene quando vuoi, e portare via tutto</span>
          </span>
        </summary>
        <div className="fold-body">
          <p className="section-hint">
            È scritto nei termini d’uso ed è questo il pulsante che lo fa.
          </p>
          <DeleteAccount email={user.email} />
        </div>
      </details>
    </div>
  )
}
