"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { CartItem } from '@/lib/types'

interface CartContextValue {
  items: CartItem[]
  count: number
  totalCents: number
  mounted: boolean
  add: (item: { product_id: string; name: string; price_cents: number; stock: number; quantity?: number }) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'barberpro-cart-v1'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      // ignora carrinho corrompido
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage cheio/indisponível: ignora
    }
  }, [items, mounted])

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      count: items.reduce((acc, i) => acc + i.quantity, 0),
      totalCents: items.reduce((acc, i) => acc + i.price_cents * i.quantity, 0),
      mounted,
      add: (item) =>
        setItems((prev) => {
          const qty = item.quantity ?? 1
          const found = prev.find((p) => p.product_id === item.product_id)
          if (found) {
            return prev.map((p) =>
              p.product_id === item.product_id
                ? { ...p, quantity: Math.min(p.quantity + qty, p.stock) }
                : p
            )
          }
          return [...prev, { ...item, quantity: Math.min(qty, item.stock) }]
        }),
      setQty: (productId, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => p.product_id !== productId)
            : prev.map((p) =>
                p.product_id === productId
                  ? { ...p, quantity: Math.min(qty, p.stock) }
                  : p
              )
        ),
      remove: (productId) =>
        setItems((prev) => prev.filter((p) => p.product_id !== productId)),
      clear: () => setItems([]),
    }
  }, [items, mounted])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>')
  return ctx
}
