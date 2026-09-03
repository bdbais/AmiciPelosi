import { NextResponse, type NextRequest } from 'next/server'

/**
 * Mentre l'amministratore guarda il sito come un'altra persona, il sito e'
 * in sola lettura. Non e' una cortesia: e' l'unica cosa che rende quella
 * modalita' accettabile. Vedere cosa vede Beatrice va bene; pubblicare,
 * chiedere un contatto o bloccare qualcuno a nome suo no, nemmeno per
 * sbaglio. Si ferma qui, prima di qualsiasi rotta, cosi' nessuna rotta deve
 * ricordarsene da sola.
 *
 * L'unica scrittura ammessa e' quella che chiude la modalita'.
 */
const IMPERSONATION_COOKIE = 'ap_imp'
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function middleware(request: NextRequest) {
  if (READ_METHODS.has(request.method)) return NextResponse.next()
  if (!request.cookies.has(IMPERSONATION_COOKIE)) return NextResponse.next()
  if (request.nextUrl.pathname === '/api/admin/impersona') return NextResponse.next()

  return NextResponse.json(
    {
      error:
        'Stai vedendo il sito come un’altra persona: in questa modalità non si può modificare niente. Torna a te per continuare.',
    },
    { status: 403 },
  )
}

export const config = {
  matcher: ['/api/:path*'],
}
