"use client"

import { useActionState } from 'react'
import { CreditCard, QrCode } from 'lucide-react'
import { createPlanPixAction, type BillingState } from '@/actions/billing'
import PixCard from '@/components/pix-card'

export default function SubscribeButton({
  plan,
  label,
  highlight,
}: {
  plan: 'pro' | 'business'
  label: string
  highlight?: boolean
}) {
  const [state, formAction, isPending] = useActionState<BillingState, FormData>(
    createPlanPixAction,
    {}
  )

  if (state.ok && state.pix) {
    return (
      <div className="space-y-3">
        <PixCard
          payload={state.pix.payload}
          qrDataUrl={state.pix.qrDataUrl}
          amountCents={state.amountCents ?? 0}
          defaultOpen
          note="Após pagar, seu plano é ativado automaticamente em instantes."
        />
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-2">
      {state.error && <div className="error-box text-xs" role="alert">{state.error}</div>}
      <input type="hidden" name="plan" value={plan} />
      <button
        type="submit"
        disabled={isPending}
        className={'btn w-full ' + (highlight ? 'btn-primary' : 'btn-outline')}
      >
        {isPending ? (
          <>
            <QrCode className="h-4 w-4 animate-pulse" /> Gerando Pix...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" /> {label}
          </>
        )}
      </button>
    </form>
  )
}
