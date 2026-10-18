'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { friendlyDbError, formatBRL, PAYMENT_LABEL } from '@/lib/utils'
import { sendEmail, emailHtml } from '@/lib/email'

export interface PlaceOrderState {
  error?: string
  orderId?: string
  totalCents?: number
}

interface RpcItem {
  product_id: string
  quantity: number
}

export async function placeOrderAction(
  _prev: PlaceOrderState,
  formData: FormData
): Promise<PlaceOrderState> {
  let items: RpcItem[] = []
  try {
    const parsed = JSON.parse(String(formData.get('items') ?? '[]'))
    if (Array.isArray(parsed)) items = parsed
  } catch {
    // segue com carrinho vazio -> erro abaixo
  }

  if (items.length === 0) {
    return { error: 'Seu carrinho está vazio.' }
  }

  const paymentMethod = String(formData.get('payment_method') ?? 'pix')
  if (!['pix', 'dinheiro', 'cartao'].includes(paymentMethod)) {
    return { error: 'Forma de pagamento inválida.' }
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { error: 'Entre na sua conta para finalizar a compra.' }
  }

  const { data, error } = await supabase.rpc('place_order', {
    p_items: items,
    p_client_id: auth.user.id,
    p_payment_method: paymentMethod,
  })

  if (error) {
    return { error: friendlyDbError(error.message) }
  }

  revalidatePath('/minha-conta')
  revalidatePath('/loja')

  // total real calculado no banco + e-mail de confirmação
  const { data: order } = await supabase
    .from('orders')
    .select('total_cents')
    .eq('id', String(data))
    .maybeSingle()
  const totalCents = (order as { total_cents: number } | null)?.total_cents ?? 0

  await sendEmail(
    auth.user.email,
    'Pedido confirmado',
    emailHtml(
      'Pedido confirmado!',
      [
        'Recebemos seu pedido <strong>#' + String(data).slice(0, 8) + '</strong>.',
        'Total: <strong>' + formatBRL(totalCents) + '</strong> (' + PAYMENT_LABEL[paymentMethod] + ').',
        'A retirada é na barbearia — você pode pagar por Pix (gerado na tela de confirmação) ou no local.',
      ],
      'Acompanhe seus pedidos em Minha Conta no site.'
    )
  )

  return { orderId: String(data), totalCents }
}
