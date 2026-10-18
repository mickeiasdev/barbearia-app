"use client"

import { useActionState } from 'react'
import { X } from 'lucide-react'
import { cancelAppointmentAction, type CancelState } from '@/actions/booking'

export default function CancelAppointmentButton({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState<CancelState, FormData>(
    cancelAppointmentAction,
    {}
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      {state.error && (
        <p className="mb-2 text-right text-xs text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending || state.ok === true}
        className="btn btn-danger btn-sm w-full"
      >
        <X className="h-3.5 w-3.5" />
        {isPending ? 'Cancelando...' : state.ok ? 'Cancelado' : 'Cancelar agendamento'}
      </button>
    </form>
  )
}
