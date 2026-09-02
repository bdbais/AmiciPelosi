import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { firstIssue, orgSchema } from '@/lib/validators'

/**
 * Chi sono: una persona, un canile, un gattile, un'associazione, un veterinario.
 *
 * Cambia cosa l'app chiede e cosa apre. Un ente scrive i propri dati una volta
 * sola; un veterinario diventa scegliibile come destinatario della scheda
 * sanitaria degli animali di chi lo vuole.
 */
export async function PATCH(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = orgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }
  const data = parsed.data

  const db = await getDb()
  await db
    .update(users)
    .set({
      accountType: data.accountType,
      orgName: data.orgName || null,
      orgAddress: data.orgAddress || null,
      orgCity: data.orgCity || null,
      orgLat: data.orgLat ?? null,
      orgLng: data.orgLng ?? null,
      orgPhone: data.orgPhone || null,
      orgEmail: data.orgEmail || null,
      orgSite: data.orgSite || null,
      orgHours: data.orgHours || null,
      orgFacebook: data.orgFacebook || null,
      orgInstagram: data.orgInstagram || null,
    })
    .where(eq(users.id, user.id))

  return NextResponse.json({ accountType: data.accountType })
}
