import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Check, Clock, User, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration, initials } from '@/lib/utils'
import { nextDays, shortDateLabel, timeInSP } from '@/lib/tz'
import ConfirmForm from '@/components/booking/confirm-form'
import type { Barber, Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Agendar' }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function Steps({ current }: { current: number }) {
  const steps = ['Serviço', 'Barbeiro', 'Data', 'Horário']
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
                    : 'border-stone-700 text-stone-600')
              }
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={
                'hidden text-xs font-medium sm:block ' +
                (active ? 'text-amber-400' : done ? 'text-stone-400' : 'text-stone-600')
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
  const barbeiroId = typeof sp.barbeiro === 'string' ? sp.barbeiro : null
  const re = typeof sp.re === 'string' && sp.re.length > 10 ? sp.re : null
  const dataKey = typeof sp.data === 'string' && DATE_RE.test(sp.data) ? sp.data : null
  const isAny = barbeiroId === 'qualquer'
  const hora = typeof sp.hora === 'string' && TIME_RE.test(sp.hora) && dataKey && !isAny ? sp.hora : null

  const reSuffix = re ? '&re=' + re : ''
  const rescheduleBanner = re ? (
    <div className="ok-box mx-auto mt-6 max-w-2xl text-center">
      Você está reagendando um atendimento — escolha o novo horário e confirme.
    </div>
  ) : null

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()

  // ============================================================
  // PASSO 1 — serviço
  // ============================================================
  if (!servicoId) {
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('price_cents')
    const services = (servicesData ?? []) as Service[]

    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="section-title text-center">Agendar horário</h1>
        <p className="mt-2 text-center text-sm text-stone-500">
          Primeiro, escolha o serviço desejado.
        </p>
        {rescheduleBanner}
        <div className="mt-10">
          <Steps current={1} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.id}
                href={'/agendar?servico=' + service.id + reSuffix}
                className="card group flex flex-col p-5 transition-colors hover:border-amber-500/40"
              >
                <h2 className="font-semibold text-stone-100 group-hover:text-amber-400">
                  {service.name}
                </h2>
                {service.description && (
                  <p className="mt-1 flex-1 text-sm text-stone-500">{service.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
                    <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
                  </span>
                  <span className="font-bold text-amber-500">
                    {formatBRL(service.price_cents)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {services.length === 0 && (
            <p className="card p-10 text-center text-sm text-stone-500">
              Nenhum serviço cadastrado ainda.
            </p>
          )}
        </div>
      </main>
    )
  }

  const { data: serviceData } = await supabase
    .from('services')
    .select('*')
    .eq('id', servicoId)
    .eq('is_active', true)
    .maybeSingle()
  const service = (serviceData ?? null) as Service | null

  if (!service) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="card p-8 text-sm text-stone-400">
          Serviço não encontrado ou indisponível.{' '}
          <Link href={'/agendar' + (re ? '?re=' + re : '')} className="text-amber-400 hover:text-amber-300">
            Escolher outro serviço
          </Link>
        </p>
      </main>
    )
  }

  const base = '/agendar?servico=' + service.id + reSuffix
  const days = nextDays(21)

  // barbeiros aptos a este serviço (necessário nos passos 2 e "qualquer")
  let eligibleBarbers: Barber[] = []
  if (!barbeiroId || isAny) {
    const [{ data: barbersData }, { data: linksData }] = await Promise.all([
      supabase.from('barbers').select('*').eq('is_active', true).order('full_name'),
      supabase.from('barber_services').select('barber_id, service_id'),
    ])
    const barbers = (barbersData ?? []) as Barber[]
    const links = (linksData ?? []) as { barber_id: string; service_id: string }[]
    eligibleBarbers = barbers.filter((b) =>
      links.some((l) => l.barber_id === b.id && l.service_id === service.id)
    )
  }

  // ============================================================
  // PASSO 2 — barbeiro (ou "primeiro disponível")
  // ============================================================
  if (!barbeiroId) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Link href={'/agendar' + (re ? '?re=' + re : '')} className="btn btn-ghost btn-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Trocar serviço
        </Link>
        <h1 className="section-title text-center">Escolha o barbeiro</h1>
        <p className="mt-2 text-center text-sm text-stone-500">
          {service.name} · {formatBRL(service.price_cents)} · {formatDuration(service.duration_min)}
        </p>
        {rescheduleBanner}

        <div className="mt-10">
          <Steps current={2} />

          {/* primeiro disponível */}
          <Link
            href={'/agendar?servico=' + service.id + '&barbeiro=qualquer' + reSuffix}
            className="card group mb-4 flex items-center gap-4 border-dashed border-amber-500/40 p-5 transition-colors hover:border-amber-500/80"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 ring-2 ring-amber-500/40">
              <Zap className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-semibold text-amber-400">Primeiro barbeiro disponível</h2>
              <p className="mt-0.5 text-xs text-stone-500">
                Mostramos os horários de toda a equipe — o atendimento fica com quem tiver o encaixe.
              </p>
            </div>
          </Link>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eligibleBarbers.map((barber) => (
              <Link
                key={barber.id}
                href={base + '&barbeiro=' + barber.id}
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
                  {barber.bio && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{barber.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {eligibleBarbers.length === 0 && (
            <p className="card p-10 text-center text-sm text-stone-500">
              Nenhum barbeiro disponível para este serviço ainda.
            </p>
          )}
        </div>
      </main>
    )
  }

  // ============================================================
  // FLUXO "PRIMEIRO DISPONÍVEL" — junta os slots de toda a equipe
  // ============================================================
  if (isAny) {
    const withAny = '/agendar?servico=' + service.id + '&barbeiro=qualquer' + reSuffix

    interface MergedSlot {
      label: string
      iso: string
      barberId: string
      barberName: string
    }
    let merged: MergedSlot[] = []

    if (dataKey) {
      const perBarber = await Promise.all(
        eligibleBarbers.map(async (b) => {
          const { data } = await supabase.rpc('get_available_slots', {
            p_barber_id: b.id,
            p_date: dataKey,
            p_duration_min: service.duration_min,
          })
          return { id: b.id, name: b.full_name, slots: (data as unknown as string[]) ?? [] }
        })
      )
      const seen = new Set<string>()
      perBarber.forEach(({ id, name, slots }) => {
        slots.forEach((iso) => {
          const label = timeInSP(iso).slice(0, 5)
          if (!seen.has(label)) {
            seen.add(label)
            merged.push({ label, iso, barberId: id, barberName: name })
          }
        })
      })
      merged.sort((a, b) => a.iso.localeCompare(b.iso))
    }

    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <Link href={base} className="btn btn-ghost btn-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Trocar barbeiro
        </Link>
        <h1 className="section-title text-center">
          {dataKey ? 'Escolha o horário' : 'Escolha o dia'}
        </h1>
        <p className="mt-2 text-center text-sm text-stone-500">
          Primeiro disponível · {service.name} · {formatBRL(service.price_cents)}
        </p>
        {rescheduleBanner}

        <div className="mt-10">
          <Steps current={dataKey ? 4 : 3} />

          <div className="card grid grid-cols-4 gap-2 p-4 sm:grid-cols-7">
            {days.map((day) => {
              const selected = dataKey === day.key
              return (
                <Link
                  key={day.key}
                  href={withAny + '&data=' + day.key}
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
              {merged.length > 0 ? (
                <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
                  {merged.map((slot) => (
                    <Link
                      key={slot.iso}
                      href={
                        '/agendar?servico=' + service.id +
                        '&barbeiro=' + slot.barberId +
                        '&data=' + dataKey +
                        '&hora=' + slot.label +
                        reSuffix
                      }
                      className="btn btn-outline flex-col gap-0.5 py-2.5 font-mono hover:border-amber-500/60 hover:text-amber-400"
                    >
                      <span>{slot.label}</span>
                      <span className="text-[10px] font-sans text-stone-500">
                        com {slot.barberName.split(' ')[0]}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="card mx-auto max-w-md p-8 text-center text-sm text-stone-500">
                  Nenhum horário livre neste dia. Tente outro dia ou escolha um barbeiro específico.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ============================================================
  // Barbeiro específico — valida
  // ============================================================
  const { data: barberData } = await supabase
    .from('barbers')
    .select('*')
    .eq('id', barbeiroId)
    .eq('is_active', true)
    .maybeSingle()
  const barber = (barberData ?? null) as Barber | null

  if (!barber) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="card p-8 text-sm text-stone-400">
          Barbeiro não encontrado.{' '}
          <Link href={base} className="text-amber-400 hover:text-amber-300">
            Escolher outro barbeiro
          </Link>
        </p>
      </main>
    )
  }

  const withBarber = base + '&barbeiro=' + barber.id

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
        <Link href={base} className="btn btn-ghost btn-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> Trocar barbeiro
        </Link>
        <h1 className="section-title text-center">
          {dataKey ? 'Escolha o horário' : 'Escolha o dia'}
        </h1>
        <p className="mt-2 text-center text-sm text-stone-500">
          {service.name} com {barber.full_name} · {formatBRL(service.price_cents)}
        </p>
        {rescheduleBanner}

        <div className="mt-10">
          <Steps current={dataKey ? 4 : 3} />

          <div className="card grid grid-cols-4 gap-2 p-4 sm:grid-cols-7">
            {days.map((day) => {
              const href = withBarber + '&data=' + day.key
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
                        href={withBarber + '&data=' + dataKey + '&hora=' + label + reSuffix}
                        className="btn btn-outline py-2.5 font-mono hover:border-amber-500/60 hover:text-amber-400"
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="card mx-auto max-w-md p-8 text-center text-sm text-stone-500">
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
  const wizardPath = withBarber + '&data=' + dataKey + '&hora=' + hora + reSuffix
  const loginUrl = '/entrar?next=' + encodeURIComponent(wizardPath)

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <Link href={withBarber + '&data=' + dataKey + reSuffix} className="btn btn-ghost btn-sm mb-6">
        <ArrowLeft className="h-4 w-4" /> Escolher outro horário
      </Link>
      <h1 className="section-title text-center">Revise e confirme</h1>
      <p className="mt-2 text-center text-sm text-stone-500">
        Confira os detalhes antes de finalizar.
      </p>
      {rescheduleBanner}

      <div className="mt-10">
        <Steps current={4} />

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* resumo */}
          <div className="card space-y-4 p-6">
            <h2 className="font-serif text-lg font-bold uppercase tracking-tight text-stone-100">
              Resumo
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">Serviço</span>
                <span className="font-medium text-stone-200">{service.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">Duração</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-200">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {formatDuration(service.duration_min)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">Barbeiro</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-200">
                  <User className="h-3.5 w-3.5 text-amber-500" />
                  {barber.full_name}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">Data</span>
                <span className="font-medium text-stone-200">{shortDateLabel(dataKey)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-stone-500">Horário</span>
                <span className="font-mono font-medium text-stone-200">{hora}</span>
              </div>
              <div className="flex justify-between border-t border-stone-800 pt-3 text-base">
                <span className="text-stone-400">Total</span>
                <span className="font-bold text-amber-500">
                  {formatBRL(service.price_cents)}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-600">
              O pagamento é feito no local, no dia do atendimento.
            </p>
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
