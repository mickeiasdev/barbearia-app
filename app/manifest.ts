import type { MetadataRoute } from 'next'
import { APP_NAME } from '@/lib/utils'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME + ' — Barbearia',
    short_name: APP_NAME,
    description: 'Agendamentos online e produtos de barbearia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0a09',
    theme_color: '#f59e0b',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
