"use client"

import { useActionState, useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { adminRescheduleAction, type AdminFormState } from '@/actions/admin'
import { formatBRL, formatDuration } from '@/lib/utils'
import { timeInSP, todayKey } from '@/lib/tz'

interface Props {
  appointmentId: string
  currentBarberId: string
  currentServiceId: string
  currentDay: string
  services: { id: string; name: string; duration_min: number; price_cents: number }[]
  barbers: { id: string; full_name: string }[]
}

export default function RescheduleForm({
  appointmentId,
  currentBarberId,
  currentServiceId,
  currentDay,
  services,
  barbers,
}: Props) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    adminRescheduleAction,
    {}
  )

  const [serviceId, setServiceId] = useState(currentServiceId)
  const [barberId, setBarberId] = useState(currentBarberId)
  const [dateKey, setDateKey] = useState(currentDay >= todayKey() ? currentDay : todayKey())
  const [slots, setSlots] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [hora, setHora] = useState('')

  const service = services.find((s) => s.id === serviceId)

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

  if (state.ok) {
    return (
      <div className="space-y-3">
        <div className="ok-box" role="status">{state.notice ?? 'Remarcado!'}</div>
        <p className="text-xs text-stone-400">Feche esta caixa e atualize a lista se necessário.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}

      <input type="hidden" name="id" value={appointmentId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={'rs-service-' + appointmentId}>Novo serviço</label>
          <select
            id={'rs-service-' + appointmentId}
            name="service_id"
            required
            className="input"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatBRL(s.price_cents)} ({formatDuration(s.duration_min)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={'rs-barber-' + appointmentId}>Barbeiro</label>
          <select
            id={'rs-barber-' + appointmentId}
            name="barber_id"
            required
            className="input"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={'rs-date-' + appointmentId}>Nova data</label>
          <input
            id={'rs-date-' + appointmentId}
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
          <label className="label" htmlFor={'rs-hour-' + appointmentId}>Novo horário</label>
          <input type="hidden" name="hora" value={hora} />
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950 p-2">
            {loading ? (
              <span className="p-1 text-xs text-stone-400">Carregando horários...</span>
            ) : (slots ?? []).length === 0 ? (
              <span className="p-1 text-xs text-stone-400">Sem horários livres neste dia</span>
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
      </div>

      <button type="submit" disabled={isPending || !hora} className="btn btn-primary btn-sm">
        <CalendarClock className="h-3.5 w-3.5" />
        {isPending ? 'Remarcando...' : 'Confirmar remarcação'}
      </button>
    </form>
  )
}
