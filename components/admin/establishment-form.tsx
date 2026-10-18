"use client"

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { saveEstablishmentAction, type AdminFormState } from '@/actions/admin'
import type { Establishment } from '@/lib/types'

export default function EstablishmentForm({
  establishment,
}: {
  establishment: Establishment | null
}) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    saveEstablishmentAction,
    {}
  )

  const e = establishment

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <div className="error-box">{state.error}</div>}
      {state.ok && !state.error && (
        <div className="ok-box">Dados da barbearia salvos com sucesso!</div>
      )}

      {e && <input type="hidden" name="id" value={e.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="est-name">Nome da barbearia *</label>
          <input id="est-name" name="name" required defaultValue={e?.name ?? ''} className="input" placeholder="BarberPro Studio" />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="est-address">Endereço</label>
          <input id="est-address" name="address" defaultValue={e?.address ?? ''} className="input" placeholder="Rua, número, cidade" />
        </div>

        <div>
          <label className="label" htmlFor="est-phone">Telefone</label>
          <input id="est-phone" name="phone" defaultValue={e?.phone ?? ''} className="input" placeholder="(11) 4002-8922" />
        </div>

        <div>
          <label className="label" htmlFor="est-whatsapp">WhatsApp</label>
          <input id="est-whatsapp" name="whatsapp" defaultValue={e?.whatsapp ?? ''} className="input" placeholder="(11) 99999-0001" />
        </div>

        <div>
          <label className="label" htmlFor="est-instagram">Instagram</label>
          <input id="est-instagram" name="instagram" defaultValue={e?.instagram ?? ''} className="input" placeholder="@suabarbearia" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="est-open">Abre às</label>
          <input id="est-open" name="opening_time" type="time" defaultValue={e?.opening_time?.slice(0, 5) ?? '09:00'} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="est-close">Fecha às</label>
          <input id="est-close" name="closing_time" type="time" defaultValue={e?.closing_time?.slice(0, 5) ?? '19:00'} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="est-step">Intervalo entre horários (min)</label>
          <input id="est-step" name="slot_step_min" type="number" min={5} max={60} step={5} defaultValue={e?.slot_step_min ?? 15} className="input" />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <Save className="h-4 w-4" />
        {isPending ? 'Salvando...' : e ? 'Salvar alterações' : 'Criar barbearia'}
      </button>
    </form>
  )
}
