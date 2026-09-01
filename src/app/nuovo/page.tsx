import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { PostForm } from '@/components/PostForm'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const user = await currentUser()

  if (!user) {
    return (
      <div className="container center-narrow">
        <div className="card">
          <h2>Accedi per pubblicare</h2>
          <p className="section-hint">
            Serve un account per pubblicare un annuncio: cosi chi ha notizie puo contattarti.
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
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="page-title">Pubblica un annuncio</h1>
      <p className="page-sub">Bastano pochi campi: foto, zona e come riconoscerlo.</p>
      <PostForm defaultContact={{ name: user.name, phone: user.phone ?? '' }} />
    </div>
  )
}
