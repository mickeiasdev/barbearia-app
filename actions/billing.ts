'use server'

import { createClient } from '@/lib/supabase/server'
import { getMyCompany } from '@/lib/data'
import type { Establishment } from '@/lib/types'

export interface BillingState {
  error?: string
  ok?: boolean
  pix?: { payload: string; qrDataUrl: string | null } | null
  plan?: string
  amountCents?: number
}

export const PLAN_PRICES: Record<string, number> = {
  pro: 6900,
  business: 12900,
}

export const PLAN_LABELS: Record<string, string> = {
  pro: 'Pro',
  business: 'Business',
}

/** Cliente logado + empresa dele (dono/gerente). */
async function requireCompanyForBilling(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  company: Establishment
  email: string
} | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const company = await getMyCompany(supabase)
  if (!company) return null
  return { supabase, company, email: auth.user.email ?? '' }
}

/**
 * Gera um Pix de mensalidade via Mercado Pago (payment one-time).
 * Requer MERCADOPAGO_ACCESS_TOKEN. Ao ser aprovado, o webhook
 * /api/webhooks/mercadopago aplica o plano na barbearia.
 */
export async function createPlanPixAction(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  const ctx = await requireCompanyForBilling()
  if (!ctx) return { error: 'Entre com a conta do dono/gerente da barbearia para assinar.' }
  const { company, email } = ctx

  const plan = String(formData.get('plan') ?? '')
  if (!PLAN_PRICES[plan]) return { error: 'Plano inválido.' }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    return {
      error:
        'Assinatura não configurada ainda: adicione MERCADOPAGO_ACCESS_TOKEN no .env.local ' +
        '(Mercado Pago → Suas integrações → Credenciais de produção).',
    }
  }

  const amount = PLAN_PRICES[plan] / 100
  try {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_amount: Number(amount.toFixed(2)),
        description: 'Assinatura ' + PLAN_LABELS[plan] + ' — ' + company.name,
        payment_method_id: 'pix',
        external_reference: 'sub:' + plan + ':company:' + company.id,
        payer: { email },
      }),
    })
    const body = await res.json()
    if (!res.ok) {
      return { error: 'Falha ao gerar o Pix (' + res.status + '). Tente novamente.' }
    }
    const data = body as {
      status?: string
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string }
      }
    }
    const payload = data.point_of_interaction?.transaction_data?.qr_code ?? ''
    const qrBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64 ?? null
    if (!payload) {
      return { error: 'O Mercado Pago não retornou o Pix. Tente novamente em instantes.' }
    }
    return {
      ok: true,
      plan,
      amountCents: PLAN_PRICES[plan],
      pix: {
        payload,
        qrDataUrl: qrBase64 ? 'data:image/png;base64,' + qrBase64 : null,
      },
    }
  } catch (err) {
    console.error('[billing] erro Pix MP:', err)
    return { error: 'Não foi possível falar com o Mercado Pago. Tente novamente.' }
  }
}
