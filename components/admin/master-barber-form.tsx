"use client"

import { useActionState, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { masterCreateBarberAction, type MasterState } from '@/actions/master'

interface Props {
  companies: { id: string; name: string }[]
}

export default function MasterBarberForm({ companies }: Props) {
  const [state, formAction, isPending] = useActionState<MasterState, FormData>(
    masterCreateBarberAction,
    {}
  )
  const [companyMode, setCompanyMode] = useState(companies.length > 0 ? 'existing' : 'new')

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.ok && state.notice && <div className="ok-box" role="status">{state.notice}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mb-name" className="label">Nome do barbeiro *</label>
          <input id="mb-name" name="name" required className="input" placeholder="Ex.: João" />
        </div>
        <div>
          <label htmlFor="mb-phone" className="label">Telefone/WhatsApp</label>
          <input id="mb-phone" name="phone" className="input" placeholder="(11) 99999-9999" />
        </div>
        <div>
          <label htmlFor="mb-email" className="label">E-mail (login) *</label>
          <input id="mb-email" name="email" type="email" required className="input" placeholder="joao@email.com" />
        </div>
        <div>
          <label htmlFor="mb-password" className="label">Senha inicial *</label>
          <input
            id="mb-password"
            name="password"
            type="text"
            required
            minLength={6}
            className="input"
            placeholder="Mínimo 6 caracteres"
          />
          <p className="mt-1 text-[11px] text-stone-400">
            Você informa a senha; ele troca depois em Minha Conta.
          </p>
        </div>
      </div>

      {/* empresa onde vai trabalhar */}
      <div>
        <span className="label">Em qual empresa ele vai trabalhar?</span>
        <div className="flex flex-wrap gap-2">
          {companies.length > 0 && (
            <button
              type="button"
              onClick={() => setCompanyMode('existing')}
              aria-pressed={companyMode === 'existing'}
              className={
                'badge ' +
                (companyMode === 'existing'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-stone-700 bg-stone-800/60 text-stone-400')
              }
            >
              Empresa já existente
            </button>
          )}
          <button
            type="button"
            onClick={() => setCompanyMode('new')}
            aria-pressed={companyMode === 'new'}
            className={
              'badge ' +
              (companyMode === 'new'
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                : 'border-stone-700 bg-stone-800/60 text-stone-400')
            }
          >
            Nova empresa
          </button>
        </div>
      </div>

      {companyMode === 'existing' ? (
        <div>
          <label htmlFor="mb-company" className="label">Empresa</label>
          <select id="mb-company" name="company_id" required className="input">
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-stone-400">
            O barbeiro ganha um site próprio ({'{'}nome{'}'}.SEU_DOMÍNIO) e operação independente
            (serviços, produtos, clientes e vendas), no endereço da empresa.
          </p>
        </div>
      ) : (
        <>
          <input type="hidden" name="company_id" value="" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="mb-company-name" className="label">Nome da empresa *</label>
              <input
                id="mb-company-name"
                name="company_name"
                required={companyMode === 'new'}
                className="input"
                placeholder="Ex.: HS Barearia — Unidade Centro"
              />
            </div>
            <div>
              <label htmlFor="mb-company-address" className="label">Endereço</label>
              <input id="mb-company-address" name="company_address" className="input" placeholder="Rua, número, cidade" />
            </div>
            <div>
              <label htmlFor="mb-company-wa" className="label">WhatsApp da empresa</label>
              <input id="mb-company-wa" name="company_whatsapp" className="input" placeholder="(11) 99999-9999" />
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mb-commission" className="label">Comissão dele (%)</label>
          <input
            id="mb-commission"
            name="commission_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={100}
            className="input"
          />
          <p className="mt-1 text-[11px] text-stone-400">
            Trabalhando sozinho no próprio espaço, o normal é 100%.
          </p>
        </div>
        <div>
          <label htmlFor="mb-bio" className="label">Especialidade/bio (vai no site)</label>
          <input id="mb-bio" name="bio" className="input" placeholder="Ex.: Degradê e barba desenhada" />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <UserPlus className="h-4 w-4" />
        {isPending ? 'Cadastrando...' : 'Cadastrar barbeiro e criar login'}
      </button>
    </form>
  )
}
