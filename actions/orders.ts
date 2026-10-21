'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { friendlyDbError, formatBRL, PAYMENT_LABEL } from '@/lib/utils'
import { sendEmail, emailHtml } from '@/lib/email'
import { buildPixPayload } from '@/lib/pix'
import { qrFromPayload } from '@/lib/qr'

export interface PlaceOrderState {
  error?: string
  orderId?: string
  totalCents?: number
  pix?: { payload: string; qrDataUrl: string | null } | null
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

  // total real calculado no banco + espaço do pedido (para o Pix)
  const { data: order } = await supabase
    .from('orders')
    .select('total_cents, establishment:establishments(name, pix_key)')
    .eq('id', String(data))
    .maybeSingle()
  const orderRow = order as
    | { total_cents: number; establishment: { name: string; pix_key: string | null } | null }
    | null
  const totalCents = orderRow?.total_cents ?? 0

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

  // Pix do pedido no espaço do PROFISSIONAL (chave própria dele)
  const establishment = orderRow?.establishment ?? null
  let pix: PlaceOrderState['pix'] = null
  if (establishment?.pix_key && totalCents > 0) {
    const payload = buildPixPayload({
      key: establishment.pix_key,
      amountCents: totalCents,
      merchantName: establishment.name,
      txid: 'PED' + String(data).replace(/-/g, '').slice(0, 14),
    })
    if (payload) {
      pix = { payload, qrDataUrl: await qrFromPayload(payload) }
    }
  }

  return { orderId: String(data), totalCents, pix }
}
