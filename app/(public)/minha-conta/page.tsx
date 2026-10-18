import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, CalendarClock, KeyRound, Package, Receipt, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getEstablishment } from '@/lib/data'
import PixCard from '@/components/pix-card'
import { buildPixPayload } from '@/lib/pix'
import { qrFromPayload } from '@/lib/qr'
import { formatBRL, formatDuration, PAYMENT_LABEL } from '@/lib/utils'
import { dateKey, shortDateLabel, timeInSP } from '@/lib/tz'
import StatusBadge from '@/components/status-badge'
import CancelAppointmentButton from '@/components/cancel-appointment-button'
import ChangePasswordForm from '@/components/change-password-form'
import ProfileForm from '@/components/profile-form'
import type { AppointmentDetails, OrderWithItems } from '@/lib/types'

export const metadata: Metadata = { title: 'Minha conta' }

export default async function MinhaContaPage({
  searchParams,
}: {
  searchParams: Promise<{
    agendado?: string
    reagendado?: string
    sembarbeiro?: string
  }>
}) {
  const sp = await searchParams
  const user = await getCurrentUser()
  const establishment = await getEstablishment()

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

  const [{ data: upcomingData }, { data: historyData }, { data: ordersData }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('*, barber:barbers(full_name), service:services(name, duration_min)')
        .eq('client_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gte('starts_at', nowIso)
        .order('starts_at'),
      supabase
        .from('appointments')
        .select('*, barber:barbers(full_name), service:services(name, duration_min)')
        .eq('client_id', user.id)
        .or('starts_at.lt.' + nowIso + ',status.eq.cancelled')
        .order('starts_at', { ascending: false })
        .limit(20),
      supabase
        .from('orders')
        .select('*, order_items(product_name, quantity, unit_price_cents)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

  const upcoming = (upcomingData ?? []) as unknown as AppointmentDetails[]
  const history = (historyData ?? []) as unknown as AppointmentDetails[]
  const orders = (ordersData ?? []) as unknown as OrderWithItems[]

  // QR Pix de agendamentos e pedidos — gerado no SERVIDOR (não depende do navegador)
  const pixByAppt = new Map<string, { payload: string; qrDataUrl: string | null }>()
  const pixByOrder = new Map<string, { payload: string; qrDataUrl: string | null }>()
  if (establishment?.pix_key) {
    const pixFor = async (amountCents: number, txid: string) => {
      const payload = buildPixPayload({
        key: establishment!.pix_key!,
        amountCents,
        merchantName: establishment!.name,
        txid,
      })
      if (!payload) return null
      return { payload, qrDataUrl: await qrFromPayload(payload) }
    }

    await Promise.all([
      ...upcoming.map(async (a) => {
        const p = await pixFor(a.price_cents, 'AG' + a.id.replace(/-/g, '').slice(0, 14))
        if (p) pixByAppt.set(a.id, p)
      }),
      ...orders.map(async (o) => {
        const p = await pixFor(o.total_cents, 'PED' + o.id.replace(/-/g, '').slice(0, 14))
        if (p) pixByOrder.set(o.id, p)
      }),
    ])
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Minha conta</h1>
          <p className="mt-2 text-sm text-stone-500">
            Olá, {user.profile?.full_name?.split(' ')[0] || 'cliente'}! Gerencie seus
            agendamentos e pedidos.
          </p>
        </div>
        <Link href="/agendar" className="btn btn-primary">
          <Calendar className="h-4 w-4" /> Novo agendamento
        </Link>
      </div>

      {sp.agendado && (
        <div className="ok-box mt-6">
          Agendamento criado com sucesso! Aguarde a confirmação da barbearia.
        </div>
      )}
      {sp.reagendado && (
        <div className="ok-box mt-6">
          Atendimento reagendado com sucesso! Veja os novos dados abaixo.
        </div>
      )}
      {sp.sembarbeiro && (
        <div className="error-box mt-6">
          Sua conta é de barbeiro, mas ainda não está vinculada a nenhum profissional da
          barbearia. Fale com o administrador para ativar seu acesso ao portal.
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ===== coluna principal ===== */}
        <div className="space-y-10">
          {/* próximos */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <Calendar className="h-5 w-5 text-amber-500" /> Próximos agendamentos
            </h2>

            {upcoming.length === 0 && (
              <p className="card p-6 text-sm text-stone-500">
                Nenhum agendamento futuro.{' '}
                <Link href="/agendar" className="text-amber-400 hover:text-amber-300">
                  Agendar agora
                </Link>
              </p>
            )}

            <div className="space-y-3">
              {upcoming.map((appt) => (
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
                    </p>
                    <p className="mt-0.5 text-xs text-stone-600">
                      {formatDuration(appt.service?.duration_min ?? 30)} ·{' '}
                      {formatBRL(appt.price_cents)}
                    </p>
                    {appt.notes && (
                      <p className="mt-1 text-xs italic text-stone-500">“{appt.notes}”</p>
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
                    <CancelAppointmentButton id={appt.id} />
                  </div>
                </div>
                {pixByAppt.get(appt.id) && (
                  <PixCard
                    payload={pixByAppt.get(appt.id)!.payload}
                    qrDataUrl={pixByAppt.get(appt.id)!.qrDataUrl}
                    amountCents={appt.price_cents}
                    note="Após pagar, mostre o comprovante ao barbeiro no dia do atendimento."
                  />
                )}
              </div>
              ))}
            </div>
          </section>

          {/* histórico */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <Receipt className="h-5 w-5 text-amber-500" /> Histórico de atendimentos
            </h2>

            {history.length === 0 ? (
              <p className="card p-6 text-sm text-stone-500">Nenhum atendimento anterior.</p>
            ) : (
              <div className="card divide-y divide-stone-800/70">
                {history.map((appt) => (
                  <div key={appt.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-stone-200">
                        {appt.service?.name ?? 'Serviço'} · {appt.barber?.full_name}
                      </p>
                      <p className="text-xs text-stone-600">
                        {dateKey(appt.starts_at).split('-').reverse().join('/')} às{' '}
                        {timeInSP(appt.starts_at)} · {formatBRL(appt.price_cents)}
                      </p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* pedidos */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <Package className="h-5 w-5 text-amber-500" /> Meus pedidos
            </h2>

            {orders.length === 0 ? (
              <p className="card p-6 text-sm text-stone-500">
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
                        <li key={idx} className="text-xs text-stone-500">
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
              <p className="mt-4 text-xs text-stone-600">{user.profile.email}</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-100">
              <KeyRound className="h-5 w-5 text-amber-500" /> Alterar senha
            </h2>
            <ChangePasswordForm />
          </div>

          <div className="card p-6 text-sm text-stone-500">
            <p className="font-medium text-stone-300">Como funciona o pagamento?</p>
            <p className="mt-2">
              Serviços e produtos são pagos no local (Pix, dinheiro ou cartão). O
              agendamento apenas reserva seu horário.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
