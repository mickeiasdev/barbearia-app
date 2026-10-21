"use client"

import { useActionState } from 'react'
import { UserPlus } from 'lucide-react'
import { registerAction, type AuthState } from '@/actions/auth'

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    registerAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.notice && <div className="ok-box" role="status">{state.notice}</div>}

      <div>
        <label htmlFor="full_name" className="label">Nome completo</label>
        <input
          id="full_name"
          name="full_name"
          required
          placeholder="Seu nome"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="phone" className="label">WhatsApp (opcional)</label>
        <input
          id="phone"
          name="phone"
          placeholder="(11) 99999-9999"
          className="input"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className="input"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary w-full">
        <UserPlus className="h-4 w-4" />
        {isPending ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className="text-center text-[11px] text-stone-400">
        Profissionais entram apenas por convite do administrador da barbearia.
      </p>
    </form>
  )
}
