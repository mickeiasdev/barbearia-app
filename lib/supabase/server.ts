import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseEnv } from '@/lib/env'

/** Cliente Supabase para Server Components e Server Actions. */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = supabaseEnv()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components não podem alterar cookies; ignora.
          }
        },
      },
    }
  )
}
