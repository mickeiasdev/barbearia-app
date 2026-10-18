import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from '@/lib/env'

/** Atualiza a sessão do usuário a cada requisição (padrão Supabase SSR). */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  let supabase: ReturnType<typeof createServerClient> | null = null
  try {
    const { url, key } = supabaseEnv()
    supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })
  } catch {
    // Supabase ainda não configurado: segue sem sessão.
    return { supabaseResponse, user: null }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
