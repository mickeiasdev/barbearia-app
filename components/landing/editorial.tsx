import Link from 'next/link'
import { Calendar, Clock, MapPin, MessageCircle } from 'lucide-react'
import Stars from '@/components/stars'
import { formatBRL, formatDuration } from '@/lib/utils'
import type { LandingData } from '@/components/landing/data'

/**
 * LAYOUT 3 — EDITORIAL: hero gigante estilo capa de revista (banner
 * full-bleed, nome enorme no rodapé, foto em selo), serviços como
 * sumário editorial com preços grandes, portfólio de página inteira
 * e avaliações como citações destacadas.
 */
export default function LandingEditorial({ data }: { data: LandingData }) {
  const { est, barber, displayName, tagline, bannerUrl, rating, reviewCount, reviews, services, photos, waHref, agendarHref, serviceHref, initialsName } = data

  return (
    <div>
      {/* ===== CAPA ===== */}
      <section className="relative min-h-[78vh] overflow-hidden border-b border-stone-800/60">
        <div className="absolute inset-0">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="hero-pattern h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-stone-950/30" />
        </div>

        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-14 pt-24">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
            {est.name.split(' — ')[0] ?? est.name}
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl font-bold uppercase leading-[0.95] tracking-tight text-stone-50 md:text-8xl">
            {displayName}
          </h1>
          {tagline && (
            <p className="mt-5 max-w-xl text-lg text-stone-300 md:text-xl">{tagline}</p>
          )}

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap gap-3">
              <Link href={agendarHref} className="btn btn-primary px-8 py-3.5 text-base">
                <Calendar className="h-5 w-5" /> Agendar horário
              </Link>
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-6 py-3.5 text-base">
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
              )}
            </div>

            <div className="flex items-center gap-4">
              {rating !== null && <Stars rating={rating} count={reviewCount} />}
              {barber?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={barber.photo_url}
                  alt={barber.full_name}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/60 md:h-20 md:w-20"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-xl font-bold text-amber-500 ring-2 ring-amber-500/60 md:h-20 md:w-20">
                  {initialsName}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== INFO STRIP ===== */}
      <div className="border-b border-stone-800/60 bg-stone-900/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-2 px-4 py-4 text-sm text-stone-300">
          {est.address && (
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-500" /> {est.address}</span>
          )}
          <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> {est.opening_time.slice(0, 5)} às {est.closing_time.slice(0, 5)}</span>
        </div>
      </div>

      {/* ===== SERVIÇOS: sumário editorial ===== */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-500">Serviços & Preços</p>
            <h2 className="mt-2 font-serif text-4xl font-bold uppercase tracking-tight text-stone-100 md:text-5xl">
              Menu do corte
            </h2>
          </div>
          <p className="max-w-xs text-sm text-stone-400">
            Cada serviço tem horário livre em tempo real — escolha, confirme e pronto.
          </p>
        </div>

        <ul className="mt-12 border-t border-stone-800">
          {services.map((service) => (
            <li
              key={service.id}
              className="group grid grid-cols-1 items-baseline gap-x-8 gap-y-2 border-b border-stone-800 py-6 transition-colors hover:bg-stone-900/60 md:grid-cols-[1fr_auto_auto] md:px-4"
            >
              <div>
                <p className="font-serif text-2xl font-bold text-stone-100 group-hover:text-amber-400 md:text-3xl">
                  {service.name}
                </p>
                {service.description && (
                  <p className="mt-1 text-sm text-stone-400">{service.description}</p>
                )}
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-stone-400">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
                </p>
              </div>
              <p className="font-serif text-3xl font-bold text-amber-500 md:text-4xl">
                {formatBRL(service.price_cents)}
              </p>
              <Link href={serviceHref(service.id)} className="btn btn-primary btn-sm justify-self-start md:justify-self-end">
                Agendar
              </Link>
            </li>
          ))}
          {services.length === 0 && (
            <p className="border-b border-stone-800 py-6 text-sm text-stone-400">
              Nenhum serviço cadastrado ainda.
            </p>
          )}
        </ul>
      </section>

      {/* ===== PORTFÓLIO: página dupla ===== */}
      {photos.length > 0 && (
        <section className="border-y border-stone-800/60 bg-stone-900/30">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-500">Portfólio</p>
            <h2 className="mt-2 font-serif text-4xl font-bold uppercase tracking-tight text-stone-100 md:text-5xl">
              O trabalho fala
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {photos.map((photo, i) => (
                <figure key={i} className="group relative overflow-hidden rounded-2xl border border-stone-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? 'Trabalho do profissional'}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {photo.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 to-transparent px-4 pb-3 pt-8 text-sm text-stone-300">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== AVALIAÇÕES: citações ===== */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-500">Avaliações</p>
          <h2 className="mt-2 font-serif text-4xl font-bold uppercase tracking-tight text-stone-100 md:text-5xl">
            Palavra de cliente
          </h2>
          <div className="mt-12 space-y-10">
            {reviews.slice(0, 3).map((review, i) => (
              <blockquote key={i}>
                <p className="font-serif text-2xl italic leading-snug text-stone-100 md:text-3xl">
                  "{review.comment ?? 'Atendimento excelente.'}"
                </p>
                <footer className="mt-4 flex flex-col items-center gap-1">
                  <Stars rating={review.rating} />
                  <span className="text-sm text-stone-400">— {review.author} · {review.date}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* ===== CTA FINAL: faixa ===== */}
      <section className="relative overflow-hidden border-t border-stone-800/60">
        <div className="absolute inset-0">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="h-full w-full object-cover opacity-20" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/60" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="font-serif text-3xl font-bold uppercase tracking-tight text-stone-100 md:text-4xl">
            Seu próximo corte começa aqui
          </h2>
          <Link href={agendarHref} className="btn btn-primary px-10 py-4 text-base">
            <Calendar className="h-5 w-5" /> Agendar agora
          </Link>
        </div>
      </section>
    </div>
  )
}
