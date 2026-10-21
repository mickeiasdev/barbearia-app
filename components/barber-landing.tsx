import Link from 'next/link'
import { Calendar, Clock, MapPin, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration, initials } from '@/lib/utils'
import { WEEKDAY_LABELS } from '@/lib/tz'
import Stars from '@/components/stars'
import { waLink } from '@/lib/whatsapp'
import type { HostWorkspace } from '@/lib/site'
import type { BarberSchedule, Service } from '@/lib/types'

/**
 * Landing = o SITE de um profissional (subdomínio dele).
 * Mostra só o trabalho dele: serviços, portfólio, avaliações e contato.
 * Nenhum link para outros profissionais.
 */
export default async function BarberLanding({ workspace }: { workspace: HostWorkspace }) {
  const { establishment: est, barbers } = workspace
  const main = barbers[0] ?? null

  const supabase = await createClient()
  const barberIds = barbers.length > 0
    ? barbers.map((b) => b.id)
    : ['00000000-0000-0000-0000-000000000000']
  const [servicesRes, photosRes, reviewsRes, schedulesRes] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('establishment_id', est.id)
      .eq('is_active', true)
      .order('price_cents'),
    supabase
      .from('barber_photos')
      .select('url, caption')
      .in('barber_id', barberIds)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('reviews')
      .select('rating, comment, created_at, client:profiles(full_name)')
      .eq('is_visible', true)
      .in('barber_id', barberIds)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('barber_schedules').select('barber_id, weekday').in('barber_id', barberIds),
  ])

  const services = (servicesRes.data ?? []) as Service[]
  const photos = (photosRes.data ?? []) as { url: string; caption: string | null }[]
  const reviews = (reviewsRes.data ?? []) as unknown as {
    rating: number
    comment: string | null
    created_at: string
    client: { full_name: string } | null
  }[]

  const schedules = (schedulesRes.data ?? []) as BarberSchedule[]
  const days = [...new Set(schedules.filter((s) => barbers.some((b) => b.id === s.barber_id)).map((s) => s.weekday))].sort()
  const avg = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : null

  const wa = est.whatsapp
    ? waLink(est.whatsapp, 'Olá! Vi seu site e quero agendar um horário.')
    : null

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="hero-pattern border-b border-stone-800/60">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
            {main?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={main.photo_url}
                alt={main.full_name}
                className="h-32 w-32 rounded-full object-cover ring-4 ring-amber-500/30 md:h-36 md:w-36"
              />
            ) : (
              <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-4xl font-bold text-amber-500 ring-4 ring-amber-500/30 md:h-36 md:w-36">
                {initials(main?.full_name ?? est.name)}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-5xl">
                {main?.full_name ?? est.name}
              </h1>
              {avg !== null && (
                <div className="mt-2 flex justify-center md:justify-start">
                  <Stars rating={avg} count={reviews.length} />
                </div>
              )}
              {main?.bio && <p className="mx-auto mt-3 max-w-xl text-stone-400 md:mx-0">{main.bio}</p>}

              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-400 md:justify-start">
                {est.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-amber-500" /> {est.address}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {est.opening_time.slice(0, 5)} às {est.closing_time.slice(0, 5)}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                {main && (
                  <Link href={'/agendar?barbeiro=' + main.id} className="btn btn-primary px-8 py-3 text-base">
                    <Calendar className="h-5 w-5" /> Agendar horário
                  </Link>
                )}
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-6 py-3 text-base">
                    <MessageCircle className="h-5 w-5" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="section-title text-center">Serviços</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} className="card flex flex-col p-6">
              <h3 className="font-semibold text-stone-100">{service.name}</h3>
              {service.description && (
                <p className="mt-1 flex-1 text-sm text-stone-400">{service.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-amber-500">
                  {formatBRL(service.price_cents)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
                </span>
              </div>
              {main && (
                <Link
                  href={'/agendar?barbeiro=' + main.id + '&servico=' + service.id}
                  className="btn btn-primary btn-sm mt-4"
                >
                  Agendar
                </Link>
              )}
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-stone-400">Nenhum serviço cadastrado ainda.</p>
          )}
        </div>
      </section>

      {/* ===== PORTFÓLIO ===== */}
      {photos.length > 0 && (
        <section className="border-t border-stone-800/60 bg-stone-900/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="section-title text-center">Portfólio</h2>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, i) => (
                <figure key={i} className="group relative overflow-hidden rounded-xl border border-stone-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? 'Trabalho do profissional'}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {photo.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-stone-950/80 px-3 py-1.5 text-xs text-stone-300">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== AVALIAÇÕES ===== */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="section-title text-center">Avaliações</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {reviews.slice(0, 6).map((review, i) => (
              <blockquote key={i} className="card p-5">
                <Stars rating={review.rating} />
                {review.comment && (
                  <p className="mt-2 text-sm text-stone-300">"{review.comment}"</p>
                )}
                <footer className="mt-2 text-xs text-stone-400">
                  — {review.client?.full_name?.split(' ')[0] ?? 'Cliente'}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* ===== CTA FINAL ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card hero-pattern flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="section-title">Pronto para o seu corte?</h2>
          <p className="max-w-md text-sm text-stone-400">
            Escolha o serviço e o horário — leva menos de um minuto.
          </p>
          {main && (
            <Link href={'/agendar?barbeiro=' + main.id} className="btn btn-primary px-8 py-3 text-base">
              <Calendar className="h-5 w-5" /> Agendar agora
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
