"use client"

import { useActionState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { addCompanyManagerAction, removeCompanyManagerAction, type CompanyState } from '@/actions/company'
import ActionButton from '@/components/admin/action-button'

export interface ManagerRow {
  profile_id: string
  full_name: string
  email: string | null
  is_me: boolean
}

export default function CompanyManagersManager({ managers }: { managers: ManagerRow[] }) {
  const [state, formAction, isPending] = useActionState<CompanyState, FormData>(
    addCompanyManagerAction,
    {}
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-stone-100">Gerenciadores da empresa</h2>
        <p className="mt-1 text-xs text-stone-400">
          Pessoas que podem alterar os dados da empresa e convidar outros
          gerenciadores — apenas barbeiros vinculados a ela.
        </p>
      </div>

      <ul className="divide-y divide-stone-800/70 rounded-lg border border-stone-800">
        {managers.map((m) => (
          <li key={m.profile_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-200">
                {m.full_name}
                {m.is_me && (
                  <span className="badge ml-2 border-amber-500/30 bg-amber-500/10 text-amber-400">você</span>
                )}
              </p>
              <p className="truncate text-xs text-stone-400">{m.email ?? '—'}</p>
            </div>
            {!m.is_me && (
              <form action={removeCompanyManagerAction} className="shrink-0">
                <input type="hidden" name="id" value={m.profile_id} />
                <ActionButton
                  className="btn btn-danger btn-sm"
                  pendingLabel="Removendo..."
                  confirmMessage={'Remover ' + m.full_name.split(' ')[0] + ' do gerenciamento da empresa?'}
                  aria-label={'Remover ' + m.full_name + ' dos gerenciadores'}
                >
                  <X className="h-3.5 w-3.5" /> Remover
                </ActionButton>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form action={formAction} className="space-y-2">
        {state.error && <div className="error-box" role="alert">{state.error}</div>}
        {state.ok && state.notice && <div className="ok-box" role="status">{state.notice}</div>}
        <label htmlFor="mgr-email" className="label">Adicionar gerenciador por e-mail</label>
        <div className="flex gap-2">
          <input
            id="mgr-email"
            name="email"
            type="email"
            required
            placeholder="barbeiro@email.com"
            className="input"
          />
          <button type="submit" disabled={isPending} className="btn btn-primary shrink-0">
            <UserPlus className="h-4 w-4" />
            {isPending ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        <p className="text-[11px] text-stone-400">
          O e-mail precisa ser o login de um barbeiro já vinculado a esta empresa.
        </p>
      </form>
    </div>
  )
}
