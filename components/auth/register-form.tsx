"use client"

import { useState } from 'react'
import { useActionState } from 'react'
import { Scissors, User, UserPlus } from 'lucide-react'
import { registerAction, type AuthState } from '@/actions/auth'

type AccountType = 'client' | 'professional'

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    registerAction,
    {}
  )
  const [accountType, setAccountType] = useState<AccountType>('client')

  const typeCard = (value: AccountType, icon: React.ReactNode, title: string, subtitle: string) => (
    <button
      type="button"
      onClick={() => setAccountType(value)}
      aria-pressed={accountType === value}
      className={
        'flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors ' +
        (accountType === value
          ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
          : 'border-stone-700 text-stone-400 hover:border-amber-500/40 hover:text-amber-400')
      }
    >
      {icon}
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-[11px] leading-tight text-stone-400">{subtitle}</span>
    </button>
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.notice && <div className="ok-box" role="status">{state.notice}</div>}

      <input type="hidden" name="account_type" value={accountType} />

      {/* tipo de conta */}
      <div>
        <span className="label">Quero usar o site como</span>
        <div className="flex gap-3">
          {typeCard(
            'client',
            <User className="h-5 w-5" />,
            'Cliente',
            'Agendar horários e comprar produtos'
          )}
          {typeCard(
            'professional',
            <Scissors className="h-5 w-5" />,
            'Profissional',
            'Tenho meu próprio espaço e agenda'
          )}
        </div>
      </div>

      {accountType === 'professional' && (
        <div className="space-y-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-xs text-stone-400">
            Você será o administrador do seu espaço, com serviços, produtos,
            agenda e Pagamento Pix próprios.
          </p>
          <div>
            <label htmlFor="workspace_name" className="label">Nome do seu espaço *</label>
            <input
              id="workspace_name"
              name="workspace_name"
              required
              placeholder="Ex.: Studio João"
              className="input"
            />
            <p className="mt-1 text-[11px] text-stone-400">
              É o nome que seus clientes verão no site.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="workspace_whatsapp" className="label">WhatsApp do espaço</label>
              <input
                id="workspace_whatsapp"
                name="workspace_whatsapp"
                placeholder="(11) 99999-9999"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="workspace_address" className="label">Endereço</label>
              <input
                id="workspace_address"
                name="workspace_address"
                placeholder="Rua, número, bairro, cidade"
                className="input"
              />
            </div>
          </div>
          <p className="text-[11px] text-stone-400">
            Horários de atendimento, serviços e chave Pix você configura depois, no painel.
          </p>
        </div>
      )}

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
        {isPending
          ? 'Criando conta...'
          : accountType === 'professional'
            ? 'Criar conta e meu espaço'
            : 'Criar conta'}
      </button>
    </form>
  )
}
