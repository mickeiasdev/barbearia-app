"use client"

import { useActionState } from 'react'
import { CalendarCheck, LogIn } from 'lucide-react'
import { createAppointmentAction, type BookingState } from '@/actions/booking'

interface Props {
  servico: string
  barbeiro: string
  data: string
  hora: string
  isLoggedIn: boolean
  loginUrl: string
  re?: string | null
}

export default function ConfirmForm(props: Props) {
  const [state, formAction, isPending] = useActionState<BookingState, FormData>(
    createAppointmentAction,
    {}
  )

  if (!props.isLoggedIn) {
    return (
      <div className="card space-y-4 p-6 text-center">
        <p className="text-sm text-stone-400">
          Falta pouco! Entre na sua conta para confirmar{' '}
          {props.re ? 'o reagendamento' : 'o agendamento'} — seu progresso será mantido.
        </p>
        <a href={props.loginUrl} className="btn btn-primary w-full">
          <LogIn className="h-4 w-4" />
          Entrar e confirmar
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.error && <div className="error-box">{state.error}</div>}

      <input type="hidden" name="servico" value={props.servico} />
      <input type="hidden" name="barbeiro" value={props.barbeiro} />
      <input type="hidden" name="data" value={props.data} />
      <input type="hidden" name="hora" value={props.hora} />
      {props.re && <input type="hidden" name="re" value={props.re} />}

      <div>
        <label htmlFor="notes" className="label">
          Observações (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Ex.: máquina 2 nas laterais, tesoura em cima..."
          className="input resize-none"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3 text-base">
        <CalendarCheck className="h-5 w-5" />
        {isPending
          ? props.re
            ? 'Reagendando...'
            : 'Confirmando...'
          : props.re
            ? 'Confirmar reagendamento'
            : 'Confirmar agendamento'}
      </button>

      <p className="text-center text-xs text-stone-600">
        {props.re
          ? 'O horário anterior será substituído por este.'
          : 'Você pode acompanhar tudo em Minha Conta.'}
      </p>
    </form>
  )
}
