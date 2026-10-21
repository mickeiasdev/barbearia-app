import Link from 'next/link'
import { Calendar, Clock, MapPin, MessageCircle, Star } from 'lucide-react'
import Stars from '@/components/stars'
import { formatBRL, formatDuration } from '@/lib/utils'
import type { LandingData } from '@/components/landing/data'

/**
 * LAYOUT 1 — CLÁSSICO: banner horizontal com gradiente, foto redonda
 * sobreposta ao centro, nome serif gigante, tagline âmbar e seções
 * simétricas (serviços, portfólio, avaliações, CTA).
 */
export default function LandingClassic({ data }: { data: LandingData }) {
  const { est, barber, displayName, tagline, bannerUrl, rating, reviewCount, reviews, services, photos, waHref, agendarHref, serviceHref, initialsName } = data

  return (
    <div>
      {/* ===== HERO: banner + foto central ===== */}
      <section className="relative border-b border-stone-800/60">
        <div className="absolute inset-0 overflow-hidden">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="h-full w-full object-cover opacity-40" />
          ) : (
            <div className="hero-pattern h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-stone-950/70 to-stone-950" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 text-center md:pt-28">
          {barber?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={barber.photo_url}
              alt={barber.full_name}
              className="mx-auto h-32 w-32 rounded-full object-cover ring-4 ring-amber-500/60 md:h-36 md:w-36"
            />
          ) : (
            <span className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-amber-500/10 text-4xl font-bold text-amber-500 ring-4 ring-amber-500/60 md:h-36 md:w-36">
              {initialsName}
            </span>
          )}

          <h1 className="mx-auto mt-6 max-w-3xl font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-6xl">
            {displayName}
          </h1>
          {tagline && (
            <p className="mx-auto mt-3 max-w-xl text-base italic text-amber-400/90 md:text-lg">
              {tagline}
            </p>
          )}

          {rating !== null && (
            <div className="mt-4 flex justify-center">
              <Stars rating={rating} count={reviewCount} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href={agendarHref} className="btn btn-primary px-8 py-3 text-base">
              <Calendar className="h-5 w-5" /> Agendar horário
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-6 py-3 text-base">
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </a>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-stone-400">
            {est.address && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-amber-500" /> {est.address}</span>
            )}
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-500" /> {est.opening_time.slice(0, 5)} às {est.closing_time.slice(0, 5)}</span>
          </div>
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="section-title text-center">Serviços</h2>
        <div className="mx-auto mt-3 h-px w-16 bg-amber-500/60" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} className="card flex flex-col p-6 text-center transition-colors hover:border-amber-500/40">
              <h3 className="font-semibold text-stone-100">{service.name}</h3>
              {service.description && (
                <p className="mt-1 flex-1 text-sm text-stone-400">{service.description}</p>
              )}
              <p className="mt-3 text-2xl font-bold text-amber-500">{formatBRL(service.price_cents)}</p>
              <p className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs text-stone-400">
                <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
              </p>
              <Link href={serviceHref(service.id)} className="btn btn-primary btn-sm mt-4">Agendar</Link>
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
            <div className="mx-auto mt-3 h-px w-16 bg-amber-500/60" />
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
          <div className="mx-auto mt-3 h-px w-16 bg-amber-500/60" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {reviews.map((review, i) => (
              <blockquote key={i} className="card p-5 text-center">
                <Stars rating={review.rating} />
                {review.comment && (
                  <p className="mt-2 text-sm italic text-stone-300">"{review.comment}"</p>
                )}
                <footer className="mt-2 text-xs text-stone-400">
                  — {review.author} · {review.date}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card hero-pattern flex flex-col items-center gap-4 p-10 text-center">
          <Star className="h-8 w-8 text-amber-500" />
          <h2 className="section-title">Pronto para o seu corte?</h2>
          <p className="max-w-md text-sm text-stone-400">Escolha o serviço e o horário — leva menos de um minuto.</p>
          <Link href={agendarHref} className="btn btn-primary px-8 py-3 text-base">
            <Calendar className="h-5 w-5" /> Agendar agora
          </Link>
        </div>
      </section>
    </div>
  )
}
