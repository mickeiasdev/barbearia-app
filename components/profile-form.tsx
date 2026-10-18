"use client"

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { updateProfileAction, type AuthState } from '@/actions/auth'

interface Props {
  fullName: string
  phone: string
}

export default function ProfileForm({ fullName, phone }: Props) {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    updateProfileAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box">{state.error}</div>}
      {state.notice && <div className="ok-box">{state.notice}</div>}

      <div>
        <label htmlFor="p-name" className="label">Nome completo</label>
        <input id="p-name" name="full_name" defaultValue={fullName} required className="input" />
      </div>

      <div>
        <label htmlFor="p-phone" className="label">WhatsApp</label>
        <input id="p-phone" name="phone" defaultValue={phone} placeholder="(11) 99999-9999" className="input" />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <Save className="h-4 w-4" />
        {isPending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
