import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Troca o código do e-mail (recuperação de senha) por sessão. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/redefinir-senha'
  const next = rawNext.startsWith('/') ? rawNext : '/redefinir-senha'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(origin + next)
    }
  }

  return NextResponse.redirect(origin + '/entrar')
}
