import type { Metadata } from 'next'
import './globals.css'
import { APP_NAME } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: APP_NAME + ' — Barbearia & Agendamentos',
    template: '%s | ' + APP_NAME,
  },
  description:
    'Agende seu horário com os melhores barbeiros e encontre produtos profissionais de barbearia.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
