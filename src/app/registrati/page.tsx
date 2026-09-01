import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { AuthForm } from '@/components/AuthForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Registrati - Amici Pelosi' }

export default async function RegisterPage() {
  if (await currentUser()) redirect('/')
  return (
    <div className="container center-narrow">
      <AuthForm mode="register" />
    </div>
  )
}
