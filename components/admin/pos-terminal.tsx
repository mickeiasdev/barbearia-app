"use client"

import { useEffect, useRef, useState } from 'react'
import { useActionState } from 'react'
import { Banknote, CheckCircle, CreditCard, Minus, Plus, QrCode, Trash2 } from 'lucide-react'
import { adminPlaceOrderAction, type PosState } from '@/actions/admin'
import { formatBRL, parsePriceToCents } from '@/lib/utils'

interface PosProduct {
  id: string
  name: string
  price_cents: number
  stock: number
  category: string | null
}

interface PosLine {
  product_id: string
  name: string
  price_cents: number
  quantity: number
  stock: number
}

export default function PosTerminal({
  products,
  clients,
}: {
  products: PosProduct[]
  clients: { id: string; full_name: string }[]
}) {
  const [lines, setLines] = useState<PosLine[]>([])
  const [discount, setDiscount] = useState('')
  const [state, formAction, isPending] = useActionState<PosState, FormData>(
    adminPlaceOrderAction,
    {}
  )
  const lastReceiptRef = useRef<string | null>(null)
  const [receipt, setReceipt] = useState<{ orderId: string; totalCents: number } | null>(null)

  // mostra o recibo assim que o pedido é confirmado e limpa o terminal
  useEffect(() => {
    if (state.ok && state.orderId && lastReceiptRef.current !== state.orderId) {
      lastReceiptRef.current = state.orderId
      setReceipt({ orderId: state.orderId, totalCents: state.totalCents ?? 0 })
      setLines([])
    }
  }, [state.ok, state.orderId, state.totalCents])

  const total = lines.reduce((acc, l) => acc + l.price_cents * l.quantity, 0)
  const discountCents = Math.min(parsePriceToCents(discount) ?? 0, total)
  const grandTotal = total - discountCents

  const addProduct = (p: PosProduct) => {
    setLines((prev) => {
      const found = prev.find((l) => l.product_id === p.id)
      if (found) {
        return prev.map((l) =>
          l.product_id === p.id && l.quantity < l.stock
            ? { ...l, quantity: l.quantity + 1 }
            : l
        )
      }
      if (p.stock <= 0) return prev
      return [
        ...prev,
        { product_id: p.id, name: p.name, price_cents: p.price_cents, quantity: 1, stock: p.stock },
      ]
    })
  }

  const changeQty = (id: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.product_id === id
            ? { ...l, quantity: Math.min(Math.max(0, l.quantity + delta), l.stock) }
            : l
        )
        .filter((l) => l.quantity > 0)
    )
  }

  const itemsJson = JSON.stringify(
    lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity }))
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      {/* grade de produtos */}
      <div>
        <h2 className="mb-3 font-semibold text-stone-100">Produtos</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const inCart = lines.find((l) => l.product_id === p.id)?.quantity ?? 0
            const disabled = p.stock <= 0 || inCart >= p.stock
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                disabled={disabled}
                className={
                  'card p-3 text-left transition-colors ' +
                  (disabled
                    ? 'opacity-40'
                    : 'hover:border-amber-500/40')
                }
              >
                <p className="truncate text-sm font-medium text-stone-100">{p.name}</p>
                <p className="text-xs text-stone-400">{p.category ?? '—'}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-500">
                    {formatBRL(p.price_cents)}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    estoque: {p.stock}
                  </span>
                </div>
              </button>
            )
          })}
          {products.length === 0 && (
            <p className="card col-span-full p-6 text-center text-sm text-stone-400">
              Nenhum produto ativo. Cadastre em Produtos.
            </p>
          )}
        </div>
      </div>

      {/* cupom atual */}
      <form action={formAction} className="card h-fit space-y-4 p-5">
        <h2 className="font-semibold text-stone-100">Venda atual</h2>

        {receipt && (
          <div className="ok-box flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>
              Venda <span className="font-mono">#{receipt.orderId.slice(0, 8)}</span> registrada —{' '}
              {formatBRL(receipt.totalCents)}
            </span>
          </div>
        )}

        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">
            Clique nos produtos para lançar a venda.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {lines.map((l) => (
              <li key={l.product_id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-stone-300">{l.name}</span>
                <button
                  type="button"
                  aria-label="Diminuir"
                  onClick={() => changeQty(l.product_id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded border border-stone-700 text-stone-400 hover:text-amber-400"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center font-semibold text-stone-100">{l.quantity}</span>
                <button
                  type="button"
                  aria-label="Aumentar"
                  onClick={() => changeQty(l.product_id, 1)}
                  disabled={l.quantity >= l.stock}
                  className="flex h-7 w-7 items-center justify-center rounded border border-stone-700 text-stone-400 hover:text-amber-400 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <span className="w-20 text-right font-medium text-stone-100">
                  {formatBRL(l.price_cents * l.quantity)}
                </span>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => setLines((prev) => prev.filter((x) => x.product_id !== l.product_id))}
                  className="text-stone-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-stone-800 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-400">Subtotal</span>
            <span className="font-medium text-stone-200">{formatBRL(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="pos-discount" className="text-stone-400">Desconto (R$)</label>
            <input
              id="pos-discount"
              name="discount"
              inputMode="decimal"
              placeholder="0,00"
              className="input w-28 py-1.5 text-right"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Total</span>
            <span className="text-lg font-bold text-amber-500">{formatBRL(grandTotal)}</span>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pos-client">Cliente (opcional — venda avulsa)</label>
          <select id="pos-client" name="client_id" className="input" defaultValue="">
            <option value="">— venda avulsa —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="label">Pagamento</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-stone-700 px-2 py-2.5 text-xs text-stone-400 has-[:checked]:border-amber-500/60 has-[:checked]:text-amber-400">
              <QrCode className="h-4 w-4" /> Pix
              <input type="radio" name="payment_method" value="pix" defaultChecked className="sr-only" />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-stone-700 px-2 py-2.5 text-xs text-stone-400 has-[:checked]:border-amber-500/60 has-[:checked]:text-amber-400">
              <Banknote className="h-4 w-4" /> Dinheiro
              <input type="radio" name="payment_method" value="dinheiro" className="sr-only" />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-stone-700 px-2 py-2.5 text-xs text-stone-400 has-[:checked]:border-amber-500/60 has-[:checked]:text-amber-400">
              <CreditCard className="h-4 w-4" /> Cartão
              <input type="radio" name="payment_method" value="cartao" className="sr-only" />
            </label>
          </div>
        </div>

        <input type="hidden" name="items" value={itemsJson} />
        <input type="hidden" name="display_gross" value={total} />

        {state.error && <div className="error-box">{state.error}</div>}

        <button type="submit" disabled={isPending || lines.length === 0} className="btn btn-primary w-full">
          {isPending ? 'Registrando...' : 'Registrar venda (baixa estoque)'}
        </button>
      </form>
    </div>
  )
}
