import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/LogoutButton'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import { Presence } from '@/components/Presence'
import { TabBar } from '@/components/TabBar'
import { SoundProvider, SoundToggle } from '@/components/SoundProvider'
import { GuideIcon, HelpNearbyIcon, PawHeartIcon, ShieldIcon } from '@/components/Icons'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amici Pelosi - animali smarriti, ritrovati e in adozione',
  description:
    'Pubblica e trova annunci di animali smarriti, ritrovati o in cerca di adozione. Con notifiche di prossimita per aiutare chi ti sta vicino.',
  manifest: '/manifest.webmanifest',
  // L'impronta con il cuore, la stessa dell'app: non le due zampette nere
  // delle emoji, che cambiano faccia da un telefono all'altro.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Amici Pelosi', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#e07a3f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()
  const role = user?.role
  const canModerate = role === 'MODERATOR' || role === 'ADMIN'

  return (
    <html lang="it">
      <body>
        <SoundProvider>
        <ServiceWorkerRegistrar />
        {user && <Presence />}
        <header className="site-header">
          <div className="container inner">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden="true">
                <PawHeartIcon size={22} />
              </span>
              <span>Amici Pelosi</span>
            </Link>
            <nav className="nav">
              <SoundToggle />
              <Link href="/enti" className="icon-link" title="Chi può aiutarti qui vicino">
                <HelpNearbyIcon />
                <span className="sr-only">Chi può aiutarti</span>
              </Link>
              <Link href="/aiuto" className="icon-link" title="Cosa fare in caso di">
                <GuideIcon />
                <span className="sr-only">Cosa fare in caso di</span>
              </Link>
              {canModerate && (
                <Link href="/admin" className="icon-link moderation" title="Moderazione">
                  <ShieldIcon />
                  <span className="sr-only">Moderazione</span>
                </Link>
              )}
              <Link href="/bacheca" className="hide-sm">
                Bacheca
              </Link>
              {user ? (
                <>
                  <Link href="/notifiche" className="hide-sm">
                    Notifiche
                  </Link>
                  <Link href="/profilo" className="hide-sm">
                    {user.name.split(' ')[0]}
                  </Link>
                  <LogoutButton />
                  <Link href="/nuovo" className="cta">
                    + Pubblica
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/accedi" className="only-desktop">
                    Accedi
                  </Link>
                  <Link href="/registrati" className="cta">
                    Registrati
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="footer">
          <p>
            🐾 <strong>Amici Pelosi</strong> - una mano per riportarli a casa.
          </p>
          <p className="small">
            In caso di animale ferito contatta subito un veterinario o il servizio veterinario ASL.
          </p>
          <p className="small">
            <Link href="/regole" style={{ textDecoration: 'underline' }}>
              Regole e avvertenze
            </Link>
            {' · '}
            <Link href="/aiuto" style={{ textDecoration: 'underline' }}>
              Cosa fare in caso di
            </Link>
            {' · '}
            <Link href="/enti" style={{ textDecoration: 'underline' }}>
              Chi può aiutarti
            </Link>
            {' · '}
            <Link href="/permessi" style={{ textDecoration: 'underline' }}>
              Permessi
            </Link>
            {' · '}
            <Link href="/termini" style={{ textDecoration: 'underline' }}>
              Termini d’uso
            </Link>
          </p>
        </footer>

        <TabBar loggedIn={Boolean(user)} />
        </SoundProvider>
      </body>
    </html>
  )
}
