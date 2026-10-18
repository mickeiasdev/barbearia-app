import type { Metadata } from 'next'
import CartView from '@/components/cart-view'
import { getEstablishment } from '@/lib/data'

export const metadata: Metadata = { title: 'Carrinho' }

export default async function CarrinhoPage() {
  const establishment = await getEstablishment()

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title mb-8">Carrinho</h1>
      <CartView
        pixKey={establishment?.pix_key ?? null}
        merchantName={establishment?.name ?? null}
      />
    </main>
  )
}
