import Link from 'next/link'
import { requireAdminPage } from '@/lib/data'
import { formatBRL } from '@/lib/utils'
import {
  dateKey,
  dayStartISO,
  nextDayStartISO,
  timeInSP,
  todayKey,
} from '@/lib/tz'
import StatusBadge from '@/components/status-badge'
import NewAppointmentForm from '@/components/admin/new-appointment-form'
import { setAppointmentStatusAction } from '@/actions/admin'
import type { AppointmentDetails, Barber, Profile, Service } from '@/lib/types'

const STATUSES = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

export default async function AdminAgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string
    barbeiro?: string
    status?: string
    ok?: string
    erro?: string
  }>
}) {
  const sp = await searchParams
  const { supabase, establishment } = await requireAdminPage()

  if (!establishment) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="text-sm text-stone-400">Configure o estabelecimento primeiro.</p>
        <Link href="/admin/configuracoes" className="btn btn-primary mt-4">
          Ir para Configurações
        </Link>
      </div>
    )
  }

  const data = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : todayKey()
  const barbeiro = sp.barbeiro && sp.barbeiro !== 'todos' ? sp.barbeiro : null
  const status = sp.status && sp.status !== '' ? sp.status : null

  // query dos agendamentos do dia
  let query = supabase
    .from('appointments')
    .select(
      '*, barber:barbers(full_name), service:services(name), client:profiles!appointments_client_id_fkey(full_name, phone)'
    )
    .gte('starts_at', dayStartISO(data))
    .lt('starts_at', nextDayStartISO(data))
    .order('starts_at')

  if (barbeiro) query = query.eq('barber_id', barbeiro)
  if (status) query = query.eq('status', status)

  const [
    { data: appointmentsData },
    { data: barbersData },
    { data: servicesData },
    { data: linksData },
    { data: clientsData },
  ] = await Promise.all([
    query,
    supabase.from('barbers').select('*').order('full_name'),
    supabase.from('services').select('*').order('name'),
    supabase.from('barber_services').select('barber_id, service_id'),
    supabase.from('profiles').select('id, full_name, phone').in('role', ['client', 'barber']).order('full_name').limit(300),
  ])

  const appointments = (appointmentsData ?? []) as unknown as AppointmentDetails[]
  const barbers = (barbersData ?? []) as Barber[]
  const services = (servicesData ?? []) as Service[]
  const links = (linksData ?? []) as { barber_id: string; service_id: string }[]
  const clients = (clientsData ?? []) as Profile[]

  const back =
    '/admin/agendamentos?data=' + data +
    (barbeiro ? '&barbeiro=' + barbeiro : '') +
    (status ? '&status=' + status : '')

  return (
    <div>
      <h1 className="section-title">Agendamentos</h1>
      <p className="mt-2 text-sm text-stone-500">
        Filtre por dia, barbeiro e status. Use os botões para confirmar, concluir ou cancelar.
      </p>

      {sp.ok === 'agendado' && (
        <div className="ok-box mt-6">Agendamento criado e confirmado com sucesso!</div>
      )}
      {sp.ok && sp.ok !== 'agendado' && (
        <div className="ok-box mt-6">Status atualizado.</div>
      )}
      {sp.erro && <div className="error-box mt-6">{sp.erro}</div>}

      {/* filtros (GET) */}
      <form className="card mt-8 grid gap-4 p-6 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="f-date">Dia</label>
          <input id="f-date" name="data" type="date" defaultValue={data} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="f-barber">Barbeiro</label>
          <select id="f-barber" name="barbeiro" defaultValue={barbeiro ?? 'todos'} className="input">
            <option value="todos">Todos</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>{b.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={status ?? ''} className="input">
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn btn-primary w-full">Filtrar</button>
        </div>
      </form>

      {/* novo agendamento manual */}
      <details className="card mt-4 p-0">
        <summary className="cursor-pointer select-none px-6 py-4 font-semibold text-amber-400 hover:text-amber-300">
          + Novo agendamento (telefone/balcão)
        </summary>
        <div className="border-t border-stone-800/80 p-6">
          <NewAppointmentForm
            clients={clients.map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone }))}
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              duration_min: s.duration_min,
              price_cents: s.price_cents,
            }))}
            barbers={barbers.map((b) => ({
              id: b.id,
              full_name: b.full_name,
              service_ids: links.filter((l) => l.barber_id === b.id).map((l) => l.service_id),
            }))}
          />
        </div>
      </details>

      {/* tabela do dia */}
      <div className="card mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-stone-800/80">
              <th className="table-head">Hora</th>
              <th className="table-head">Cliente</th>
              <th className="table-head">Serviço</th>
              <th className="table-head">Barbeiro</th>
              <th className="table-head">Valor</th>
              <th className="table-head">Status</th>
              <th className="table-head">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {appointments.map((appt) => (
              <tr key={appt.id}>
                <td className="table-cell font-mono font-semibold text-amber-400">
                  {timeInSP(appt.starts_at)}
                </td>
                <td className="table-cell">
                  <p className="font-medium text-stone-100">{appt.client?.full_name ?? '—'}</p>
                  <p className="text-xs text-stone-600">{appt.client?.phone ?? ''}</p>
                </td>
                <td className="table-cell">
                  {appt.service?.name}
                  {appt.notes && (
                    <p className="text-xs italic text-stone-600">“{appt.notes}”</p>
                  )}
                </td>
                <td className="table-cell">{appt.barber?.full_name}</td>
                <td className="table-cell">{formatBRL(appt.price_cents)}</td>
                <td className="table-cell"><StatusBadge status={appt.status} /></td>
                <td className="table-cell">
                  {(appt.status === 'pending' || appt.status === 'confirmed') && (
                    <div className="flex flex-wrap gap-1.5">
                      {appt.status === 'pending' && (
                        <form action={setAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appt.id} />
                          <input type="hidden" name="status" value="confirmed" />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className="btn btn-outline btn-sm">Confirmar</button>
                        </form>
                      )}
                      {appt.status === 'confirmed' && (
                        <form action={setAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appt.id} />
                          <input type="hidden" name="status" value="completed" />
                          <input type="hidden" name="back" value={back} />
                          <button type="submit" className="btn btn-primary btn-sm">Concluir</button>
                        </form>
                      )}
                      <form action={setAppointmentStatusAction}>
                        <input type="hidden" name="id" value={appt.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <input type="hidden" name="back" value={back} />
                        <button type="submit" className="btn btn-danger btn-sm">Cancelar</button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={7} className="table-cell py-10 text-center text-stone-500">
                  Nenhum agendamento neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
