"use client"

import { useActionState } from 'react'
import { Scissors } from 'lucide-react'
import { createWorkspaceAction, type WorkspaceState } from '@/actions/auth'

export default function WorkspaceCreateForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, isPending] = useActionState<WorkspaceState, FormData>(
    createWorkspaceAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}

      <div>
        <label htmlFor="ws-name" className="label">Nome do seu espaço *</label>
        <input
          id="ws-name"
          name="name"
          required
          placeholder="Ex.: Studio João"
          className="input"
        />
        <p className="mt-1 text-[11px] text-stone-400">
          É o nome que seus clientes verão no site.
        </p>
      </div>

      {!compact && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ws-whatsapp" className="label">WhatsApp</label>
              <input
                id="ws-whatsapp"
                name="whatsapp"
                placeholder="(11) 99999-9999"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="ws-phone" className="label">Telefone fixo (opcional)</label>
              <input
                id="ws-phone"
                name="phone"
                placeholder="(11) 3333-3333"
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ws-address" className="label">Endereço</label>
            <input
              id="ws-address"
              name="address"
              placeholder="Rua, número, bairro, cidade"
              className="input"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="ws-opening" className="label">Abre às</label>
              <input
                id="ws-opening"
                name="opening_time"
                type="time"
                defaultValue="09:00"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="ws-closing" className="label">Fecha às</label>
              <input
                id="ws-closing"
                name="closing_time"
                type="time"
                defaultValue="19:00"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="ws-step" className="label">Intervalo (min)</label>
              <select id="ws-step" name="slot_step_min" defaultValue="15" className="input">
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ws-pix" className="label">Chave Pix (opcional)</label>
            <input
              id="ws-pix"
              name="pix_key"
              placeholder="CPF, celular, e-mail ou aleatória"
              className="input"
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Com a chave cadastrada, seus clientes pagam por QR Code Pix na hora.
            </p>
          </div>
        </>
      )}

      <button type="submit" disabled={isPending} className="btn btn-primary w-full">
        <Scissors className="h-4 w-4" />
        {isPending ? 'Criando seu espaço...' : 'Criar meu espaço'}
      </button>
    </form>
  )
}
