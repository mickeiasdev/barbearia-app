import { Search, Users } from 'lucide-react'
import { requireAdminPage } from '@/lib/data'
import { formatBRL } from '@/lib/utils'
import { dateKey, timeInSP } from '@/lib/tz'
import StatusBadge from '@/components/status-badge'
import type { AppointmentDetails, Profile } from '@/lib/types'

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const raw = (sp.q ?? '').trim()
  // remove caracteres usados pela sintaxe do .or() do supabase
  const q = raw.replace(/[%_,()]/g, '')

  const { supabase } = await requireAdminPage()

  let profilesQuery = supabase
    .from('profiles')
    .select('*')
    .in('role', ['client', 'barber'])
    .order('full_name')
    .limit(50)

  if (q) {
    profilesQuery = profilesQuery.or('full_name.ilike.%' + q + '%,email.ilike.%' + q + '%')
  }

  const [{ data: profilesData }, { data: apptsData }, { data: ordersData }] = await Promise.all([
    profilesQuery,
    supabase
      .from('appointments')
      .select('client_id, price_cents, starts_at, status, service:services(name)')
      .limit(5000),
    supabase.from('orders').select('client_id, total_cents').eq('status', 'paid').limit(5000),
  ])

  const clients = (profilesData ?? []) as Profile[]
  const allAppts = (apptsData ?? []) as unknown as Array<
    AppointmentDetails & { service?: { name: string } | null }
  >
  const orders = (ordersData ?? []) as { client_id: string | null; total_cents: number }[]

  // agregados por cliente
  const stats = new Map<string, { visits: number; spent: number; lastVisit: string | null }>()
  clients.forEach((c) => stats.set(c.id, { visits: 0, spent: 0, lastVisit: null }))

  allAppts.forEach((a) => {
    const s = stats.get(a.client_id)
    if (!s) return
    if (a.status === 'completed') {
      s.visits += 1
      s.spent += a.price_cents
      if (!s.lastVisit || a.starts_at > s.lastVisit) s.lastVisit = a.starts_at
    }
  })
  orders.forEach((o) => {
    const s = o.client_id ? stats.get(o.client_id) : undefined
    if (s) s.spent += o.total_cents
  })

  const apptsByClient = new Map<string, Array<typeof allAppts[number]>>()
  allAppts.forEach((a) => {
    apptsByClient.set(a.client_id, [...(apptsByClient.get(a.client_id) ?? []), a])
  })

  return (
    <div>
      <h1 className="section-title">Clientes</h1>
      <p className="mt-2 text-sm text-stone-500">
        Base de clientes com visitas, gasto total e último atendimento.
      </p>

      {/* busca */}
      <form className="card mt-8 flex flex-wrap gap-3 p-4 sm:items-end">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="q">Buscar</label>
          <input
            id="q"
            name="q"
            defaultValue={raw}
            placeholder="Nome ou e-mail..."
            className="input"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          <Search className="h-4 w-4" /> Buscar
        </button>
      </form>

      {/* tabela */}
      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-stone-800/80">
              <th className="table-head">Cliente</th>
              <th className="table-head">Contato</th>
              <th className="table-head">Visitas</th>
              <th className="table-head">Total gasto</th>
              <th className="table-head">Última visita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {clients.map((c) => {
              const s = stats.get(c.id)!
              const recent = (apptsByClient.get(c.id) ?? [])
                .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
                .slice(0, 5)
              return (
                <tr key={c.id}>
                  <td className="table-cell">
                    <p className="font-medium text-stone-100">{c.full_name}</p>
                    {c.role === 'barber' && (
                      <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-400">
                        barbeiro
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    <p className="text-xs text-stone-400">{c.email ?? '—'}</p>
                    <p className="text-xs text-stone-600">{c.phone ?? ''}</p>
                  </td>
                  <td className="table-cell font-semibold">{s.visits}</td>
                  <td className="table-cell font-semibold text-amber-500">
                    {formatBRL(s.spent)}
                  </td>
                  <td className="table-cell text-xs text-stone-500">
                    {s.lastVisit
                      ? dateKey(s.lastVisit).split('-').reverse().join('/')
                      : '—'}
                  </td>
                </tr>
              )
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell py-10 text-center text-stone-500">
                  Nenhum cliente encontrado{raw ? ' para esta busca' : ' ainda'}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* histórico por cliente */}
      <div className="mt-6 space-y-3">
        {clients.map((c) => {
          const recent = (apptsByClient.get(c.id) ?? [])
            .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
            .slice(0, 5)
          if (recent.length === 0) return null
          return (
            <details key={c.id} className="card p-0">
              <summary className="flex cursor-pointer select-none items-center gap-2 px-6 py-4 text-sm font-medium text-stone-300 hover:text-amber-400">
                <Users className="h-4 w-4 text-amber-500" />
                Últimos atendimentos — {c.full_name}
              </summary>
              <div className="border-t border-stone-800/80 px-6 py-4">
                <ul className="space-y-2">
                  {recent.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-stone-400">
                        {dateKey(a.starts_at).split('-').reverse().join('/')} às{' '}
                        {timeInSP(a.starts_at)} · {a.service?.name ?? 'Serviço'}
                      </span>
                      <span className="flex items-center gap-3">
                        <StatusBadge status={a.status} />
                        <span className="font-medium text-stone-200">
                          {formatBRL(a.price_cents)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
