import { Fragment } from 'react'
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
import RescheduleForm from '@/components/admin/reschedule-form'
import { setAppointmentStatusAction } from '@/actions/admin'
import type { AppointmentDetails, Barber, Profile, Service } from '@/lib/types'
import ActionButton from '@/components/admin/action-button'

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
    q?: string
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
  const rawQ = (sp.q ?? '').trim()
  // remove caracteres usados pela sintaxe do .or() do supabase
  const q = rawQ.replace(/[%_,()]/g, '')

  // busca por cliente: perfis que casam -> filtra os agendamentos do dia
  let matchedIds: string[] = []
  if (q) {
    const { data: matched } = await supabase
      .from('profiles')
      .select('id')
      .or('full_name.ilike.%' + q + '%,phone.ilike.%' + q + '%')
      .limit(50)
    matchedIds = (matched ?? []).map((m) => (m as { id: string }).id)
  }

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
  if (q) {
    query = query.in(
      'client_id',
      matchedIds.length > 0 ? matchedIds : ['00000000-0000-0000-0000-000000000000']
    )
  }

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

  // serviços/barbeiros ativos para o formulário de remarcação
  const activeServices = services
    .filter((s) => s.is_active)
    .map((s) => ({ id: s.id, name: s.name, duration_min: s.duration_min, price_cents: s.price_cents }))
  const activeBarbers = barbers
    .filter((b) => b.is_active)
    .map((b) => ({ id: b.id, full_name: b.full_name }))

  const back =
    '/admin/agendamentos?data=' + data +
    (barbeiro ? '&barbeiro=' + barbeiro : '') +
    (status ? '&status=' + status : '') +
    (rawQ ? '&q=' + encodeURIComponent(rawQ) : '')

  return (
    <div>
      <h1 className="section-title">Agendamentos</h1>
      <p className="mt-2 text-sm text-stone-400">
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
        <input type="hidden" name="q" value={rawQ} />
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

      {/* busca por cliente (GET) */}
      <form action="/admin/agendamentos" method="GET" className="card mt-4 flex flex-wrap gap-3 p-4 sm:items-end">
        <input type="hidden" name="data" value={data} />
        <input type="hidden" name="barbeiro" value={barbeiro ?? 'todos'} />
        <input type="hidden" name="status" value={status ?? ''} />
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="f-q">Buscar cliente</label>
          <input
            id="f-q"
            name="q"
            type="search"
            defaultValue={rawQ}
            placeholder="Nome ou telefone..."
            className="input"
          />
        </div>
        <button type="submit" className="btn btn-outline btn-sm">Buscar</button>
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
      <div className="card mt-4 overflow-x-auto p-0 hidden md:block">
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
              <Fragment key={appt.id}>
              <tr>
                <td className="table-cell font-mono font-semibold text-amber-400">
                  {timeInSP(appt.starts_at)}
                </td>
                <td className="table-cell">
                  <p className="font-medium text-stone-100">{appt.client?.full_name ?? '—'}</p>
                  <p className="text-xs text-stone-400">{appt.client?.phone ?? ''}</p>
                </td>
                <td className="table-cell">
                  {appt.service?.name}
                  {appt.notes && (
                    <p className="text-xs italic text-stone-400">“{appt.notes}”</p>
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
                          <ActionButton className="btn btn-outline btn-sm" pendingLabel="Confirmando...">Confirmar</ActionButton>
                        </form>
                      )}
                      {appt.status === 'confirmed' && (
                        <form action={setAppointmentStatusAction}>
                          <input type="hidden" name="id" value={appt.id} />
                          <input type="hidden" name="status" value="completed" />
                          <input type="hidden" name="back" value={back} />
                          <ActionButton className="btn btn-primary btn-sm" pendingLabel="Concluindo...">Concluir</ActionButton>
                        </form>
                      )}
                      <form action={setAppointmentStatusAction}>
                        <input type="hidden" name="id" value={appt.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <input type="hidden" name="back" value={back} />
                        <ActionButton className="btn btn-danger btn-sm" pendingLabel="Cancelando..." confirmMessage="Cancelar este agendamento? O horário será liberado.">Cancelar</ActionButton>
                      </form>
                      <form action={setAppointmentStatusAction}>
                        <input type="hidden" name="id" value={appt.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <input type="hidden" name="back" value={back} />
                        <ActionButton className="btn btn-danger btn-sm" pendingLabel="Salvando..." confirmMessage="Marcar como não compareceu?">Não compareceu</ActionButton>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
              {(appt.status === 'pending' || appt.status === 'confirmed') && (
                <tr>
                  <td colSpan={7} className="table-cell bg-stone-950/60 py-3">
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-amber-400 hover:text-amber-300">
                        Remarcar
                      </summary>
                      <div className="mt-3">
                        <RescheduleForm
                          appointmentId={appt.id}
                          currentBarberId={appt.barber_id}
                          currentServiceId={appt.service_id}
                          currentDay={dateKey(appt.starts_at)}
                          services={activeServices}
                          barbers={activeBarbers}
                        />
                      </div>
                    </details>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={7} className="table-cell py-10 text-center text-stone-400">
                  Nenhum agendamento neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* cards mobile */}
      <div className="mt-4 space-y-3 md:hidden">
        {appointments.map((appt) => (
          <div key={appt.id} className="card flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold text-amber-400">
                  {timeInSP(appt.starts_at)}
                </p>
                <p className="text-sm font-semibold text-stone-100">
                  {appt.client?.full_name ?? '—'}
                </p>
              </div>
              <StatusBadge status={appt.status} />
            </div>
            <p className="text-xs text-stone-400">
              {appt.service?.name} · {appt.barber?.full_name}
              {appt.client?.phone ? ' · ' + appt.client.phone : ''}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400">
                {dateKey(appt.starts_at).split('-').reverse().join('/')}
              </span>
              <span className="font-semibold text-amber-400">
                {formatBRL(appt.price_cents)}
              </span>
            </div>
            {appt.notes && (
              <p className="text-xs italic text-stone-400">“{appt.notes}”</p>
            )}
            {(appt.status === 'pending' || appt.status === 'confirmed') && (
              <div className="flex flex-col gap-2 border-t border-stone-800/60 pt-2">
                <div className="flex flex-wrap gap-2">
                  {appt.status === 'pending' && (
                    <form action={setAppointmentStatusAction}>
                      <input type="hidden" name="id" value={appt.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <input type="hidden" name="back" value={back} />
                      <ActionButton className="btn btn-outline btn-sm" pendingLabel="Confirmando...">Confirmar</ActionButton>
                    </form>
                  )}
                  {appt.status === 'confirmed' && (
                    <form action={setAppointmentStatusAction}>
                      <input type="hidden" name="id" value={appt.id} />
                      <input type="hidden" name="status" value="completed" />
                      <input type="hidden" name="back" value={back} />
                      <ActionButton className="btn btn-primary btn-sm" pendingLabel="Concluindo...">Concluir</ActionButton>
                    </form>
                  )}
                  <form action={setAppointmentStatusAction}>
                    <input type="hidden" name="id" value={appt.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <input type="hidden" name="back" value={back} />
                    <ActionButton className="btn btn-danger btn-sm" pendingLabel="Cancelando..." confirmMessage="Cancelar este agendamento? O horário será liberado.">Cancelar</ActionButton>
                  </form>
                  <form action={setAppointmentStatusAction}>
                    <input type="hidden" name="id" value={appt.id} />
                    <input type="hidden" name="status" value="no_show" />
                    <input type="hidden" name="back" value={back} />
                    <ActionButton className="btn btn-danger btn-sm" pendingLabel="Salvando..." confirmMessage="Marcar como não compareceu?">Não compareceu</ActionButton>
                  </form>
                </div>
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-amber-400 hover:text-amber-300">
                    Remarcar
                  </summary>
                  <div className="mt-3">
                    <RescheduleForm
                      appointmentId={appt.id}
                      currentBarberId={appt.barber_id}
                      currentServiceId={appt.service_id}
                      currentDay={dateKey(appt.starts_at)}
                      services={activeServices}
                      barbers={activeBarbers}
                    />
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
        {appointments.length === 0 && (
          <p className="card p-10 text-center text-sm text-stone-400">
            Nenhum agendamento neste filtro.
          </p>
        )}
      </div>
    </div>
  )
}
