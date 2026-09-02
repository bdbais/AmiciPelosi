import { NearbyBrowser } from '@/components/NearbyBrowser'
import { currentUser } from '@/lib/auth'

export const metadata = { title: 'Vicino a me - Amici Pelosi' }

export default async function NearbyPage() {
  const user = await currentUser()
  // La zona del profilo e' il punto di partenza naturale: e' casa, ed e' il
  // posto che si vuole tenere d'occhio anche quando si e' altrove.
  const home =
    user?.alertLat != null && user?.alertLng != null
      ? { lat: user.alertLat, lng: user.alertLng, label: user.alertCity }
      : null

  return (
    <div className="container">
      <h1 className="page-title">📍 Vicino a me</h1>
      <p className="page-sub">
        Scrivi un comune o un indirizzo e vedi gli annunci nel raggio che scegli, ordinati per
        vicinanza. Dal telefono puoi usare la posizione; se hai salvato la tua zona, parti da lì.
      </p>
      <NearbyBrowser home={home} />
    </div>
  )
}
