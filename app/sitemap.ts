import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const now = new Date()

  return ['', '/servicos', '/barbeiros', '/loja', '/agendar'].map((path) => ({
    url: base + path,
    lastModified: now,
  }))
}
