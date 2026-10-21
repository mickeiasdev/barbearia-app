import Link from 'next/link'
import { requireAdminPage } from '@/lib/data'
import { initials } from '@/lib/utils'
import { WEEKDAY_LABELS, dateKey } from '@/lib/tz'
import BarberForm, { type ScheduleWindow } from '@/components/admin/barber-form'
import TimeOffForm from '@/components/admin/time-off-form'
import PortfolioForm from '@/components/admin/portfolio-form'
import Stars from '@/components/stars'
import {
  deleteBarberAction,
  deletePortfolioPhotoAction,
  deleteTimeOffAction,
  toggleBarberAction,
} from '@/actions/admin'
import type { Barber, BarberSchedule, Profile, Service } from '@/lib/types'
import ActionButton from '@/components/admin/action-button'

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

  const [
    { data: barbersData },
    { data: linksData },
    { data: schedulesData },
    { data: servicesData },
    { data: profilesData },
    { data: timeOffData },
    { data: photosData },
    { data: reviewsData },
  ] = await Promise.all([
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
      // folgas pontuais e bloqueios de horário
      supabase
        .from('barber_time_off')
        .select('id, barber_id, day, start_time, end_time, reason')
        .order('day'),
      // portfólio de fotos dos barbeiros
      supabase
        .from('barber_photos')
        .select('id, barber_id, url, caption')
        .order('created_at', { ascending: false })
        .limit(50),
      // avaliações visíveis no site
      supabase
        .from('reviews')
        .select('id, barber_id, rating, comment, created_at, client:profiles(full_name)')
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

  const barbers = (barbersData ?? []) as Barber[]
  const links = (linksData ?? []) as { barber_id: string; service_id: string }[]
  const schedules = (schedulesData ?? []) as BarberSchedule[]
  const services = (servicesData ?? []) as Service[]
  const profiles = (profilesData ?? []) as Profile[]
  const timeOffs = (timeOffData ?? []) as {
    id: string
    barber_id: string
    day: string
    start_time: string
    end_time: string
    reason: string | null
  }[]
  const photos = (photosData ?? []) as {
    id: string
    barber_id: string
    url: string
    caption: string | null
  }[]
  const reviews = (reviewsData ?? []) as unknown as {
    id: string
    barber_id: string
    rating: number
    comment: string | null
    created_at: string
    client: { full_name: string } | null
  }[]

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
          <p className="mt-2 text-sm text-stone-400">
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
                          <p className="text-[11px] text-stone-400">login vinculado</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{myServiceIds.length}</td>
                  <td className="table-cell">
                    <p className="text-xs text-stone-400">
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
                        <ActionButton className="btn btn-outline btn-sm" pendingLabel="Salvando...">
                          {barber.is_active ? 'Desativar' : 'Ativar'}
                        </ActionButton>
                      </form>
                      <form action={deleteBarberAction}>
                        <input type="hidden" name="id" value={barber.id} />
                        <ActionButton className="btn btn-danger btn-sm" pendingLabel="Excluindo..." confirmMessage="Excluir este barbeiro? Desative se ele tiver agendamentos.">
                          Excluir
                        </ActionButton>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
            {barbers.length === 0 && (
              <tr>
                <td colSpan={6} className="table-cell py-10 text-center text-stone-400">
                  Nenhum barbeiro cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* editar cada barbeiro */}
      <div className="mt-6 space-y-3">
        {barbers.map((barber) => {
          const myTimeOffs = timeOffs.filter((t) => t.barber_id === barber.id)
          const myPhotos = photos.filter((p) => p.barber_id === barber.id)
          const myReviews = reviews.filter((r) => r.barber_id === barber.id)
          const ratingSum = myReviews.reduce((acc, r) => acc + r.rating, 0)

          return (
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

                {/* folgas pontuais, portfólio e avaliações */}
                <details className="mt-4 rounded-lg border border-stone-800 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-amber-400 hover:text-amber-300">
                    Folgas, portfólio e avaliações
                  </summary>
                  <div className="mt-4 space-y-6">
                    {/* folgas e bloqueios */}
                    <section>
                      <h3 className="text-sm font-semibold text-stone-100">Folgas e bloqueios</h3>
                      <div className="mt-3 space-y-2">
                        {myTimeOffs.length === 0 ? (
                          <p className="text-xs text-stone-400">
                            Nenhuma folga pontual. Use o formulário para dias de folga ou bloqueios de horário (ex.: almoço).
                          </p>
                        ) : (
                          myTimeOffs.map((t) => (
                            <div
                              key={t.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-800/80 px-3 py-2"
                            >
                              <p className="text-xs text-stone-300">
                                {t.day.split('-').reverse().join('/')} · {t.start_time}–{t.end_time}
                                {t.reason ? ' · ' + t.reason : ''}
                              </p>
                              <form action={deleteTimeOffAction}>
                                <input type="hidden" name="id" value={t.id} />
                                <ActionButton
                                  className="btn btn-danger btn-sm"
                                  pendingLabel="Removendo..."
                                  confirmMessage="Remover este bloqueio?"
                                >
                                  Remover
                                </ActionButton>
                              </form>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-4">
                        <TimeOffForm barberId={barber.id} />
                      </div>
                    </section>

                    {/* portfólio */}
                    <section>
                      <h3 className="text-sm font-semibold text-stone-100">Portfólio</h3>
                      {myPhotos.length === 0 ? (
                        <p className="mt-3 text-xs text-stone-400">Nenhuma foto no portfólio ainda.</p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {myPhotos.map((p) => (
                            <figure key={p.id} className="w-20">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.url}
                                alt={p.caption ?? 'Foto do portfólio'}
                                className="h-20 w-20 rounded-lg border border-stone-800 object-cover"
                              />
                              {p.caption && (
                                <figcaption className="mt-1 text-center text-[10px] leading-tight text-stone-400">
                                  {p.caption}
                                </figcaption>
                              )}
                              <form action={deletePortfolioPhotoAction} className="mt-1">
                                <input type="hidden" name="id" value={p.id} />
                                <ActionButton
                                  className="btn btn-danger btn-sm w-full"
                                  pendingLabel="Removendo..."
                                  confirmMessage="Remover esta foto?"
                                >
                                  Remover
                                </ActionButton>
                              </form>
                            </figure>
                          ))}
                        </div>
                      )}
                      <div className="mt-4">
                        <PortfolioForm barberId={barber.id} />
                      </div>
                    </section>

                    {/* avaliações */}
                    <section>
                      <h3 className="text-sm font-semibold text-stone-100">Avaliações</h3>
                      {myReviews.length === 0 ? (
                        <p className="mt-3 text-xs text-stone-400">Ainda sem avaliações</p>
                      ) : (
                        <div className="mt-3">
                          <Stars rating={ratingSum / myReviews.length} count={myReviews.length} />
                          <ul className="mt-3 space-y-2">
                            {myReviews.slice(0, 5).map((r) => (
                              <li key={r.id} className="rounded-lg border border-stone-800/80 px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <Stars rating={r.rating} />
                                  <span className="text-[11px] text-stone-500">
                                    {dateKey(r.created_at).split('-').reverse().join('/')}
                                  </span>
                                </div>
                                {r.comment && (
                                  <p className="mt-1 text-xs italic text-stone-300">{r.comment}</p>
                                )}
                                <p className="mt-1 text-[11px] text-stone-400">
                                  — {r.client?.full_name?.split(' ')[0] ?? 'Cliente'}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  </div>
                </details>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
