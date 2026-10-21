"use client"

import { useState } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

interface Props {
  product: {
    id: string
    name: string
    price_cents: number
    stock: number
    establishment_id: string
    establishment_name: string
  }
}

export default function AddToCartButton({ product }: Props) {
  const { add, items } = useCart()
  const [added, setAdded] = useState(false)

  if (product.stock <= 0) {
    return (
      <button disabled className="btn btn-outline btn-sm w-full opacity-50">
        Esgotado
      </button>
    )
  }

  const handleAdd = () => {
    // Um pedido por profissional: se o carrinho tem itens de outro
    // espaço, perguntamos antes de substituir.
    const current = items[0]
    if (current && current.establishment_id !== product.establishment_id) {
      const ok = window.confirm(
        'Seu carrinho tem itens de ' + current.establishment_name +
        '. Adicionar produtos de ' + product.establishment_name +
        ' vai esvaziar o carrinho atual. Continuar?'
      )
      if (!ok) return
    }

    add({
      product_id: product.id,
      name: product.name,
      price_cents: product.price_cents,
      stock: product.stock,
      establishment_id: product.establishment_id,
      establishment_name: product.establishment_name,
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
