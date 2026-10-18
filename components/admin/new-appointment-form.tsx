"use client"

import { useActionState, useEffect, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { adminCreateAppointmentAction, type AdminFormState } from '@/actions/admin'
import { formatBRL, formatDuration } from '@/lib/utils'
import { timeInSP, todayKey } from '@/lib/tz'

interface Props {
  clients: { id: string; full_name: string; phone: string | null }[]
  services: { id: string; name: string; duration_min: number; price_cents: number }[]
  barbers: { id: string; full_name: string; service_ids: string[] }[]
}

export default function NewAppointmentForm({ clients, services, barbers }: Props) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    adminCreateAppointmentAction,
    {}
  )

  const [serviceId, setServiceId] = useState('')
  const [barberId, setBarberId] = useState('')
  const [dateKey, setDateKey] = useState(todayKey())
  const [slots, setSlots] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [hora, setHora] = useState('')

  const service = services.find((s) => s.id === serviceId)
  const eligibleBarbers = barbers.filter((b) => b.service_ids.includes(serviceId))

  useEffect(() => {
    setHora('')
    setSlots(null)
    if (!serviceId || !barberId || !dateKey) return

    let active = true
    setLoading(true)

    const run = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.rpc('get_available_slots', {
          p_barber_id: barberId,
          p_date: dateKey,
          p_duration_min: service?.duration_min ?? 30,
        })
        if (active) setSlots((data as unknown as string[]) ?? [])
      } catch {
        if (active) setSlots([])
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [serviceId, barberId, dateKey, service])

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box">{state.error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="na-client">Cliente *</label>
          <select id="na-client" name="client_id" required className="input" defaultValue="">
            <option value="" disabled>Selecione o cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.phone ? ' (' + c.phone + ')' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="na-service">Serviço *</label>
          <select
            id="na-service"
            name="service_id"
            required
            className="input"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value)
              setBarberId('')
            }}
          >
            <option value="" disabled>Selecione</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatBRL(s.price_cents)} ({formatDuration(s.duration_min)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="na-barber">Barbeiro *</label>
          <select
            id="na-barber"
            name="barber_id"
            required
            className="input"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
            disabled={!serviceId}
          >
            <option value="" disabled>
              {serviceId ? 'Selecione' : 'Escolha o serviço primeiro'}
            </option>
            {eligibleBarbers.map((b) => (
              <option key={b.id} value={b.id}>{b.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="na-date">Data *</label>
          <input
            id="na-date"
            name="data"
            type="date"
            required
            className="input"
            value={dateKey}
            min={todayKey()}
            onChange={(e) => setDateKey(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="na-hour">Horário *</label>
          <input type="hidden" name="hora" value={hora} />
          <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950 p-2">
            {!serviceId || !barberId ? (
              <span className="p-1 text-xs text-stone-600">Escolha serviço e barbeiro</span>
            ) : loading ? (
              <span className="p-1 text-xs text-stone-600">Carregando...</span>
            ) : (slots ?? []).length === 0 ? (
              <span className="p-1 text-xs text-stone-600">Sem horários livres</span>
            ) : (
              (slots ?? []).map((slot) => {
                const label = timeInSP(slot).slice(0, 5)
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setHora(label)}
                    className={
                      'rounded-md border px-2 py-1 font-mono text-xs transition-colors ' +
                      (hora === label
                        ? 'border-amber-500 bg-amber-500 text-stone-950'
                        : 'border-stone-700 text-stone-400 hover:text-amber-400')
                    }
                  >
                    {label}
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="na-notes">Observações</label>
          <textarea id="na-notes" name="notes" rows={2} className="input resize-none" placeholder="Agendado por telefone..." />
        </div>
      </div>

      <button type="submit" disabled={isPending || !hora} className="btn btn-primary">
        <CalendarPlus className="h-4 w-4" />
        {isPending ? 'Agendando...' : 'Criar agendamento (confirmado)'}
      </button>
    </form>
  )
}
