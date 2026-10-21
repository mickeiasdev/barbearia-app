"use client"

import { useActionState } from 'react'
import { Mail } from 'lucide-react'
import { forgotPasswordAction, type AuthState } from '@/actions/auth'

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    forgotPasswordAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.notice && <div className="ok-box" role="status">{state.notice}</div>}

      <div>
        <label htmlFor="email" className="label">E-mail da conta</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@email.com"
          className="input"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary w-full">
        <Mail className="h-4 w-4" />
        {isPending ? 'Enviando...' : 'Enviar link de recuperação'}
      </button>
    </form>
  )
}
