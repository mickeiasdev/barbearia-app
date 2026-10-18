'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { friendlyDbError } from '@/lib/utils'

export interface PlaceOrderState {
  error?: string
  orderId?: string
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

  return { orderId: String(data) }
}
