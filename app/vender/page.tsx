import type { Metadata } from 'next'
import SellingLanding from '@/components/selling-landing'

export const metadata: Metadata = { title: 'Sistema para barbearias, salões e estética — comece grátis' }

/** Alias da raiz (/) — mesmo conteúdo. */
export default function VenderPage() {
  return <SellingLanding />
}
