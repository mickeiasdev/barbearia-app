"use client"

import { useActionState } from 'react'
import { CalendarX } from 'lucide-react'
import { saveTimeOffAction, type AdminFormState } from '@/actions/admin'

export default function TimeOffForm({ barberId }: { barberId: string }) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    saveTimeOffAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.ok && state.notice && <div className="ok-box" role="status">{state.notice}</div>}

      <input type="hidden" name="barber_id" value={barberId} />

      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label htmlFor={'to-day-' + barberId} className="label">Data</label>
          <input id={'to-day-' + barberId} name="day" type="date" required className="input py-1.5" />
        </div>
        <div>
          <label htmlFor={'to-start-' + barberId} className="label">De</label>
          <input
            id={'to-start-' + barberId}
            name="start_time"
            type="time"
            defaultValue="00:00"
            className="input py-1.5"
          />
        </div>
        <div>
          <label htmlFor={'to-end-' + barberId} className="label">Até</label>
          <input
            id={'to-end-' + barberId}
            name="end_time"
            type="time"
            defaultValue="23:59"
            className="input py-1.5"
          />
        </div>
      </div>

      <div>
        <label htmlFor={'to-reason-' + barberId} className="label">Motivo (opcional)</label>
        <input
          id={'to-reason-' + barberId}
          name="reason"
          placeholder="Ex.: folga, almoço, manutenção..."
          className="input py-1.5"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-outline btn-sm w-full">
        <CalendarX className="h-3.5 w-3.5" />
        {isPending ? 'Salvando...' : 'Bloquear horários'}
      </button>
      <p className="text-[11px] text-stone-400">
        Dia inteiro: use 00:00 às 23:59. O cliente não vê esses horários no site.
      </p>
    </form>
  )
}
