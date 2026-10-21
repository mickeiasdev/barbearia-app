import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Webhook do Mercado Pago: quando o Pix da assinatura é aprovado,
 * aplica o plano na barbearia (external_reference sub:<plano>:company:<id>).
 * Configure a URL em: Mercado Pago → Suas integrações → Webhooks.
 */
export async function POST(request: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) return new Response('ok', { status: 200 })

  let body: { type?: string; data?: { id?: string } } | null = null
  try {
    body = await request.json()
  } catch {
    return new Response('ok', { status: 200 })
  }
  if (!body || body.type !== 'payment' || !body.data?.id) {
    return new Response('ok', { status: 200 })
  }

  try {
    const res = await fetch('https://api.mercadopago.com/v1/payments/' + body.data.id, {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (!res.ok) return new Response('ok', { status: 200 })
    const payment = (await res.json()) as {
      status?: string
      external_reference?: string
    }
    if (payment.status !== 'approved' || !payment.external_reference) {
      return new Response('ok', { status: 200 })
    }

    const ref = payment.external_reference
    if (!ref.startsWith('sub:')) return new Response('ok', { status: 200 })
    const [, plan, , companyId] = ref.split(':')
    if ((plan !== 'pro' && plan !== 'business') || !companyId) {
      return new Response('ok', { status: 200 })
    }

    const supabase = createAdminClient()
    if (!supabase) return new Response('ok', { status: 200 })

    const { error } = await supabase
      .from('establishments')
      .update({
        plan,
        plan_paid_until: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        trial_ends_at: null,
      })
      .eq('id', companyId)
      .eq('is_company', true)
    if (error) {
      console.error('[billing] falha ao aplicar plano:', error.message)
    }
  } catch (err) {
    console.error('[billing] erro webhook MP:', err)
  }

  return new Response('ok', { status: 200 })
}
