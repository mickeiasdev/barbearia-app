import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname

  // Rotas que exigem sessão (a checagem de papel admin é feita no layout).
  // Atenção: /barbeiros é página PÚBLICA — o portal é só /barbeiro.
  const isBarberPortal = path === '/barbeiro' || path.startsWith('/barbeiro/')
  if (!user && (path.startsWith('/minha-conta') || path.startsWith('/admin') || isBarberPortal)) {
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    url.search = ''
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)',
  ],
}
