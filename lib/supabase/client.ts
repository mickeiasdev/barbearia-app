import { createBrowserClient } from '@supabase/ssr'
import { supabaseEnv } from '@/lib/env'

/** Cliente Supabase para componentes no navegador. */
export function createClient() {
  const { url, key } = supabaseEnv()
  return createBrowserClient(url, key)
}
