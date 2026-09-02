import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'
import { crossOriginResponse, sameOrigin } from '@/lib/http'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  await destroySession()
  return NextResponse.json({ ok: true })
}
