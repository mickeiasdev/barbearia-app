"use client"

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/components/cart-provider'

export default function CartIndicator() {
  const { count, mounted } = useCart()

  if (!mounted || count === 0) return null

  return (
    <Link
      href="/carrinho"
      aria-label={'Carrinho com ' + count + ' item(ns)'}
      className="btn btn-outline btn-sm relative"
    >
      <ShoppingBag className="h-4 w-4" />
      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-stone-950">
        {count}
      </span>
    </Link>
  )
}
