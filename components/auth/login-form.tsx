"use client"

import { useActionState } from 'react'
import { LogIn } from 'lucide-react'
import { loginAction, type AuthState } from '@/actions/auth'

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    loginAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box">{state.error}</div>}

      <div>
        <label htmlFor="email" className="label">E-mail</label>
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

      <div>
        <label htmlFor="password" className="label">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="input"
        />
      </div>

      <input type="hidden" name="next" value={next} />

      <button type="submit" disabled={isPending} className="btn btn-primary w-full">
        <LogIn className="h-4 w-4" />
        {isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
