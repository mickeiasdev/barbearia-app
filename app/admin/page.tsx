import Link from 'next/link'
import {
  Calendar,
  CheckCircle,
  Package,
  Receipt,
  Scissors,
  Settings,
  TrendingUp,
  UserX,
  X,
} from 'lucide-react'
import { requireAdminPage } from '@/lib/data'
import { formatBRL } from '@/lib/utils'
import {
  currentMonthKey,
  dateKey,
  dayStartISO,
  monthRange,
  nextDayStartISO,
  timeInSP,
  todayKey,
} from '@/lib/tz'
import StatusBadge from '@/components/status-badge'
import { setAppointmentStatusAction } from '@/actions/admin'
import type { AppointmentDetails, Barber, Product, Service } from '@/lib/types'
import ActionButton from '@/components/admin/action-button'

export default async function AdminDashboardPage() {
  const { supabase, establishment } = await requireAdminPage()

  // sem estabelecimento -> onboarding
  if (!establishment) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <Settings className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Vamos começar!
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Cadastre os dados da barbearia para liberar barbeiros, serviços, produtos e
          o PDV.
        </p>
        <Link href="/admin/configuracoes" className="btn btn-primary mt-6">
          Configurar barbearia
        </Link>
      </div>
    )
  }

  const today = todayKey()
  const dayStart = dayStartISO(today)
  const dayEnd = nextDayStartISO(today)
  const month = monthRange(currentMonthKey())

  const [
    { data: todayAppts },
    { count: pendingCount },
    { count: monthNoShowCount },
    { data: monthCompletedData },
    { data: monthOrdersData },
    { data: lowStockData },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select(
        '*, barber:barbers(full_name), service:services(name), client:profiles!appointments_client_id_fkey(full_name, phone)'
      )
      .gte('starts_at', dayStart)
      .lt('starts_at', dayEnd)
      .order('starts_at'),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('starts_at', month.start)
      .lt('starts_at', month.end)
      .eq('status', 'no_show'),
    supabase
      .from('appointments')
      .select('price_cents, service:services(name)')
      .gte('starts_at', month.start)
      .lt('starts_at', month.end)
      .eq('status', 'completed'),
    supabase
      .from('orders')
      .select('total_cents')
      .gte('created_at', month.start)
      .lt('created_at', month.end)
      .eq('status', 'paid'),
    supabase
      .from('products')
      .select('name, stock')
      .eq('is_active', true)
      .lte('stock', 5)
      .order('stock')
      .limit(6),
  ])

  const todayAppointments = (todayAppts ?? []) as unknown as AppointmentDetails[]
  const monthCompleted = (monthCompletedData ?? []) as unknown as { price_cents: number; service: { name: string } | null }[]
  const monthOrders = (monthOrdersData ?? []) as { total_cents: number }[]
  const lowStock = (lowStockData ?? []) as { name: string; stock: number }[]

  const servicesRevenue = monthCompleted.reduce((acc, a) => acc + (a.price_cents ?? 0), 0)
  const productsRevenue = monthOrders.reduce((acc, o) => acc + (o.total_cents ?? 0), 0)
  const monthRevenue = servicesRevenue + productsRevenue

  // top serviços do mês
  const serviceCount = new Map<string, number>()
  monthCompleted.forEach((a) => {
    const name = a.service?.name ?? '—'
    serviceCount.set(name, (serviceCount.get(name) ?? 0) + 1)
  })
  const topServices = [...serviceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const kpis = [
    { label: 'Agendamentos hoje', value: String(todayAppointments.length), icon: Calendar, hint: 'todos os status' },
    { label: 'Aguardando confirmação', value: String(pendingCount ?? 0), icon: Receipt, hint: 'ação necessária' },
    { label: 'Receita do mês', value: formatBRL(monthRevenue), icon: TrendingUp, hint: 'serviços + produtos' },
    { label: 'Estoque baixo', value: String(lowStock.length), icon: Package, hint: '5 ou menos unidades' },
    { label: 'No-show no mês', value: String(monthNoShowCount ?? 0), icon: UserX, hint: 'agendamentos não comparecidos' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-400">{establishment.name}</p>
        </div>
        <p className="text-sm text-stone-400">
          {dateKey(new Date()).split('-').reverse().join('/')}
        </p>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                {kpi.label}
              </p>
              <kpi.icon className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-stone-100">{kpi.value}</p>
            <p className="mt-0.5 text-[11px] text-stone-400">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* agenda de hoje */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold text-stone-100">
            <Calendar className="h-5 w-5 text-amber-500" /> Agenda de hoje
          </h2>

          {todayAppointments.length === 0 ? (
            <p className="mt-4 text-sm text-stone-400">
              Nenhum agendamento para hoje.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-stone-800/70">
              {todayAppointments.map((appt) => (
                <div key={appt.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-100">
                      <span className="font-mono text-amber-400">
                        {timeInSP(appt.starts_at)}
                      </span>{' '}
                      — {appt.client?.full_name ?? 'Cliente'}
                      {appt.client?.phone && (
                        <span className="ml-1 text-xs text-stone-400">
                          ({appt.client.phone})
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-stone-400">
                      {appt.service?.name} com {appt.barber?.full_name} ·{' '}
                      {formatBRL(appt.price_cents)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={appt.status} />
                    {(appt.status === 'pending' || appt.status === 'confirmed') && (
                      <div className="flex gap-1.5">
                        {appt.status === 'pending' && (
                          <form action={setAppointmentStatusAction}>
                            <input type="hidden" name="id" value={appt.id} />
                            <input type="hidden" name="status" value="confirmed" />
                            <input type="hidden" name="back" value="/admin" />
                            <ActionButton className="btn btn-outline btn-sm" pendingLabel="Confirmando..." title="Confirmar">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </ActionButton>
                          </form>
                        )}
                        {appt.status === 'confirmed' && (
                          <form action={setAppointmentStatusAction}>
                            <input type="hidden" name="id" value={appt.id} />
                            <input type="hidden" name="status" value="completed" />
                            <input type="hidden" name="back" value="/admin" />
                            <ActionButton className="btn btn-primary btn-sm" pendingLabel="Concluindo..." title="Concluir">
                              <CheckCircle className="h-3.5 w-3.5" />
                            </ActionButton>
                          </form>
                        )}
                        <form action={setAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appt.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <input type="hidden" name="back" value="/admin" />
                          <ActionButton className="btn btn-danger btn-sm" pendingLabel="Cancelando..." confirmMessage="Cancelar este agendamento? O horário será liberado." title="Cancelar">
                            <X className="h-3.5 w-3.5" />
                          </ActionButton>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href={'/admin/agendamentos?data=' + today}
            className="btn btn-outline btn-sm mt-4"
          >
            Ver todos os agendamentos
          </Link>
        </section>

        {/* lateral: estoque + top serviços */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-stone-100">
              <Package className="h-5 w-5 text-amber-500" /> Estoque baixo
            </h2>
            {lowStock.length === 0 ? (
              <p className="mt-4 text-sm text-stone-400">Todos os produtos com estoque saudável. ✓</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {lowStock.map((p) => (
                  <li key={p.name} className="flex items-center justify-between text-sm">
                    <span className="truncate text-stone-300">{p.name}</span>
                    <span className={p.stock === 0 ? 'font-bold text-red-400' : 'font-bold text-amber-400'}>
                      {p.stock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/produtos" className="btn btn-outline btn-sm mt-4">
              Gerenciar produtos
            </Link>
          </section>

          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-semibold text-stone-100">
              <Scissors className="h-5 w-5 text-amber-500" /> Top serviços do mês
            </h2>
            {topServices.length === 0 ? (
              <p className="mt-4 text-sm text-stone-400">
                Nenhum atendimento concluído neste mês ainda.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {topServices.map(([name, count]) => (
                  <li key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate text-stone-300">{name}</span>
                    <span className="badge border-stone-700 bg-stone-800/60 text-stone-400">
                      {count}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
