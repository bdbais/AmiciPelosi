import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { pushEnabled } from '@/lib/push'
import { AlertSettings } from '@/components/AlertSettings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Notifiche di prossimita - Amici Pelosi' }

export default async function NotificationsPage() {
  const user = await currentUser()

  if (!user) {
    return (
      <div className="container center-narrow">
        <div className="card">
          <h2>🔔 Notifiche di prossimita</h2>
          <p className="section-hint">
            Accedi per ricevere un avviso quando un animale viene smarrito, ritrovato o proposto in
            adozione vicino a te.
          </p>
          <div className="inline">
            <Link href="/accedi" className="btn">
              Accedi
            </Link>
            <Link href="/registrati" className="btn secondary">
              Registrati
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <h1 className="page-title">🔔 Notifiche di prossimita</h1>
      <p className="page-sub">
        Scegli la tua zona e il raggio: ti avvisiamo solo per quello che succede li vicino.
      </p>

      {!pushEnabled() && (
        <div className="alert info">
          Le notifiche push non sono ancora configurate su questo server (chiavi VAPID mancanti).
          Puoi comunque salvare la zona: verra usata appena vengono attivate.
        </div>
      )}

      <AlertSettings
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
        initial={{
          alertsEnabled: user.alertsEnabled,
          alertRadiusKm: user.alertRadiusKm,
          alertLat: user.alertLat,
          alertLng: user.alertLng,
          alertCity: user.alertCity,
        }}
      />
    </div>
  )
}
