import { CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { requireBarberPage } from '@/lib/data'
import { formatBRL, formatDuration } from '@/lib/utils'
import {
  currentMonthKey,
  dateKey,
  dayStartISO,
  monthRange,
  nextDayStartISO,
  shortDateLabel,
  timeInSP,
  todayKey,
} from '@/lib/tz'
import StatusBadge from '@/components/status-badge'
import { barberSetStatusAction } from '@/actions/barber'
import type { AppointmentDetails } from '@/lib/types'

export default async function BarbeiroHomePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, barber } = await requireBarberPage()

  const today = todayKey()
  const dayStart = dayStartISO(today)
  const dayEnd = nextDayStartISO(today)
  const weekEnd = new Date(Date.parse(dayStartISO(today)) + 7 * 86400000).toISOString()
  const month = monthRange(currentMonthKey())

  const [{ data: todayData }, { data: weekData }, { data: monthDone }] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, service:services(name, duration_min), client:profiles!appointments_client_id_fkey(full_name, phone)')
      .eq('barber_id', barber.id)
      .gte('starts_at', dayStart)
      .lt('starts_at', dayEnd)
      .order('starts_at'),
    supabase
      .from('appointments')
      .select('*, service:services(name), client:profiles!appointments_client_id_fkey(full_name, phone)')
      .eq('barber_id', barber.id)
      .gte('starts_at', dayEnd)
      .lt('starts_at', weekEnd)
      .order('starts_at'),
    supabase
      .from('appointments')
      .select('price_cents')
      .eq('barber_id', barber.id)
      .eq('status', 'completed')
      .gte('starts_at', month.start)
      .lt('starts_at', month.end),
  ])

  const todayAppointments = (todayData ?? []) as unknown as AppointmentDetails[]
  const weekAppointments = (weekData ?? []) as unknown as AppointmentDetails[]
  const monthCompleted = (monthDone ?? []) as { price_cents: number }[]

  const monthRevenue = monthCompleted.reduce((acc, a) => acc + a.price_cents, 0)
  const monthCommission = Math.round((monthRevenue * Number(barber.commission_pct)) / 100)

  // agrupa a semana por dia
  const byDay = new Map<string, AppointmentDetails[]>()
  weekAppointments.forEach((a) => {
    const key = dateKey(a.starts_at)
    byDay.set(key, [...(byDay.get(key) ?? []), a])
  })

  const kpis = [
    { label: 'Atendimentos hoje', value: String(todayAppointments.length), icon: Clock },
    { label: 'Próximos 7 dias', value: String(weekAppointments.length), icon: CheckCircle },
    { label: 'Concluídos no mês', value: String(monthCompleted.length), icon: CheckCircle },
    { label: 'Comissão do mês', value: formatBRL(monthCommission), icon: TrendingUp },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Olá, {barber.full_name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {shortDateLabel(today)} · comissão {barber.commission_pct}%
          </p>
        </div>
      </div>

      {sp.ok && <div className="ok-box mt-6">Atendimento atualizado!</div>}
      {sp.erro && <div className="error-box mt-6">{sp.erro}</div>}

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{kpi.label}</p>
              <kpi.icon className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-stone-100">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* agenda de hoje */}
      <section className="card mt-8 p-6">
        <h2 className="font-semibold text-stone-100">Agenda de hoje</h2>

        {todayAppointments.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">Nenhum atendimento hoje. Aproveite o dia!</p>
        ) : (
          <div className="mt-4 divide-y divide-stone-800/70">
            {todayAppointments.map((appt) => (
              <div key={appt.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100">
                    <span className="font-mono text-amber-400">{timeInSP(appt.starts_at)}</span>{' '}
                    — {appt.client?.full_name ?? 'Cliente'}
                    {appt.client?.phone && (
                      <span className="ml-1 text-xs text-stone-600">({appt.client.phone})</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {appt.service?.name} · {formatDuration(appt.service?.duration_min ?? 30)} ·{' '}
                    {formatBRL(appt.price_cents)}
                  </p>
                  {appt.notes && (
                    <p className="mt-0.5 text-xs italic text-stone-600">“{appt.notes}”</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={appt.status} />
                  {appt.status === 'pending' && (
                    <form action={barberSetStatusAction}>
                      <input type="hidden" name="id" value={appt.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <button type="submit" className="btn btn-outline btn-sm">
                        <CheckCircle className="h-3.5 w-3.5" /> Confirmar
                      </button>
                    </form>
                  )}
                  {appt.status === 'confirmed' && (
                    <form action={barberSetStatusAction}>
                      <input type="hidden" name="id" value={appt.id} />
                      <input type="hidden" name="status" value="completed" />
                      <button type="submit" className="btn btn-primary btn-sm">
                        <CheckCircle className="h-3.5 w-3.5" /> Concluir
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* próximos dias */}
      <section className="card mt-6 p-6">
        <h2 className="font-semibold text-stone-100">Próximos 7 dias</h2>
        {byDay.size === 0 ? (
          <p className="mt-4 text-sm text-stone-500">Nada agendado nos próximos dias ainda.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {[...byDay.entries()].map(([day, appts]) => (
              <div key={day}>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                  {shortDateLabel(day)}
                </p>
                <div className="mt-2 divide-y divide-stone-800/60">
                  {appts.map((appt) => (
                    <div key={appt.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <p className="text-sm text-stone-300">
                        <span className="font-mono font-semibold text-stone-100">
                          {timeInSP(appt.starts_at)}
                        </span>{' '}
                        — {appt.client?.full_name ?? 'Cliente'} · {appt.service?.name}
                      </p>
                      <StatusBadge status={appt.status} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
