import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const now = new Date()

  const entries: MetadataRoute.Sitemap = ['', '/servicos', '/barbeiros', '/loja', '/agendar'].map(
    (path) => ({
      url: base + path,
      lastModified: now,
    })
  )

  // perfis públicos dos profissionais (/p/slug)
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('establishments')
      .select('slug')
      .not('slug', 'is', null)
      .limit(200)
    for (const row of (data ?? []) as { slug: string }[]) {
      entries.push({ url: base + '/p/' + row.slug, lastModified: now })
    }
  } catch {
    // sem banco configurado: sitemap estático apenas
  }

  return entries
}
