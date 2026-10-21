import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Heart,
  KeyRound,
  Package,
  Receipt,
  Repeat,
  Star,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/data'
import PixCard from '@/components/pix-card'
import Stars from '@/components/stars'
import ReviewForm from '@/components/review-form'
import { buildPixPayload } from '@/lib/pix'
import { qrFromPayload } from '@/lib/qr'
import { formatBRL, formatDuration, PAYMENT_LABEL } from '@/lib/utils'
import { dateKey, shortDateLabel, timeInSP, WEEKDAY_LABELS } from '@/lib/tz'
import { waLink } from '@/lib/whatsapp'
import StatusBadge from '@/components/status-badge'
import CancelAppointmentButton from '@/components/cancel-appointment-button'
import ChangePasswordForm from '@/components/change-password-form'
import ProfileForm from '@/components/profile-form'
import type { AppointmentDetails, OrderWithItems } from '@/lib/types'

export const metadata: Metadata = { title: 'Minha conta' }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HISTORY_PAGE_SIZE = 10

type PlaceInfo = {
  name: string
  pix_key: string | null
  whatsapp: string | null
  require_prepayment?: boolean | null
} | null | undefined
type ApptRow = AppointmentDetails & {
  barber?: { full_name: string; establishment?: PlaceInfo } | null
}
type OrderRow = OrderWithItems & { establishment?: { name: string; pix_key: string | null } }

function toMondayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = (date.getUTCDay() + 6) % 7 // 0 = segunda
  date.setUTCDate(date.getUTCDate() - dow)
  return date.toISOString().slice(0, 10)
}

function shiftDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export default async function MinhaContaPage({
  searchParams,
}: {
  searchParams: Promise<{
    agendado?: string
    reagendado?: string
    sembarbeiro?: string
    hist?: string
    pro?: string
    sem?: string
  }>
}) {
  const sp = await searchParams
  const user = await getCurrentUser()

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="card p-8 text-sm text-stone-400">
          Você precisa entrar para acessar sua conta.
        </p>
      </main>
    )
  }

  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const histPage = Math.max(0, parseInt(sp.hist ?? '0', 10) || 0)
  const proFilter = sp.pro && DATE_RE.test('2000-01-01') === false && sp.pro.length > 10 ? sp.pro : null
  const semKey =
    sp.sem && DATE_RE.test(sp.sem) ? toMondayKey(sp.sem) : toMondayKey(dateKey(new Date()))
  const weekDays = Array.from({ length: 7 }, (_, i) => shiftDays(semKey, i))

  // ===== histórico (paginado + filtro por profissional) =====
  let historyQuery = supabase
    .from('appointments')
    .select(
      '*, barber:barbers(full_name, establishment:establishments(name, pix_key, whatsapp)), service:services(name, duration_min)',
      { count: 'exact' }
    )
    .eq('client_id', user.id)
    .or('starts_at.lt.' + nowIso + ',status.eq.cancelled,status.eq.no_show')
    .order('starts_at', { ascending: false })
  if (proFilter) historyQuery = historyQuery.eq('barber_id', proFilter)
  const historyRes = await historyQuery.range(histPage * HISTORY_PAGE_SIZE, (histPage + 1) * HISTORY_PAGE_SIZE - 1)

  const [{ data: upcomingData }, { data: ordersData }, { data: favData }, { data: myReviewsData }, { data: lastDoneData }, { data: apptBarbers }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('*, barber:barbers(full_name, establishment:establishments(name, pix_key, whatsapp, require_prepayment)), service:services(name, duration_min)')
        .eq('client_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gte('starts_at', nowIso)
        .order('starts_at'),
      supabase
        .from('orders')
        .select('*, establishment:establishments(name, pix_key), order_items(product_name, quantity, unit_price_cents)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('favorites')
        .select('barber_id, barber:barbers(full_name, establishment:establishments(name, slug))')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reviews')
        .select('appointment_id, rating')
        .eq('client_id', user.id),
      supabase
        .from('appointments')
        .select('id, barber_id, service_id, barber:barbers(full_name), service:services(name)')
        .eq('client_id', user.id)
        .eq('status', 'completed')
        .order('starts_at', { ascending: false })
        .limit(1),
      supabase
        .from('appointments')
        .select('barber:barbers(id, full_name)')
        .eq('client_id', user.id)
        .order('starts_at', { ascending: false })
        .limit(100),
    ])

  const upcoming = (upcomingData ?? []) as unknown as ApptRow[]
  const orders = (ordersData ?? []) as unknown as OrderRow[]
  const favorites = (favData ?? []) as unknown as {
    barber_id: string
    barber: { full_name: string; establishment: { name: string; slug: string | null } | null } | null
  }[]
  const reviewedApptIds = new Set(
    ((myReviewsData ?? []) as { appointment_id: string; rating: number }[]).map((r) => r.appointment_id)
  )
  const myRatingsByAppt = new Map(
    ((myReviewsData ?? []) as { appointment_id: string; rating: number }[]).map((r) => [r.appointment_id, r.rating])
  )
  const lastDone = (lastDoneData ?? []) as unknown as {
    id: string
    barber_id: string
    service_id: string
    barber: { full_name: string } | null
    service: { name: string } | null
  }[]

  // profissionais distintos (para o filtro do histórico)
  const proOptions = new Map<string, string>()
  for (const row of (apptBarbers ?? []) as unknown as { barber: { id: string; full_name: string } | null }[]) {
    if (row.barber) proOptions.set(row.barber.id, row.barber.full_name)
  }

  const history = (historyRes.data ?? []) as unknown as ApptRow[]
  const historyTotal = historyRes.count ?? 0
  const historyPages = Math.ceil(historyTotal / HISTORY_PAGE_SIZE)

  // ===== Pix por espaço do profissional =====
  const pixByAppt = new Map<string, { payload: string; qrDataUrl: string | null }>()
  const pixByOrder = new Map<string, { payload: string; qrDataUrl: string | null }>()

  const pixFor = async (
    place: { name: string; pix_key: string | null } | null | undefined,
    amountCents: number,
    txid: string
  ) => {
    if (!place?.pix_key) return null
    const payload = buildPixPayload({
      key: place.pix_key,
      amountCents,
      merchantName: place.name,
      txid,
    })
    if (!payload) return null
    return { payload, qrDataUrl: await qrFromPayload(payload) }
  }

  await Promise.all([
    ...upcoming.map(async (a) => {
      const p = await pixFor(a.barber?.establishment, a.price_cents, 'AG' + a.id.replace(/-/g, '').slice(0, 14))
      if (p) pixByAppt.set(a.id, p)
    }),
    ...orders.map(async (o) => {
      const p = await pixFor(o.establishment, o.total_cents, 'PED' + o.id.replace(/-/g, '').slice(0, 14))
      if (p) pixByOrder.set(o.id, p)
    }),
  ])

  // agrupa a semana atual
  const byDay = new Map<string, ApptRow[]>()
  for (const appt of upcoming) {
    const key = dateKey(appt.starts_at)
    byDay.set(key, [...(byDay.get(key) ?? []), appt])
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Minha conta</h1>
          <p className="mt-2 text-sm text-stone-400">
            Olá, {user.profile?.full_name?.split(' ')[0] || 'cliente'}! Gerencie seus
            agendamentos, pedidos e favoritos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lastDone[0]?.barber_id && lastDone[0]?.service_id && (
            <Link
              href={'/agendar?barbeiro=' + lastDone[0].barber_id + '&servico=' + lastDone[0].service_id}
              className="btn btn-outline"
              title={'Repetir ' + (lastDone[0].service?.name ?? 'último corte')}
            >
              <Repeat className="h-4 w-4" />
              Repetir último corte
            </Link>
          )}
          <Link href="/agendar" className="btn btn-primary">
            <Calendar className="h-4 w-4" /> Novo agendamento
          </Link>
        </div>
      </div>

      {sp.agendado && (
        <div className="ok-box mt-6" role="status">
          Agendamento criado com sucesso! Aguarde a confirmação do profissional.
        </div>
      )}
      {sp.reagendado && (
        <div className="ok-box mt-6" role="status">
          Atendimento reagendado com sucesso! Veja os novos dados abaixo.
        </div>
      )}
      {sp.sembarbeiro && (
        <div className="error-box mt-6" role="alert">
          Sua conta é de barbeiro, mas ainda não está vinculada a nenhum profissional.
          Fale com o administrador para ativar seu acesso ao portal.
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ===== coluna principal ===== */}
        <div className="space-y-10">
          {/* ===== AGENDA DA SEMANA ===== */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-100">
                <Calendar className="h-5 w-5 text-amber-500" /> Minha semana
              </h2>
              <div className="flex items-center gap-1">
                <Link
                  href={'/minha-conta?sem=' + shiftDays(semKey, -7)}
                  aria-label="Semana anterior"
                  className="btn btn-outline btn-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <span className="px-1 text-xs text-stone-400">
                  {shortDateLabel(semKey)} – {shortDateLabel(shiftDays(semKey, 6))}
                </span>
                <Link
                  href={'/minha-conta?sem=' + shiftDays(semKey, 7)}
                  aria-label="Próxima semana"
                  className="btn btn-outline btn-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-7">
              {weekDays.map((day) => {
                const isToday = day === dateKey(new Date())
                const appts = byDay.get(day) ?? []
                const [y, m, d] = day.split('-').map(Number)
                return (
                  <div
                    key={day}
                    className={
                      'min-h-24 rounded-xl border p-2 ' +
                      (isToday ? 'border-amber-500/50 bg-amber-500/5' : 'border-stone-800')
                    }
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
                      {WEEKDAY_LABELS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay())]}
                    </p>
                    <p className="text-lg font-bold text-stone-200">{d}</p>
                    <div className="mt-1 space-y-1">
                      {appts.map((appt) => (
                        <div
                          key={appt.id}
                          className="truncate rounded-md bg-stone-800/80 px-1.5 py-1 text-[11px] text-stone-300"
                          title={appt.service?.name + ' — ' + appt.barber?.full_name}
                        >
                          <span className="font-mono text-amber-400">
                            {timeInSP(appt.starts_at)}
                          </span>{' '}
                          {appt.service?.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ===== PRÓXIMOS AGENDAMENTOS ===== */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <CalendarClock className="h-5 w-5 text-amber-500" /> Próximos agendamentos
            </h2>

            {upcoming.length === 0 && (
              <p className="card p-6 text-sm text-stone-400">
                Nenhum agendamento futuro.{' '}
                <Link href="/agendar" className="text-amber-400 hover:text-amber-300">
                  Agendar agora
                </Link>
              </p>
            )}

            <div className="space-y-3">
              {upcoming.map((appt) => {
                const waReceipt = appt.barber?.establishment?.whatsapp
                  ? waLink(
                      appt.barber.establishment.whatsapp,
                      'Olá! Segue o comprovante do Pix do meu agendamento (' +
                        appt.service?.name +
                        ' em ' +
                        shortDateLabel(dateKey(appt.starts_at)) +
                        ').'
                    )
                  : null
                return (
                  <div key={appt.id} className="space-y-3">
                    <div className="card grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-stone-100">
                            {appt.service?.name ?? 'Serviço'}
                          </p>
                          <StatusBadge status={appt.status} />
                        </div>
                        <p className="mt-1 text-sm text-stone-400">
                          {shortDateLabel(dateKey(appt.starts_at))} às{' '}
                          <span className="font-mono">{timeInSP(appt.starts_at)}</span> ·{' '}
                          {appt.barber?.full_name}
                          {appt.barber?.establishment?.name
                            ? ' · ' + appt.barber.establishment.name
                            : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {formatDuration(appt.service?.duration_min ?? 30)} ·{' '}
                          {formatBRL(appt.price_cents)}
                        </p>
                        {appt.notes && (
                          <p className="mt-1 text-xs italic text-stone-400">"{appt.notes}"</p>
                        )}
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-44">
                        <Link
                          href={
                            '/agendar?re=' + appt.id +
                            '&servico=' + appt.service_id +
                            '&barbeiro=' + appt.barber_id
                          }
                          className="btn btn-outline btn-sm w-full"
                        >
                          <CalendarClock className="h-3.5 w-3.5" /> Reagendar
                        </Link>
                        {waReceipt && (
                          <a href={waReceipt} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm w-full">
                            Enviar comprovante
                          </a>
                        )}
                        <CancelAppointmentButton id={appt.id} />
                      </div>
                    </div>
                    {pixByAppt.get(appt.id) && (
                      <PixCard
                        payload={pixByAppt.get(appt.id)!.payload}
                        qrDataUrl={pixByAppt.get(appt.id)!.qrDataUrl}
                        amountCents={appt.price_cents}
                        defaultOpen={appt.barber?.establishment?.require_prepayment ?? false}
                        note="Após pagar, mostre o comprovante ao barbeiro no dia do atendimento."
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ===== HISTÓRICO (paginado + filtro) ===== */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-100">
                <Receipt className="h-5 w-5 text-amber-500" /> Histórico de atendimentos
              </h2>
              <form action="/minha-conta" className="flex items-center gap-2">
                <input type="hidden" name="hist" value="0" />
                <select
                  name="pro"
                  defaultValue={proFilter ?? ''}
                  aria-label="Filtrar por profissional"
                  className="input max-w-44 py-1.5 text-xs"
                >
                  <option value="">Todos os profissionais</option>
                  {[...proOptions.entries()].map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-outline btn-sm">Filtrar</button>
              </form>
            </div>

            {history.length === 0 ? (
              <p className="card p-6 text-sm text-stone-400">Nenhum atendimento anterior.</p>
            ) : (
              <div className="card divide-y divide-stone-800/70">
                {history.map((appt) => {
                  const reviewed = reviewedApptIds.has(appt.id)
                  return (
                    <div key={appt.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-stone-200">
                            {appt.service?.name ?? 'Serviço'} · {appt.barber?.full_name}
                          </p>
                          <p className="text-xs text-stone-400">
                            {dateKey(appt.starts_at).split('-').reverse().join('/')} às{' '}
                            {timeInSP(appt.starts_at)} · {formatBRL(appt.price_cents)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {reviewed && (
                            <Stars rating={myRatingsByAppt.get(appt.id) ?? 5} />
                          )}
                          <StatusBadge status={appt.status} />
                        </div>
                      </div>
                      {appt.status === 'completed' && !reviewed && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-amber-400 hover:text-amber-300">
                            <Star className="mr-1 inline h-3.5 w-3.5" />
                            Avaliar este atendimento
                          </summary>
                          <div className="mt-3 max-w-md">
                            <ReviewForm appointmentId={appt.id} />
                          </div>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {historyPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                {histPage > 0 ? (
                  <Link
                    href={'/minha-conta?hist=' + (histPage - 1) + (proFilter ? '&pro=' + proFilter : '')}
                    className="btn btn-outline btn-sm"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anteriores
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs text-stone-400">
                  Página {histPage + 1} de {historyPages}
                </span>
                {histPage < historyPages - 1 ? (
                  <Link
                    href={'/minha-conta?hist=' + (histPage + 1) + (proFilter ? '&pro=' + proFilter : '')}
                    className="btn btn-outline btn-sm"
                  >
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}
          </section>

          {/* ===== PEDIDOS ===== */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <Package className="h-5 w-5 text-amber-500" /> Meus pedidos
            </h2>

            {orders.length === 0 ? (
              <p className="card p-6 text-sm text-stone-400">
                Nenhum pedido ainda.{' '}
                <Link href="/loja" className="text-amber-400 hover:text-amber-300">
                  Visitar a loja
                </Link>
              </p>
            ) : (
              <div className="card divide-y divide-stone-800/70">
                {orders.map((order) => (
                  <div key={order.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-stone-300">
                        <span className="font-mono text-amber-400">
                          #{order.id.slice(0, 8)}
                        </span>{' '}
                        · {dateKey(order.created_at).split('-').reverse().join('/')} ·{' '}
                        {PAYMENT_LABEL[order.payment_method]}
                        {order.establishment?.name ? ' · ' + order.establishment.name : ''}
                      </p>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={order.status} />
                        <span className="text-sm font-bold text-stone-100">
                          {formatBRL(order.total_cents)}
                        </span>
                      </div>
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {(order.order_items ?? []).map((item, idx) => (
                        <li key={idx} className="text-xs text-stone-400">
                          {item.quantity}× {item.product_name} —{' '}
                          {formatBRL(item.unit_price_cents * item.quantity)}
                        </li>
                      ))}
                    </ul>
                    {pixByOrder.get(order.id) && (
                      <div className="mt-3">
                        <PixCard
                          payload={pixByOrder.get(order.id)!.payload}
                          qrDataUrl={pixByOrder.get(order.id)!.qrDataUrl}
                          amountCents={order.total_cents}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===== coluna perfil ===== */}
        <aside className="h-fit space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <User className="h-5 w-5 text-amber-500" /> Meus dados
            </h2>
            <ProfileForm
              fullName={user.profile?.full_name ?? ''}
              phone={user.profile?.phone ?? ''}
            />
            {user.profile?.email && (
              <p className="mt-4 text-xs text-stone-400">{user.profile.email}</p>
            )}
          </div>

          {/* ===== FAVORITOS ===== */}
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <Heart className="h-5 w-5 text-amber-500" /> Favoritos
            </h2>
            {favorites.length === 0 ? (
              <p className="text-sm text-stone-400">
                Toque no coração dos profissionais para salvá-los aqui.
              </p>
            ) : (
              <ul className="space-y-2">
                {favorites.map((fav) =>
                  fav.barber ? (
                    <li key={fav.barber_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <Link
                          href={fav.barber.establishment?.slug ? '/p/' + fav.barber.establishment.slug : '/barbeiros'}
                          className="truncate font-medium text-stone-200 hover:text-amber-400"
                        >
                          {fav.barber.full_name}
                        </Link>
                        {fav.barber.establishment?.name && (
                          <span className="block truncate text-xs text-stone-400">
                            {fav.barber.establishment.name}
                          </span>
                        )}
                      </span>
                      <Link
                        href={'/agendar?barbeiro=' + fav.barber_id}
                        className="btn btn-primary btn-sm shrink-0"
                      >
                        Agendar
                      </Link>
                    </li>
                  ) : null
                )}
              </ul>
            )}
          </div>

          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <KeyRound className="h-5 w-5 text-amber-500" /> Alterar senha
            </h2>
            <ChangePasswordForm />
          </div>

          <div className="card p-6 text-sm text-stone-400">
            <p className="font-medium text-stone-300">Como funciona o pagamento?</p>
            <p className="mt-2">
              Serviços e produtos são pagos no local (Pix, dinheiro ou cartão). O
              agendamento apenas reserva seu horário — e, se o profissional tiver
              chave Pix, você já pode pagar adiantado por aqui.
            </p>
          </div>

        </aside>
      </div>
    </main>
  )
}
