"use client"

import { useActionState } from 'react'
import { Building2 } from 'lucide-react'
import { masterCreateCompanyAction, type MasterState } from '@/actions/master'

export default function MasterCompanyForm() {
  const [state, formAction, isPending] = useActionState<MasterState, FormData>(
    masterCreateCompanyAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.ok && state.notice && <div className="ok-box" role="status">{state.notice}</div>}

      <div>
        <label htmlFor="mc-name" className="label">Nome da empresa *</label>
        <input
          id="mc-name"
          name="name"
          required
          className="input"
          placeholder="Ex.: HS Barearia — Unidade Centro"
        />
        <p className="mt-1 text-[11px] text-stone-400">
          A empresa ganha um site próprio em {'{'}empresa{'}'}.SEU_DOMÍNIO listando os
          profissionais dela.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mc-address" className="label">Endereço</label>
          <input id="mc-address" name="address" className="input" placeholder="Rua, número, cidade" />
        </div>
        <div>
          <label htmlFor="mc-wa" className="label">WhatsApp</label>
          <input id="mc-wa" name="whatsapp" className="input" placeholder="(11) 99999-9999" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mc-open" className="label">Abre às</label>
          <input id="mc-open" name="opening_time" type="time" defaultValue="09:00" className="input" />
        </div>
        <div>
          <label htmlFor="mc-close" className="label">Fecha às</label>
          <input id="mc-close" name="closing_time" type="time" defaultValue="19:00" className="input" />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <Building2 className="h-4 w-4" />
        {isPending ? 'Cadastrando...' : 'Cadastrar empresa'}
      </button>
    </form>
  )
}
