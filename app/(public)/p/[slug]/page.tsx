import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Calendar, Clock, MapPin, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration, initials } from '@/lib/utils'
import { WEEKDAY_LABELS } from '@/lib/tz'
import Stars from '@/components/stars'
import FavoriteButton from '@/components/favorite-button'
import { getCurrentUser } from '@/lib/data'
import { waLink } from '@/lib/whatsapp'
import { requireKnownHost } from '@/lib/site'
import type { Barber, Establishment } from '@/lib/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()
  const name = (data as { name: string } | null)?.name
  return { title: name ?? 'Profissional' }
}

export default async function ProfessionalPage({ params }: Props) {
  const { slug } = await params

  // no site de um profissional (subdomínio), o perfil é a própria home
  const host = await requireKnownHost()
  if (host.workspace) redirect('/')

  const supabase = await createClient()

  const { data: estData } = await supabase
    .from('establishments')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  const est = (estData ?? null) as Establishment | null
  if (!est) notFound()

  const [user, barbersRes, servicesRes, linksRes, schedulesRes, photosRes, reviewsRes] =
    await Promise.all([
      getCurrentUser(),
      supabase.from('barbers').select('*').eq('establishment_id', est.id).eq('is_active', true).order('full_name'),
      supabase.from('services').select('*').eq('establishment_id', est.id).eq('is_active', true).order('price_cents'),
      supabase.from('barber_services').select('barber_id, service_id'),
      supabase.from('barber_schedules').select('barber_id, weekday'),
      supabase.from('barber_photos').select('barber_id, url, caption').order('created_at', { ascending: false }).limit(24),
      supabase.from('reviews').select('barber_id, rating, comment, created_at, client:profiles(full_name)').eq('is_visible', true).order('created_at', { ascending: false }).limit(40),
    ])

  const barbers = (barbersRes.data ?? []) as Barber[]
  const links = (linksRes.data ?? []) as { barber_id: string; service_id: string }[]
  const schedules = (schedulesRes.data ?? []) as { barber_id: string; weekday: number }[]
  const photos = (photosRes.data ?? []) as { barber_id: string; url: string; caption: string | null }[]
  const reviews = (reviewsRes.data ?? []) as unknown as {
    barber_id: string
    rating: number
    comment: string | null
    created_at: string
    client: { full_name: string } | null
  }[]

  // favorito do cliente logado
  const { data: favRows } = user
    ? await supabase
        .from('favorites')
        .select('barber_id')
        .eq('client_id', user.id)
        .in('barber_id', barbers.map((b) => b.id))
    : { data: null }
  const favIds = new Set(((favRows ?? []) as { barber_id: string }[]).map((r) => r.barber_id))

  const back = '/p/' + slug

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {/* ===== cabeçalho do espaço ===== */}
      <div className="card p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          {barbers[0]?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={barbers[0].photo_url}
              alt={barbers[0].full_name}
              className="h-24 w-24 rounded-full object-cover ring-2 ring-amber-500/30"
            />
          ) : (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-2xl font-bold text-amber-500 ring-2 ring-amber-500/30">
              {initials(barbers[0]?.full_name ?? est.name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-3xl font-bold uppercase tracking-tight text-stone-100">
              {est.name}
            </h1>
            {barbers[0] && (
              <p className="mt-1 text-sm text-stone-400">
                {barbers[0].full_name}
                {barbers.length > 1 ? ' +' + (barbers.length - 1) + ' na equipe' : ''}
              </p>
            )}

            {reviews.length > 0 && barbers.length > 0 && (
              <div className="mt-2">
                <Stars
                  rating={reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length}
                  count={reviews.length}
                />
              </div>
            )}

            {barbers[0]?.bio && <p className="mt-2 text-sm text-stone-400">{barbers[0].bio}</p>}

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-stone-400">
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
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-44">
            {barbers[0] && (
              <Link href={'/agendar?barbeiro=' + barbers[0].id} className="btn btn-primary w-full">
                <Calendar className="h-4 w-4" /> Agendar horário
              </Link>
            )}
            {est.whatsapp && (
              <a
                href={
                  waLink(est.whatsapp, 'Olá! Vi seu perfil no site e quero agendar um horário.') ?? '#'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline w-full"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {barbers[0] && user && (
              <FavoriteButton
                barberId={barbers[0].id}
                barberName={barbers[0].full_name}
                isFavorite={favIds.has(barbers[0].id)}
                loggedIn={!!user}
                back={back}
                className="btn btn-outline w-full"
              />
            )}
          </div>
        </div>
      </div>

      {/* ===== serviços ===== */}
      <section className="mt-10">
        <h2 className="section-title">Serviços</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servicesRes.data?.map((raw) => {
            const service = raw as { id: string; name: string; description: string | null; price_cents: number; duration_min: number }
            const executors = links
              .filter((l) => l.service_id === service.id)
              .map((l) => barbers.find((b) => b.id === l.barber_id)?.full_name)
              .filter(Boolean)
            return (
              <div key={service.id} className="card flex flex-col p-5">
                <h3 className="font-semibold text-stone-100">{service.name}</h3>
                {service.description && (
                  <p className="mt-1 flex-1 text-sm text-stone-400">{service.description}</p>
                )}
                {executors.length > 0 && (
                  <p className="mt-1 text-xs text-stone-400">com {executors.join(', ')}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-amber-500">
                    {formatBRL(service.price_cents)}
                  </span>
                  <span className="text-xs text-stone-400">
                    <Clock className="mr-1 inline h-3.5 w-3.5" />
                    {formatDuration(service.duration_min)}
                  </span>
                </div>
                {barbers[0] && (
                  <Link
                    href={'/agendar?barbeiro=' + barbers[0].id + '&servico=' + service.id}
                    className="btn btn-primary btn-sm mt-4"
                  >
                    Agendar
                  </Link>
                )}
              </div>
            )
          })}
          {(servicesRes.data ?? []).length === 0 && (
            <p className="text-sm text-stone-400">Nenhum serviço cadastrado ainda.</p>
          )}
        </div>
      </section>

      {/* ===== portfólio ===== */}
      {photos.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title">Portfólio</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
        </section>
      )}

      {/* ===== avaliações ===== */}
      {reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title">Avaliações</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
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

      {/* ===== CTA ===== */}
      <div className="card hero-pattern mt-12 flex flex-col items-center gap-3 p-8 text-center">
        <h2 className="font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Gostou do trabalho?
        </h2>
        <p className="text-sm text-stone-400">Agende seu horário em menos de um minuto.</p>
        {barbers[0] && (
          <Link href={'/agendar?barbeiro=' + barbers[0].id} className="btn btn-primary px-8 py-3 text-base">
            <Calendar className="h-5 w-5" /> Agendar com {barbers[0].full_name.split(' ')[0]}
          </Link>
        )}
      </div>
    </main>
  )
}
