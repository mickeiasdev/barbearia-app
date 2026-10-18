import Link from 'next/link'
import { requireAdminPage } from '@/lib/data'
import { initials } from '@/lib/utils'
import { WEEKDAY_LABELS } from '@/lib/tz'
import BarberForm, { type ScheduleWindow } from '@/components/admin/barber-form'
import { deleteBarberAction, toggleBarberAction } from '@/actions/admin'
import type { Barber, BarberSchedule, Profile, Service } from '@/lib/types'

export default async function AdminBarbeirosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, establishment } = await requireAdminPage()

  if (!establishment) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="text-sm text-stone-400">
          Configure o estabelecimento antes de cadastrar barbeiros.
        </p>
        <Link href="/admin/configuracoes" className="btn btn-primary mt-4">
          Ir para Configurações
        </Link>
      </div>
    )
  }

  const [{ data: barbersData }, { data: linksData }, { data: schedulesData }, { data: servicesData }, { data: profilesData }] =
    await Promise.all([
      supabase.from('barbers').select('*').order('full_name'),
      supabase.from('barber_services').select('barber_id, service_id'),
      supabase.from('barber_schedules').select('*'),
      supabase.from('services').select('*').order('name'),
      supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['client', 'barber'])
        .order('full_name')
        .limit(200),
    ])

  const barbers = (barbersData ?? []) as Barber[]
  const links = (linksData ?? []) as { barber_id: string; service_id: string }[]
  const schedules = (schedulesData ?? []) as BarberSchedule[]
  const services = (servicesData ?? []) as Service[]
  const profiles = (profilesData ?? []) as Profile[]

  // perfis vinculáveis: exclui os já vinculados a OUTRO barbeiro
  const linkedTo = new Map<string, string>()
  barbers.forEach((b) => {
    if (b.profile_id) linkedTo.set(b.profile_id, b.id)
  })
  const linkableFor = (barberId: string | null) =>
    profiles
      .filter((p) => {
        const owner = linkedTo.get(p.id)
        return !owner || owner === barberId
      })
      .map((p) => ({ id: p.id, full_name: p.full_name, email: p.email, role: p.role }))

  const groupSchedules = (barberId: string): Record<number, ScheduleWindow[]> => {
    const byDay: Record<number, ScheduleWindow[]> = {}
    schedules
      .filter((s) => s.barber_id === barberId)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .forEach((s) => {
        byDay[s.weekday] = byDay[s.weekday] ?? []
        byDay[s.weekday].push({ start: s.start_time, end: s.end_time })
      })
    return byDay
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Barbeiros</h1>
          <p className="mt-2 text-sm text-stone-500">
            {barbers.length} profissional(is) — vários barbeiros por estabelecimento.
          </p>
        </div>
      </div>

      {sp.ok && <div className="ok-box mt-6">Operação realizada com sucesso.</div>}
      {sp.erro && <div className="error-box mt-6">{sp.erro}</div>}

      {/* novo barbeiro */}
      <details className="card group mt-8 p-0">
        <summary className="cursor-pointer select-none px-6 py-4 font-semibold text-amber-400 hover:text-amber-300">
          + Cadastrar novo barbeiro
        </summary>
        <div className="border-t border-stone-800/80 p-6">
          <BarberForm
            barber={null}
            services={services}
            selectedServiceIds={[]}
            scheduleByDay={{}}
            linkableProfiles={linkableFor(null)}
          />
        </div>
      </details>

      {/* lista */}
      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-stone-800/80">
              <th className="table-head">Barbeiro</th>
              <th className="table-head">Serviços</th>
              <th className="table-head">Escala</th>
              <th className="table-head">Comissão</th>
              <th className="table-head">Status</th>
              <th className="table-head">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {barbers.map((barber) => {
              const myServiceIds = links.filter((l) => l.barber_id === barber.id).map((l) => l.service_id)
              const mySchedule = groupSchedules(barber.id)
              const days = Object.keys(mySchedule)
                .map(Number)
                .sort()
                .map((d) => WEEKDAY_LABELS[d])

              return (
                <tr key={barber.id}>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      {barber.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={barber.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-500">
                          {initials(barber.full_name)}
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-stone-100">{barber.full_name}</p>
                        {barber.profile_id && (
                          <p className="text-[11px] text-stone-600">login vinculado</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{myServiceIds.length}</td>
                  <td className="table-cell">
                    <p className="text-xs text-stone-500">
                      {days.length > 0 ? days.join(', ') : '— sem escala —'}
                    </p>
                  </td>
                  <td className="table-cell">{barber.commission_pct}%</td>
                  <td className="table-cell">
                    <span className={'badge ' + (barber.is_active
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-stone-700 bg-stone-800 text-stone-400')}>
                      {barber.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <form action={toggleBarberAction}>
                        <input type="hidden" name="id" value={barber.id} />
                        <button type="submit" className="btn btn-outline btn-sm">
                          {barber.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </form>
                      <form action={deleteBarberAction}>
                        <input type="hidden" name="id" value={barber.id} />
                        <button type="submit" className="btn btn-danger btn-sm">
                          Excluir
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {barbers.length === 0 && (
              <tr>
                <td colSpan={6} className="table-cell py-10 text-center text-stone-500">
                  Nenhum barbeiro cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* editar cada barbeiro */}
      <div className="mt-6 space-y-3">
        {barbers.map((barber) => (
          <details key={barber.id} className="card p-0">
            <summary className="cursor-pointer select-none px-6 py-4 text-sm font-medium text-stone-300 hover:text-amber-400">
              Editar — {barber.full_name}
            </summary>
            <div className="border-t border-stone-800/80 p-6">
              <BarberForm
                barber={barber}
                services={services}
                selectedServiceIds={links.filter((l) => l.barber_id === barber.id).map((l) => l.service_id)}
                scheduleByDay={groupSchedules(barber.id)}
                linkableProfiles={linkableFor(barber.id)}
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
