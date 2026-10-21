import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente com SERVICE ROLE (ignora RLS) — USAR APENAS em rotas de
 * servidor protegidas por segredo, como o cron de lembretes.
 * Retorna null quando SUPABASE_SERVICE_ROLE_KEY não está configurada.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
