"use client"

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { saveServiceAction, type AdminFormState } from '@/actions/admin'
import { centsToInput } from '@/lib/utils'
import type { Service } from '@/lib/types'

export default function ServiceForm({ service }: { service: Service | null }) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    saveServiceAction,
    {}
  )

  const key = service?.id ?? 'new'

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box">{state.error}</div>}
      {state.ok && !state.error && (
        <div className="ok-box">{state.notice ?? 'Serviço salvo com sucesso!'}</div>
      )}

      {service && <input type="hidden" name="id" value={service.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor={'svc-name-' + key}>Nome *</label>
          <input
            id={'svc-name-' + key}
            name="name"
            required
            defaultValue={service?.name ?? ''}
            className="input"
            placeholder="Ex.: Corte + Barba"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={'svc-desc-' + key}>Descrição</label>
          <input
            id={'svc-desc-' + key}
            name="description"
            defaultValue={service?.description ?? ''}
            className="input"
            placeholder="O que está incluso"
          />
        </div>
        <div>
          <label className="label" htmlFor={'svc-price-' + key}>Preço (R$) *</label>
          <input
            id={'svc-price-' + key}
            name="price"
            required
            inputMode="decimal"
            defaultValue={service ? centsToInput(service.price_cents) : ''}
            className="input"
            placeholder="45,90"
          />
        </div>
        <div>
          <label className="label" htmlFor={'svc-dur-' + key}>Duração (min) *</label>
          <input
            id={'svc-dur-' + key}
            name="duration_min"
            type="number"
            required
            min={5}
            max={480}
            step={5}
            defaultValue={service?.duration_min ?? 30}
            className="input"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={service ? service.is_active : true}
          className="h-4 w-4 accent-amber-500"
        />
        Serviço ativo (aparece no site)
      </label>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <Save className="h-4 w-4" />
        {isPending ? 'Salvando...' : service ? 'Salvar serviço' : 'Cadastrar serviço'}
      </button>
    </form>
  )
}
