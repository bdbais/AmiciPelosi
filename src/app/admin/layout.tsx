import Link from 'next/link'
import { requireModerator } from '@/lib/moderation'
import { AdminTabs } from '@/components/AdminTabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Moderazione - Amici Pelosi' }

/**
 * La porta dell'area di moderazione.
 *
 * A chi non modera si dice solo che questa parte non e' per lui: niente
 * elenco di cosa c'e' dentro, niente "accedi come moderatore", perche' non
 * c'e' motivo di far sapere a un estraneo come e' fatta.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const moderator = await requireModerator()

  if (!moderator) {
    return (
      <div className="container">
        <div className="card">
          <h2>Questa parte è per chi modera il sito</h2>
          <p className="section-hint">Non c’è niente da vedere qui.</p>
          <Link href="/" className="btn secondary small">
            Torna alla home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 className="page-title">Moderazione</h1>
      <AdminTabs />
      {children}
    </div>
  )
}
