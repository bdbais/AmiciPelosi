import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { LogoutButton } from '@/components/LogoutButton'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import { TabBar } from '@/components/TabBar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amici Pelosi - animali smarriti, ritrovati e in adozione',
  description:
    'Pubblica e trova annunci di animali smarriti, ritrovati o in cerca di adozione. Con notifiche di prossimita per aiutare chi ti sta vicino.',
  manifest: '/manifest.webmanifest',
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

  return (
    <html lang="it">
      <body>
        <ServiceWorkerRegistrar />
        <header className="site-header">
          <div className="container inner">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden="true">
                🐾
              </span>
              <span>Amici Pelosi</span>
            </Link>
            <nav className="nav">
              <Link href="/" className="hide-sm">
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
                  <Link href="/accedi">Accedi</Link>
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
        </footer>

        <TabBar loggedIn={Boolean(user)} />
      </body>
    </html>
  )
}
