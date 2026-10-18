// Validação amigável das variáveis do Supabase.
export function supabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('placeholder') || !/^https:\/\//.test(url)) {
    throw new Error(
      'Supabase não configurado. Copie .env.example para .env.local e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY com os dados do seu projeto (Settings -> API).'
    )
  }

  return { url, key }
}
