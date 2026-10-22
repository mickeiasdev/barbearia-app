"use client"

import Link from 'next/link'
import { useActionState } from 'react'
import { LogIn } from 'lucide-react'
import { loginAction, type AuthState } from '@/actions/auth'
import GoogleButton from '@/components/auth/google-button'

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

      <p className="text-center">
        <Link
          href="/recuperar-senha"
          className="text-xs font-medium text-stone-400 underline-offset-4 hover:text-amber-400 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </p>

      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span className="h-px flex-1 bg-stone-800" /> ou <span className="h-px flex-1 bg-stone-800" />
      </div>

      <GoogleButton next={next} />
    </form>
  )
}
