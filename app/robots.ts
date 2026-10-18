import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/minha-conta', '/entrar', '/registrar', '/carrinho'],
    },
  }
}
