import { NearbyBrowser } from '@/components/NearbyBrowser'

export const metadata = { title: 'Vicino a me - Amici Pelosi' }

export default function NearbyPage() {
  return (
    <div className="container">
      <h1 className="page-title">📍 Vicino a me</h1>
      <p className="page-sub">
        Attiva il GPS per vedere gli annunci nel raggio che scegli, ordinati per vicinanza.
      </p>
      <NearbyBrowser />
    </div>
  )
}
