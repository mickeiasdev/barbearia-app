"use client"

import { useActionState } from 'react'
import { Crown, UserPlus, X } from 'lucide-react'
import { addSpaceAdminAction, removeSpaceAdminAction, type AdminFormState } from '@/actions/admin'
import ActionButton from '@/components/admin/action-button'

export interface AdminRow {
  profile_id: string
  full_name: string
  email: string | null
  is_owner: boolean
  is_me: boolean
}

export default function SpaceAdminsManager({ admins }: { admins: AdminRow[] }) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    addSpaceAdminAction,
    {}
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-stone-100">Administradores do espaço</h2>
        <p className="mt-1 text-xs text-stone-400">
          Pessoas com acesso total a este espaço: agenda, serviços, produtos,
          vendas e relatórios.
        </p>
      </div>

      <ul className="divide-y divide-stone-800/70 rounded-lg border border-stone-800">
        {admins.map((a) => (
          <li key={a.profile_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-stone-200">
                {a.full_name}
                {a.is_owner && (
                  <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Crown className="h-3 w-3" /> Dono
                  </span>
                )}
                {a.is_me && !a.is_owner && (
                  <span className="badge border-stone-700 bg-stone-800/60 text-stone-400">você</span>
                )}
              </p>
              <p className="truncate text-xs text-stone-400">{a.email ?? '—'}</p>
            </div>
            {!a.is_owner && !a.is_me && (
              <form action={removeSpaceAdminAction} className="shrink-0">
                <input type="hidden" name="id" value={a.profile_id} />
                <ActionButton
                  className="btn btn-danger btn-sm"
                  pendingLabel="Removendo..."
                  confirmMessage={'Remover ' + a.full_name.split(' ')[0] + ' do espaço? Ele(a) perde o acesso ao painel.'}
                  aria-label={'Remover ' + a.full_name + ' dos administradores'}
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
        <label htmlFor="admin-email" className="label">Convidar administrador por e-mail</label>
        <div className="flex gap-2">
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            placeholder="pessoa@email.com"
            className="input"
          />
          <button type="submit" disabled={isPending} className="btn btn-primary shrink-0">
            <UserPlus className="h-4 w-4" />
            {isPending ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        <p className="text-[11px] text-stone-400">
          A pessoa precisa ter uma conta no site. Ao ser adicionada, ganha acesso a
          este painel.
        </p>
      </form>
    </div>
  )
}
