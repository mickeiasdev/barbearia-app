import Link from 'next/link'
import type { Metadata } from 'next'
import { Calendar, Clock, MapPin, MessageCircle, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { initials, formatBRL } from '@/lib/utils'
import { WEEKDAY_LABELS } from '@/lib/tz'
import Stars from '@/components/stars'
import FavoriteButton from '@/components/favorite-button'
import { getCurrentUser } from '@/lib/data'
import { waLink } from '@/lib/whatsapp'
import type { Barber, BarberSchedule, Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Profissionais' }

export default async function BarbeirosPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const [{ data: barbersData }, { data: schedulesData }, { data: linksData }, { data: reviewsData }] =
    await Promise.all([
      supabase
        .from('barbers')
        .select('*, establishment:establishments(name, address, whatsapp, slug)')
        .eq('is_active', true)
        .order('full_name'),
      supabase.from('barber_schedules').select('*'),
      supabase.from('barber_services').select('barber_id, services(name, price_cents)'),
      supabase.from('reviews').select('barber_id, rating').eq('is_visible', true),
    ])

  const barbers = (barbersData ?? []) as unknown as (Barber & {
    establishment?: { name: string; address: string | null; whatsapp: string | null; slug: string | null } | null
  })[]
  const schedules = (schedulesData ?? []) as BarberSchedule[]
  const links = (linksData ?? []) as unknown as {
    barber_id: string
    services: Service | null
  }[]
  const reviews = (reviewsData ?? []) as { barber_id: string; rating: number }[]

  const ratingByBarber = new Map<string, { sum: number; count: number }>()
  for (const r of reviews) {
    const cur = ratingByBarber.get(r.barber_id) ?? { sum: 0, count: 0 }
    cur.sum += r.rating
    cur.count += 1
    ratingByBarber.set(r.barber_id, cur)
  }

  const { data: favRows } = user
    ? await supabase
        .from('favorites')
        .select('barber_id')
        .eq('client_id', user.id)
        .in('barber_id', barbers.map((b) => b.id))
    : { data: null }
  const favIds = new Set(((favRows ?? []) as { barber_id: string }[]).map((r) => r.barber_id))

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title">Profissionais</h1>
      <p className="mt-2 text-sm text-stone-400">
        Vários profissionais independentes, cada um com seu estilo e especialidade.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {barbers.map((barber) => {
          const mySchedules = schedules.filter((s) => s.barber_id === barber.id)
          const days = [...new Set(mySchedules.map((s) => s.weekday))].sort()
          const myServices = links
            .filter((l) => l.barber_id === barber.id && l.services)
            .map((l) => l.services as Service)

          const rating = ratingByBarber.get(barber.id)
          const wa = barber.establishment?.whatsapp
          const waHref = wa
            ? waLink(wa, 'Olá! Vi seu perfil no site e quero agendar um horário.')
            : null
          const back = '/barbeiros'

          return (
            <div key={barber.id} className="card p-6">
              <div className="flex items-start gap-4">
                {barber.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={barber.photo_url}
                    alt={barber.full_name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/30"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-lg font-bold text-amber-500 ring-2 ring-amber-500/30">
                    {initials(barber.full_name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-stone-100">{barber.full_name}</h2>
                  {barber.establishment?.name && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-stone-400">
                      <MapPin className="h-3 w-3 text-amber-500/80" />
                      {barber.establishment.name}
                    </p>
                  )}
                  {rating && (
                    <div className="mt-1">
                      <Stars rating={rating.sum / rating.count} count={rating.count} />
                    </div>
                  )}
                  {barber.bio && (
                    <p className="mt-1 text-sm text-stone-400">{barber.bio}</p>
                  )}

                  {days.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        Atende:{' '}
                        {days.map((d, i) => (
                          <span key={d} className="text-stone-300">
                            {WEEKDAY_LABELS[d]}
                            {i < days.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}

                  {myServices.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {myServices.map((s) => (
                        <span key={s.id} className="badge border-stone-700 bg-stone-800/60 text-stone-400">
                          {s.name} · {formatBRL(s.price_cents)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={'/agendar?barbeiro=' + barber.id} className="btn btn-primary btn-sm flex-1">
                  <Calendar className="h-4 w-4" />
                  Agendar com {barber.full_name.split(' ')[0]}
                </Link>
                {barber.establishment?.slug && (
                  <Link href={'/p/' + barber.establishment.slug} className="btn btn-outline btn-sm">
                    <User className="h-4 w-4" /> Perfil
                  </Link>
                )}
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" aria-label={'WhatsApp de ' + barber.full_name}>
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                {user && (
                  <FavoriteButton
                    barberId={barber.id}
                    barberName={barber.full_name}
                    isFavorite={favIds.has(barber.id)}
                    loggedIn={!!user}
                    back={back}
                  />
                )}
              </div>
            </div>
          )
        })}
        {barbers.length === 0 && (
          <p className="text-sm text-stone-400">Nenhum profissional cadastrado ainda.</p>
        )}
      </div>
    </main>
  )
}
