import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, TrendingUp } from 'lucide-react'
import { requireAdminPage } from '@/lib/data'
import { formatBRL } from '@/lib/utils'
import {
  currentMonthKey,
  dateKey,
  monthLabel,
  monthRange,
  nextMonthKey,
  prevMonthKey,
  todayKey,
} from '@/lib/tz'
import type { AppointmentDetails, Profile } from '@/lib/types'

interface MonthAppt {
  price_cents: number
  barber: { full_name: string; commission_pct: number } | null
  service: { name: string } | null
  client: { full_name: string } | null
}

const MONTH_RE = /^\d{4}-\d{2}$/

export default async function AdminRelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const sp = await searchParams
  const mes = sp.mes && MONTH_RE.test(sp.mes) ? sp.mes : currentMonthKey()

  const { supabase } = await requireAdminPage()
  const range = monthRange(mes)

  // últimos 6 meses (inclusive o atual)
  const chartMonths: string[] = []
  let m = currentMonthKey()
  for (let i = 0; i < 6; i++) {
    chartMonths.unshift(m)
    m = prevMonthKey(m)
  }
  const chartStart = monthRange(chartMonths[0]).start

  const [
    { data: monthApptsData },
    { data: monthOrdersData },
    { data: histApptsData },
    { data: histOrdersData },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select(
        'price_cents, barber:barbers(full_name, commission_pct), service:services(name), client:profiles!appointments_client_id_fkey(full_name)'
      )
      .eq('status', 'completed')
      .gte('starts_at', range.start)
      .lt('starts_at', range.end),
    supabase
      .from('orders')
      .select('total_cents, client:profiles!orders_client_id_fkey(full_name)')
      .eq('status', 'paid')
      .gte('created_at', range.start)
      .lt('created_at', range.end),
    supabase
      .from('appointments')
      .select('starts_at, price_cents')
      .eq('status', 'completed')
      .gte('starts_at', chartStart),
    supabase
      .from('orders')
      .select('created_at, total_cents')
      .eq('status', 'paid')
      .gte('created_at', chartStart),
  ])

  const monthAppts = (monthApptsData ?? []) as unknown as MonthAppt[]
  const monthOrders = (monthOrdersData ?? []) as unknown as Array<{
    total_cents: number
    client: { full_name: string } | null
  }>
  const histAppts = (histApptsData ?? []) as { starts_at: string; price_cents: number }[]
  const histOrders = (histOrdersData ?? []) as { created_at: string; total_cents: number }[]

  const servicesRevenue = monthAppts.reduce((acc, a) => acc + a.price_cents, 0)
  const productsRevenue = monthOrders.reduce((acc, o) => acc + o.total_cents, 0)
  const totalRevenue = servicesRevenue + productsRevenue

  // gráfico: receita por mês (últimos 6)
  const byMonth = new Map<string, number>()
  chartMonths.forEach((k) => byMonth.set(k, 0))
  histAppts.forEach((a) => {
    const k = dateKey(a.starts_at).slice(0, 7)
    if (byMonth.has(k)) byMonth.set(k, (byMonth.get(k) ?? 0) + a.price_cents)
  })
  histOrders.forEach((o) => {
    const k = dateKey(o.created_at).slice(0, 7)
    if (byMonth.has(k)) byMonth.set(k, (byMonth.get(k) ?? 0) + o.total_cents)
  })
  const chartMax = Math.max(1, ...chartMonths.map((k) => byMonth.get(k) ?? 0))

  // comissões por barbeiro
  const byBarber = new Map<string, { count: number; revenue: number; commission: number; pct: number }>()
  monthAppts.forEach((a) => {
    if (!a.barber) return
    const key = a.barber.full_name
    const pct = Number(a.barber.commission_pct)
    const cur = byBarber.get(key) ?? { count: 0, revenue: 0, commission: 0, pct }
    cur.count += 1
    cur.revenue += a.price_cents
    cur.commission += Math.round((a.price_cents * pct) / 100)
    byBarber.set(key, cur)
  })
  const commissions = [...byBarber.entries()].sort((a, b) => b[1].revenue - a[1].revenue)

  // top clientes
  const byClient = new Map<string, number>()
  monthAppts.forEach((a) => {
    const key = a.client?.full_name ?? '—'
    byClient.set(key, (byClient.get(key) ?? 0) + a.price_cents)
  })
  monthOrders.forEach((o) => {
    const key = o.client?.full_name ?? 'Avulso'
    byClient.set(key, (byClient.get(key) ?? 0) + o.total_cents)
  })
  const topClients = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const isCurrentMonth = mes === currentMonthKey()

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Relatórios</h1>
          <p className="mt-2 text-sm text-stone-500">
            Receita, comissões dos barbeiros e exportação para contabilidade.
          </p>
        </div>

        {/* navegação de mês */}
        <div className="flex items-center gap-2">
          <Link
            href={'/admin/relatorios?mes=' + prevMonthKey(mes)}
            className="btn btn-outline btn-sm"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="w-44 text-center text-sm font-semibold capitalize text-stone-200">
            {monthLabel(mes)}
          </span>
          <Link
            href={'/admin/relatorios?mes=' + nextMonthKey(mes)}
            className={'btn btn-outline btn-sm' + (isCurrentMonth ? ' pointer-events-none opacity-40' : '')}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Receita serviços</p>
          <p className="mt-2 text-2xl font-bold text-stone-100">{formatBRL(servicesRevenue)}</p>
          <p className="mt-0.5 text-[11px] text-stone-600">{monthAppts.length} atendimentos concluídos</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Receita produtos</p>
          <p className="mt-2 text-2xl font-bold text-stone-100">{formatBRL(productsRevenue)}</p>
          <p className="mt-0.5 text-[11px] text-stone-600">{monthOrders.length} pedidos pagos</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Receita total</p>
          <p className="mt-2 text-2xl font-bold text-amber-500">{formatBRL(totalRevenue)}</p>
          <p className="mt-0.5 text-[11px] text-stone-600">serviços + produtos</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Total comissões</p>
          <p className="mt-2 text-2xl font-bold text-stone-100">
            {formatBRL(commissions.reduce((acc, [, b]) => acc + b.commission, 0))}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-600">a pagar aos barbeiros</p>
        </div>
      </div>

      {/* gráfico 6 meses */}
      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-semibold text-stone-100">
          <TrendingUp className="h-5 w-5 text-amber-500" /> Receita — últimos 6 meses
        </h2>
        <div className="mt-6 flex h-48 items-end gap-3">
          {chartMonths.map((k) => {
            const value = byMonth.get(k) ?? 0
            const heightPct = Math.max(2, Math.round((value / chartMax) * 100))
            const short = monthLabel(k).split(' de ')[0].slice(0, 3)
            return (
              <div key={k} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-stone-500">
                  {value > 0 ? formatBRL(value) : ''}
                </span>
                <div
                  className={'w-full rounded-t-md ' + (k === mes ? 'bg-amber-500' : 'bg-amber-500/30')}
                  style={{ height: heightPct + '%' }}
                />
                <span className="text-[10px] capitalize text-stone-500">{short}</span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* comissões */}
        <section className="card overflow-x-auto p-0">
          <h2 className="table-head pt-5">Comissões por barbeiro</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-800/80">
                <th className="table-head">Barbeiro</th>
                <th className="table-head">Atendimentos</th>
                <th className="table-head">Receita</th>
                <th className="table-head">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {commissions.map(([name, b]) => (
                <tr key={name}>
                  <td className="table-cell font-medium text-stone-100">
                    {name}
                    <span className="ml-1 text-xs text-stone-600">({b.pct}%)</span>
                  </td>
                  <td className="table-cell">{b.count}</td>
                  <td className="table-cell">{formatBRL(b.revenue)}</td>
                  <td className="table-cell font-semibold text-amber-500">
                    {formatBRL(b.commission)}
                  </td>
                </tr>
              ))}
              {commissions.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-cell py-8 text-center text-stone-500">
                    Nenhum atendimento concluído neste mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* top clientes + export */}
        <section className="card p-6">
          <h2 className="font-semibold text-stone-100">Top clientes do mês</h2>
          <ul className="mt-4 space-y-2">
            {topClients.map(([name, spent], i) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-3 text-stone-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-500">
                    {i + 1}
                  </span>
                  {name}
                </span>
                <span className="font-semibold text-stone-100">{formatBRL(spent)}</span>
              </li>
            ))}
            {topClients.length === 0 && (
              <li className="text-sm text-stone-500">Sem movimento neste mês.</li>
            )}
          </ul>

          <div className="mt-6 border-t border-stone-800/80 pt-4">
            <p className="label">Exportar para contabilidade (CSV/Excel)</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={'/api/export?type=agendamentos&month=' + mes}
                className="btn btn-outline btn-sm"
              >
                <Download className="h-3.5 w-3.5" /> Agendamentos do mês
              </a>
              <a
                href={'/api/export?type=pedidos&month=' + mes}
                className="btn btn-outline btn-sm"
              >
                <Download className="h-3.5 w-3.5" /> Pedidos do mês
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
