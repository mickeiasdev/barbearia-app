"use client"

import { useState } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

interface Props {
  product: { id: string; name: string; price_cents: number; stock: number }
}

export default function AddToCartButton({ product }: Props) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  if (product.stock <= 0) {
    return (
      <button disabled className="btn btn-outline btn-sm w-full opacity-50">
        Esgotado
      </button>
    )
  }

  const handleAdd = () => {
    add({
      product_id: product.id,
      name: product.name,
      price_cents: product.price_cents,
      stock: product.stock,
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button onClick={handleAdd} className="btn btn-primary btn-sm w-full">
      {added ? (
        <>
          <Check className="h-4 w-4" /> Adicionado
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" /> Adicionar ao carrinho
        </>
      )}
    </button>
  )
}
