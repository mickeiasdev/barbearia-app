"use client"

import { useActionState } from 'react'
import { KeyRound } from 'lucide-react'
import { updatePasswordAction, type AuthState } from '@/actions/auth'

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box">{state.error}</div>}
      {state.notice && <div className="ok-box">{state.notice}</div>}

      <div>
        <label htmlFor="pw-new" className="label">Nova senha</label>
        <input
          id="pw-new"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="pw-confirm" className="label">Confirmar nova senha</label>
        <input
          id="pw-confirm"
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Repita a senha"
          className="input"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-outline w-full">
        <KeyRound className="h-4 w-4" />
        {isPending ? 'Alterando...' : 'Alterar senha'}
      </button>
    </form>
  )
}
