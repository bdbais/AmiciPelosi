import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { isOrg } from '@/lib/constants'
import { BulkAdoption } from '@/components/BulkAdoption'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Inserimento rapido - Amici Pelosi' }

/**
 * La schermata per chi ne ha venti da piazzare, non uno.
 *
 * Riservata a canili, gattili e associazioni: sono gli unici per cui il
 * modulo lungo e' un ostacolo vero, e sono anche quelli che, se l'ostacolo
 * resta, continuano a pubblicare altrove.
 */
export default async function BulkPage() {
  const user = await currentUser()
  if (!user) redirect('/accedi')
  if (!isOrg(user.accountType)) redirect('/profilo')

  const missing = user.orgLat == null || user.orgLng == null

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <p className="small">
        <Link href="/profilo" style={{ textDecoration: 'underline' }}>
          ‹ Torna al profilo
        </Link>
      </p>
      <h1 className="page-title">⚡ Inserimento rapido</h1>
      <p className="page-sub">
        Zona e contatti si scrivono una volta sola e restano in cima. Sotto gira solo quello che
        cambia da un animale all’altro: salvi, il modulo si svuota, e sei già sul prossimo.
      </p>

      {missing && (
        <div className="alert info">
          Non avete ancora segnato dove siete sulla mappa. Potete farlo qui sotto per questa
          sessione, oppure una volta per tutte nel{' '}
          <Link href="/profilo" style={{ textDecoration: 'underline' }}>
            profilo
          </Link>
          .
        </div>
      )}

      <BulkAdoption
        contact={{
          name: user.orgName || user.name,
          phone: user.orgPhone ?? user.phone ?? '',
          email: user.orgEmail ?? user.email,
          address: user.orgAddress ?? '',
          city: user.orgCity ?? '',
        }}
        place={
          user.orgLat != null && user.orgLng != null
            ? { lat: user.orgLat, lng: user.orgLng }
            : null
        }
      />
    </div>
  )
}
