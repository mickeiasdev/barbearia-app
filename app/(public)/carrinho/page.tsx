import type { Metadata } from 'next'
import CartView from '@/components/cart-view'

export const metadata: Metadata = { title: 'Carrinho' }

export default function CarrinhoPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title mb-8">Carrinho</h1>
      <CartView />
    </main>
  )
}
