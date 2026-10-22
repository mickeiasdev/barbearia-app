import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Check, Clock, MapPin, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration, initials } from '@/lib/utils'
import { nextDays, shortDateLabel, timeInSP } from '@/lib/tz'
import ConfirmForm from '@/components/booking/confirm-form'
import { requireKnownHost } from '@/lib/site'
import { labelsFor } from '@/lib/verticals'
import type { Barber, Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Agendar' }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function Steps({ current, firstLabel }: { current: number; firstLabel: string }) {
  const steps = [firstLabel, 'Serviço', 'Data', 'Horário']
  return (
    <ol className="mb-10 flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((label, i) => {
        const done = current > i + 1
        const active = current === i + 1
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4">
            <span
              className={
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ' +
                (done
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : active
                    ? 'border-amber-500 bg-amber-500 text-stone-950'
                    : 'border-stone-700 text-stone-400')
              }
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={
                'hidden text-xs font-medium sm:block ' +
                (active ? 'text-amber-400' : done ? 'text-stone-400' : 'text-stone-400')
              }
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-stone-800 sm:w-10" />}
          </li>
        )
      })}
    </ol>
  )
}

interface BarberWithPlace extends Barber {
  establishment?: {
    name: string
    address: string | null
    whatsapp: string | null
    require_prepayment: boolean | null
    pix_key: string | null
  } | null
}

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    servico?: string
    barbeiro?: string
    data?: string
    hora?: string
    re?: string
  }>
}) {
  const sp = await searchParams
  const servicoId = typeof sp.servico === 'string' ? sp.servico : null
  let barbeiroId = typeof sp.barbeiro === 'string' ? sp.barbeiro : null
  const re = typeof sp.re === 'string' && sp.re.length > 10 ? sp.re : null
  const dataKey = typeof sp.data === 'string' && DATE_RE.test(sp.data) ? sp.data : null

  // SUBDOMÍNIO DE UM PROFISSIONAL: o wizard fica travado no barbeiro
  // daquele site (o visitante não vê concorrentes).
  const host = await requireKnownHost()
  if (host.workspace) {
    const hostIds = new Set(host.workspace.barbers.map((b) => b.id))
    const fallback = host.workspace.barbers[0]?.id ?? null
    if (!hostIds.has(barbeiroId ?? '') && !re) {
      barbeiroId = fallback
    }
    if (!barbeiroId && host.workspace.barbers.length > 0 && !re) {
      barbeiroId = host.workspace.barbers[0].id
    }
  }

  const hora =
    typeof sp.hora === 'string' && TIME_RE.test(sp.hora) && dataKey && barbeiroId && servicoId
      ? sp.hora
      : null

  const reSuffix = re ? '&re=' + re : ''
  const rescheduleBanner = re ? (
    <div className="ok-box mx-auto mt-6 max-w-2xl text-center">
      Você está reagendando um atendimento — escolha o novo horário e confirme.
    </div>
  ) : null

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()

  // textos conforme o nicho do negócio (vertical)
  let verticalKey = 'barbearia'
  const anchorEst = host.workspace?.establishment ?? host.company ?? null
  if (anchorEst?.vertical) {
    verticalKey = anchorEst.vertical
  } else if (host.workspace?.establishment?.parent_id) {
    const { data: parent } = await supabase
      .from('establishments')
      .select('vertical')
      .eq('id', host.workspace.establishment.parent_id)
      .maybeSingle()
    if ((parent as { vertical?: string } | null)?.vertical) {
      verticalKey = (parent as { vertical: string }).vertical
    }
  }
  const vLabels = labelsFor(verticalKey)

  // ============================================================
  // PASSO 1 — escolher o profissional
  // ============================================================
  if (!barbeiroId) {
    let barbersQuery = supabase
      .from('barbers')
      .select('*, establishment:establishments(name, address)')
      .eq('is_active', true)
      .order('full_name')

    // no site de uma EMPRESA, o passo 1 mostra só os profissionais dela
    if (host.company) {
      const { data: children } = await supabase
        .from('establishments')
        .select('id')
        .eq('parent_id', host.company.id)
      const ids = ((children ?? []) as { id: string }[]).map((c) => c.id)
      barbersQuery = barbersQuery.in(
        'establishment_id',
        ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']
      )
    }

    const { data: barbersData } = await barbersQuery
    let professionals = (barbersData ?? []) as unknown as BarberWithPlace[]

    // deep-link /agendar?servico=X: mostra quem executa o serviço
    let preService: Service | null = null
    if (servicoId) {
      const { data: svc } = await supabase
        .from('services')
        .select('*')
        .eq('id', servicoId)
        .eq('is_active', true)
        .maybeSingle()
      preService = (svc ?? null) as Service | null
      if (preService) {
        const { data: links } = await supabase
          .from('barber_services')
          .select('barber_id')
          .eq('service_id', preService.id)
        const ids = new Set((links ?? []).map((l) => (l as { barber_id: string }).barber_id))
        professionals = professionals.filter((b) => ids.has(b.id))
      }
    }

    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="section-title text-center">Agendar horário</h1>
        <p className="mt-2 text-center text-sm text-stone-400">
          {preService
            ? 'Profissionais que executam ' + preService.name + ':'
            : 'Primeiro, escolha o profissional que vai atender você.'}
        </p>
        {rescheduleBanner}
        <div className="mt-10">
          <Steps firstLabel={vLabels.professionals.charAt(0).toUpperCase() + vLabels.professionals.slice(1)} current={1} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {professionals.map((barber) => (
              <Link
                key={barber.id}
                href={
                  '/agendar?barbeiro=' + barber.id +
                  (preService ? '&servico=' + preService.id : '') +
                  reSuffix
                }
                className="card group flex items-center gap-4 p-5 transition-colors hover:border-amber-500/40"
              >
                {barber.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={barber.photo_url}
                    alt={barber.full_name}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-amber-500/30"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-base font-bold text-amber-500 ring-2 ring-amber-500/30">
                    {initials(barber.full_name)}
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-stone-100 group-hover:text-amber-400">
                    {barber.full_name}
                  </h2>
                  {barber.establishment?.name && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                      <MapPin className="h-3 w-3 text-amber-500/80" />
                      {barber.establishment.name}
                    </p>
                  )}
                  {barber.bio && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-400">{barber.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {professionals.length === 0 && (
            <p className="card p-10 text-center text-sm text-stone-400">
              {preService
                ? 'Nenhum profissional disponível para este serviço ainda.'
                : 'Nenhum profissional disponível ainda. Volte em breve!'}
            </p>
          )}
        </div>
      </main>
    )
  }

  // ============================================================
  // valida barbeiro
  // ============================================================
  const { data: barberData } = await supabase
    .from('barbers')
    .select('*, establishment:establishments(name, address, whatsapp, require_prepayment, pix_key)')
    .eq('id', barbeiroId)
    .eq('is_active', true)
    .maybeSingle()
  const barber = (barberData ?? null) as unknown as BarberWithPlace | null

  if (!barber) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="card p-8 text-sm text-stone-400">
          Profissional não encontrado.{' '}
          <Link href={'/agendar' + (re ? '?re=' + re : '')} className="text-amber-400 hover:text-amber-300">
            Ver todos os profissionais
          </Link>
        </p>
      </main>
    )
  }

  const withBarber = '/agendar?barbeiro=' + barber.id + reSuffix

  // serviços que este profissional executa
  const { data: linksData } = await supabase
    .from('barber_services')
    .select('service:services(*)')
    .eq('barber_id', barber.id)
  const myServices = ((linksData ?? []) as unknown as { service: Service | null }[])
    .map((l) => l.service)
    .filter((s): s is Service => !!s?.is_active)

  // ============================================================
  // PASSO 2 — escolher o serviço
  // ============================================================
  if (!servicoId) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Link href={'/agendar' + (re ? '?re=' + re : '')} className="btn btn-ghost btn-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Trocar profissional
        </Link>
        <h1 className="section-title text-center">Escolha o serviço</h1>
        <p className="mt-2 text-center text-sm text-stone-400">
          Atendimento com {barber.full_name}
          {barber.establishment?.name ? ' · ' + barber.establishment.name : ''}
        </p>
        {rescheduleBanner}

        <div className="mt-10">
          <Steps firstLabel={vLabels.professionals.charAt(0).toUpperCase() + vLabels.professionals.slice(1)} current={2} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myServices.map((service) => (
              <Link
                key={service.id}
                href={withBarber + '&servico=' + service.id}
                className="card group flex flex-col p-5 transition-colors hover:border-amber-500/40"
              >
                <h2 className="font-semibold text-stone-100 group-hover:text-amber-400">
                  {service.name}
                </h2>
                {service.description && (
                  <p className="mt-1 flex-1 text-sm text-stone-400">{service.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
                    <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
                  </span>
                  <span className="font-bold text-amber-500">
                    {formatBRL(service.price_cents)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {myServices.length === 0 && (
            <p className="card p-10 text-center text-sm text-stone-400">
              Este profissional ainda não configurou serviços para agendamento.
            </p>
          )}
        </div>
      </main>
    )
  }

  const service = myServices.find((s) => s.id === servicoId) ?? null

  if (!service) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="card p-8 text-sm text-stone-400">
          Serviço não disponível com este profissional.{' '}
          <Link href={withBarber} className="text-amber-400 hover:text-amber-300">
            Escolher outro serviço
          </Link>
        </p>
      </main>
    )
  }

  const withSvc = withBarber + '&servico=' + service.id
  const days = nextDays(21)

  // ============================================================
  // PASSOS 3 e 4 — data e horário
  // ============================================================
  if (!dataKey || !hora) {
    let slots: string[] = []
    if (dataKey) {
      const { data: slotsData } = await supabase.rpc('get_available_slots', {
        p_barber_id: barber.id,
        p_date: dataKey,
        p_duration_min: service.duration_min,
      })
      slots = (slotsData as unknown as string[]) ?? []
    }

    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Link href={withBarber} className="btn btn-ghost btn-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Trocar serviço
        </Link>
        <h1 className="section-title text-center">
          {dataKey ? 'Escolha o horário' : 'Escolha o dia'}
        </h1>
        <p className="mt-2 text-center text-sm text-stone-400">
          {service.name} com {barber.full_name} · {formatBRL(service.price_cents)}
        </p>
        {rescheduleBanner}

        <div className="mt-10">
          <Steps firstLabel={vLabels.professionals.charAt(0).toUpperCase() + vLabels.professionals.slice(1)} current={dataKey ? 4 : 3} />

          <div className="card grid grid-cols-4 gap-2 p-4 sm:grid-cols-7">
            {days.map((day) => {
              const href = withSvc + '&data=' + day.key
              const selected = dataKey === day.key
              return (
                <Link
                  key={day.key}
                  href={href}
                  className={
                    'flex flex-col items-center rounded-xl border px-2 py-3 transition-colors ' +
                    (selected
                      ? 'border-amber-500 bg-amber-500 text-stone-950'
                      : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:border-amber-500/40 hover:text-amber-400')
                  }
                >
                  <span className="text-[11px] font-medium uppercase">
                    {day.isToday ? 'Hoje' : day.weekday}
                  </span>
                  <span className="text-lg font-bold">{day.day}</span>
                  <span className="text-[10px]">{day.month}</span>
                </Link>
              )
            })}
          </div>

          {dataKey && (
            <div className="mt-8">
              <h2 className="mb-4 text-center text-sm text-stone-400">
                Horários livres em {shortDateLabel(dataKey)} (horário de Brasília)
              </h2>
              {slots.length > 0 ? (
                <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((slot) => {
                    const label = timeInSP(slot).slice(0, 5)
                    return (
                      <Link
                        key={slot}
                        href={withSvc + '&data=' + dataKey + '&hora=' + label + reSuffix}
                        className="btn btn-outline py-2.5 font-mono hover:border-amber-500/60 hover:text-amber-400"
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="card mx-auto max-w-md p-8 text-center text-sm text-stone-400">
                  Nenhum horário livre neste dia — {barber.full_name.split(' ')[0]} pode estar
                  folgando ou lotado. Tente outro dia.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ============================================================
  // PASSO 5 — revisão e confirmação
  // ============================================================
  const wizardPath = withSvc + '&data=' + dataKey + '&hora=' + hora + reSuffix
  const loginUrl = '/entrar?next=' + encodeURIComponent(wizardPath)

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <Link href={withSvc + '&data=' + dataKey + reSuffix} className="btn btn-ghost btn-sm mb-6">
        <ArrowLeft className="h-4 w-4" /> Escolher outro horário
      </Link>
      <h1 className="section-title text-center">Revise e confirme</h1>
      <p className="mt-2 text-center text-sm text-stone-400">
        Confira os detalhes antes de finalizar.
      </p>
      {rescheduleBanner}

      <div className="mt-10">
        <Steps firstLabel={vLabels.professionals.charAt(0).toUpperCase() + vLabels.professionals.slice(1)} current={4} />

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* resumo */}
          <div className="card space-y-4 p-6">
            <h2 className="font-serif text-lg font-bold uppercase tracking-tight text-stone-100">
              Resumo
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-stone-400">Serviço</span>
                <span className="font-medium text-stone-200">{service.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-400">Duração</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-200">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {formatDuration(service.duration_min)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-400">Profissional</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-200">
                  <User className="h-3.5 w-3.5 text-amber-500" />
                  {barber.full_name}
                </span>
              </div>
              {barber.establishment?.name && (
                <div className="flex justify-between gap-4">
                  <span className="text-stone-400">Espaço</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-stone-200">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    {barber.establishment.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-stone-400">Data</span>
                <span className="font-medium text-stone-200">{shortDateLabel(dataKey)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-400">Horário</span>
                <span className="font-mono font-medium text-stone-200">{hora}</span>
              </div>
              <div className="flex justify-between border-t border-stone-800 pt-3 text-base">
                <span className="text-stone-400">Total</span>
                <span className="font-bold text-amber-500">
                  {formatBRL(service.price_cents)}
                </span>
              </div>
            </div>
            {barber.establishment?.require_prepayment && barber.establishment?.pix_key ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                Este profissional solicita pagamento antecipado: após confirmar, o QR Code
                Pix aparece em Minha Conta. Envie o comprovante pelo WhatsApp para travar
                o horário.
              </p>
            ) : (
              <p className="text-xs text-stone-400">
                O pagamento é feito no local, no dia do atendimento — ou por Pix, se o
                profissional tiver chave configurada.
              </p>
            )}
          </div>

          {/* confirmação */}
          <ConfirmForm
            servico={service.id}
            barbeiro={barber.id}
            data={dataKey}
            hora={hora}
            isLoggedIn={!!auth.user}
            loginUrl={loginUrl}
            re={re}
          />
        </div>
      </div>
    </main>
  )
}
