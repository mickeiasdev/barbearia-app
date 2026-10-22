"use client"

import { useActionState, useState } from 'react'
import { Store } from 'lucide-react'
import { registerTenantAction, type TenantState } from '@/actions/auth'
import { VERTICAL_OPTIONS } from '@/lib/verticals'

export default function RegisterTenantForm({ loggedIn }: { loggedIn: boolean }) {
  const [state, formAction, isPending] = useActionState<TenantState, FormData>(
    registerTenantAction,
    {}
  )
  const [vertical, setVertical] = useState('barbearia')

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}

      {!loggedIn && (
        <div className="space-y-4 rounded-lg border border-stone-800 bg-stone-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
            1. Sua conta de dono
          </p>
          <div>
            <label htmlFor="te-name" className="label">Seu nome *</label>
            <input id="te-name" name="full_name" required className="input" placeholder="Seu nome" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="te-email" className="label">E-mail *</label>
              <input id="te-email" name="email" type="email" required className="input" placeholder="voce@email.com" />
            </div>
            <div>
              <label htmlFor="te-pass" className="label">Senha *</label>
              <input id="te-pass" name="password" type="password" required minLength={6} className="input" placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
        </div>
      )}

      <input type="hidden" name="vertical" value={vertical} />

      <div className="space-y-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
          2. Seu negócio — 14 dias de Pro grátis
        </p>
        <div>
          <span className="label">Qual é o seu nicho?</span>
          <div className="flex flex-wrap gap-2">
            {VERTICAL_OPTIONS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVertical(v.key)}
                aria-pressed={vertical === v.key}
                className={
                  'badge ' +
                  (vertical === v.key
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-stone-700 bg-stone-800/60 text-stone-400 hover:text-amber-400')
                }
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="te-company" className="label">Nome do seu negócio *</label>
          <input id="te-company" name="company_name" required className="input" placeholder="Ex.: HS Barearia, Studio Bella..." />
          <p className="mt-1 text-[11px] text-stone-400">
            Vira o endereço do site: {'{'}nome{'}'}.SEU_DOMÍNIO
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="te-address" className="label">Endereço</label>
            <input id="te-address" name="address" className="input" placeholder="Rua, número, cidade" />
          </div>
          <div>
            <label htmlFor="te-wa" className="label">WhatsApp</label>
            <input id="te-wa" name="whatsapp" className="input" placeholder="(11) 99999-9999" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="te-open" className="label">Abre às</label>
            <input id="te-open" name="opening_time" type="time" defaultValue="09:00" className="input" />
          </div>
          <div>
            <label htmlFor="te-close" className="label">Fecha às</label>
            <input id="te-close" name="closing_time" type="time" defaultValue="19:00" className="input" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary w-full py-3 text-base">
        <Store className="h-5 w-5" />
        {isPending ? 'Criando sua barbearia...' : 'Criar minha barbearia (teste grátis)'}
      </button>
      <p className="text-center text-[11px] text-stone-400">
        Sem cartão de crédito. 14 dias do plano Pro, depois continue no Grátis ou assine.
      </p>
    </form>
  )
}
