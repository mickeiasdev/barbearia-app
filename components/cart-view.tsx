"use client"

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { Banknote, CheckCircle, CreditCard, Minus, Plus, QrCode, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { placeOrderAction, type PlaceOrderState } from '@/actions/orders'
import PixCard from '@/components/pix-card'
import { formatBRL } from '@/lib/utils'

interface CartViewProps {
  pixKey?: string | null
  merchantName?: string | null
}

export default function CartView({ pixKey, merchantName }: CartViewProps) {
  const { items, setQty, remove, clear, totalCents, mounted } = useCart()
  const [state, formAction, isPending] = useActionState<PlaceOrderState, FormData>(
    placeOrderAction,
    {}
  )
  const clearedRef = useRef<string | null>(null)

  // limpa o carrinho local assim que o pedido é confirmado no servidor
  useEffect(() => {
    if (state.orderId && clearedRef.current !== state.orderId) {
      clear()
      clearedRef.current = state.orderId
    }
  }, [state.orderId, clear])

  // ===== sucesso =====
  if (state.orderId && clearedRef.current === state.orderId) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="card p-10 text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-emerald-400" />
          <h2 className="mt-4 font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
            Pedido confirmado!
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Número do pedido:{' '}
            <span className="font-mono text-amber-400">{state.orderId.slice(0, 8)}</span>
          </p>
          {state.totalCents ? (
            <p className="mt-1 text-sm text-stone-500">
              Total: <span className="font-bold text-stone-200">{formatBRL(state.totalCents)}</span>
            </p>
          ) : null}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/minha-conta" className="btn btn-primary">
              Ver meus pedidos
            </Link>
            <Link href="/loja" className="btn btn-outline">
              Continuar comprando
            </Link>
          </div>
        </div>

        {pixKey && state.totalCents ? (
          <PixCard
            pixKey={pixKey}
            amountCents={state.totalCents}
            merchantName={merchantName ?? undefined}
            txid={'PED' + state.orderId.replace(/-/g, '').slice(0, 14)}
            defaultOpen
            note="Após pagar, mostre o comprovante na retirada dos produtos."
          />
        ) : (
          <p className="text-center text-xs text-stone-600">
            O pagamento também pode ser feito na retirada, direto na barbearia.
          </p>
        )}
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-stone-700 border-t-amber-500" />
      </div>
    )
  }

  // ===== vazio =====
  if (items.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-stone-600" />
        <h2 className="mt-4 text-lg font-semibold text-stone-200">Seu carrinho está vazio</h2>
        <p className="mt-1 text-sm text-stone-500">Confira nossos produtos profissionais.</p>
        <Link href="/loja" className="btn btn-primary mt-6">
          Ir para a loja
        </Link>
      </div>
    )
  }

  // ===== carrinho + checkout =====
  const itemsJson = JSON.stringify(
    items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* itens */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.product_id} className="card flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-stone-100">{item.name}</p>
              <p className="text-sm text-amber-500">{formatBRL(item.price_cents)}</p>
              {item.quantity >= item.stock && (
                <p className="text-xs text-stone-600">máx. disponível: {item.stock}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() => setQty(item.product_id, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-400"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-stone-100">
                {item.quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => setQty(item.product_id, item.quantity + 1)}
                disabled={item.quantity >= item.stock}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-400 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <p className="w-24 text-right font-semibold text-stone-100">
              {formatBRL(item.price_cents * item.quantity)}
            </p>

            <button
              type="button"
              aria-label="Remover item"
              onClick={() => remove(item.product_id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 text-stone-500 hover:border-red-800 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* checkout */}
      <form action={formAction} className="card h-fit space-y-5 p-6">
        <h2 className="font-serif text-lg font-bold uppercase tracking-tight text-stone-100">
          Resumo
        </h2>

        <div className="flex justify-between border-b border-stone-800 pb-3 text-sm text-stone-400">
          <span>Subtotal</span>
          <span className="font-semibold text-stone-100">{formatBRL(totalCents)}</span>
        </div>
        <div className="flex justify-between text-sm text-stone-400">
          <span>Total</span>
          <span className="text-lg font-bold text-amber-500">{formatBRL(totalCents)}</span>
        </div>

        <div>
          <p className="label">Forma de pagamento</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-stone-700 px-2 py-3 text-xs text-stone-400 transition-colors has-[:checked]:border-amber-500/60 has-[:checked]:text-amber-400">
              <QrCode className="h-5 w-5" />
              Pix
              <input type="radio" name="payment_method" value="pix" defaultChecked className="sr-only" />
            </label>
            <label className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-stone-700 px-2 py-3 text-xs text-stone-400 transition-colors has-[:checked]:border-amber-500/60 has-[:checked]:text-amber-400">
              <Banknote className="h-5 w-5" />
              Dinheiro
              <input type="radio" name="payment_method" value="dinheiro" className="sr-only" />
            </label>
            <label className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-stone-700 px-2 py-3 text-xs text-stone-400 transition-colors has-[:checked]:border-amber-500/60 has-[:checked]:text-amber-400">
              <CreditCard className="h-5 w-5" />
              Cartão
              <input type="radio" name="payment_method" value="cartao" className="sr-only" />
            </label>
          </div>
        </div>

        <input type="hidden" name="items" value={itemsJson} />

        {state.error && <div className="error-box">{state.error}</div>}

        <button type="submit" disabled={isPending} className="btn btn-primary w-full">
          {isPending ? 'Finalizando...' : 'Finalizar pedido'}
        </button>

        <p className="text-center text-xs text-stone-600">
          O pagamento é realizado na retirada dos produtos na barbearia.
        </p>
      </form>
    </div>
  )
}
