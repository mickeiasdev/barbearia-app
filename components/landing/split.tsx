import Link from 'next/link'
import { Calendar, Clock, MapPin, MessageCircle, Phone } from 'lucide-react'
import Stars from '@/components/stars'
import { formatBRL, formatDuration } from '@/lib/utils'
import type { LandingData } from '@/components/landing/data'

/**
 * LAYOUT 2 — PAINEL: lateral fixa (foto, nome gigante empilhado,
 * contatos e botões) com banner de fundo; conteúdo rola ao lado em
 * seções numeradas com serviços em linhas com preço pontilhado.
 */
export default function LandingSplit({ data }: { data: LandingData }) {
  const { est, barber, displayName, tagline, bannerUrl, rating, reviewCount, reviews, services, photos, waHref, agendarHref, serviceHref, initialsName } = data

  return (
    <div className="grid min-h-screen lg:grid-cols-[400px_1fr]">
      {/* ===== PAINEL LATERAL ===== */}
      <aside className="relative overflow-hidden border-b border-stone-800/60 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="absolute inset-0">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="h-full w-full object-cover opacity-30" />
          ) : (
            <div className="hero-pattern h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-stone-950/40" />
        </div>

        <div className="relative flex min-h-[420px] flex-col justify-end gap-6 p-8 lg:h-full">
          {barber?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={barber.photo_url}
              alt={barber.full_name}
              className="h-24 w-24 rounded-2xl object-cover ring-2 ring-amber-500/50"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl font-bold text-amber-500 ring-2 ring-amber-500/50">
              {initialsName}
            </span>
          )}

          <div>
            <h1 className="font-serif text-4xl font-bold uppercase leading-[1.05] tracking-tight text-stone-100 md:text-5xl">
              {displayName.split(' ').map((word, i) => (
                <span key={i} className="block">{word}</span>
              ))}
            </h1>
            {tagline && <p className="mt-3 max-w-xs text-sm text-amber-400/90">{tagline}</p>}
            {rating !== null && (
              <div className="mt-3">
                <Stars rating={rating} count={reviewCount} />
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-stone-400">
            {est.address && (
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-amber-500" /> {est.address}</p>
            )}
            <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-amber-500" /> {est.opening_time.slice(0, 5)} às {est.closing_time.slice(0, 5)}</p>
            {est.phone && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-amber-500" /> {est.phone}</p>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Link href={agendarHref} className="btn btn-primary w-full py-3 text-base">
              <Calendar className="h-5 w-5" /> Agendar horário
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full py-3">
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </aside>

      {/* ===== CONTEÚDO ===== */}
      <main className="min-w-0">
        {/* 01 — SERVIÇOS (linhas com preço pontilhado) */}
        <section className="px-6 py-14 md:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">01 — {data.servicesTitle ?? 'Serviços'}</p>
          <h2 className="mt-2 font-serif text-3xl font-bold uppercase tracking-tight text-stone-100">
            O que eu faço
          </h2>

          <ul className="mt-8 divide-y divide-stone-800/70">
            {services.map((service) => (
              <li key={service.id} className="group flex flex-wrap items-center gap-x-4 gap-y-1 py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-medium text-stone-100 group-hover:text-amber-400">{service.name}</p>
                  {service.description && (
                    <p className="mt-0.5 text-sm text-stone-400">{service.description}</p>
                  )}
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-stone-400">
                    <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
                  </p>
                </div>
                <span className="hidden flex-1 border-b border-dashed border-stone-700 sm:block" aria-hidden="true" />
                <span className="text-xl font-bold text-amber-500">{formatBRL(service.price_cents)}</span>
                <Link href={serviceHref(service.id)} className="btn btn-outline btn-sm shrink-0">
                  Agendar
                </Link>
              </li>
            ))}
            {services.length === 0 && (
              <p className="py-6 text-sm text-stone-400">Nenhum serviço cadastrado ainda.</p>
            )}
          </ul>
        </section>

        {/* 02 — PORTFÓLIO (2 colunas grandes) */}
        {photos.length > 0 && (
          <section className="border-t border-stone-800/60 bg-stone-900/30 px-6 py-14 md:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">02 — Portfólio</p>
            <h2 className="mt-2 font-serif text-3xl font-bold uppercase tracking-tight text-stone-100">
              Trabalhos recentes
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {photos.map((photo, i) => (
                <figure key={i} className="group relative overflow-hidden rounded-2xl border border-stone-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? 'Trabalho do profissional'}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {photo.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-stone-950/80 px-4 py-2 text-sm text-stone-300">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 03 — AVALIAÇÕES */}
        {reviews.length > 0 && (
          <section className="border-t border-stone-800/60 px-6 py-14 md:px-12">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-500">03 — Avaliações</p>
            <h2 className="mt-2 font-serif text-3xl font-bold uppercase tracking-tight text-stone-100">
              O que dizem
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {reviews.map((review, i) => (
                <blockquote key={i} className="card p-5">
                  <Stars rating={review.rating} />
                  {review.comment && (
                    <p className="mt-2 text-sm text-stone-300">"{review.comment}"</p>
                  )}
                  <footer className="mt-2 text-xs text-stone-400">— {review.author} · {review.date}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="border-t border-stone-800/60 px-6 py-14 md:px-12">
          <div className="card hero-pattern flex flex-col items-center gap-3 p-10 text-center">
            <h2 className="section-title">Quer garantir seu horário?</h2>
            <p className="max-w-md text-sm text-stone-400">Agendamento online, confirmação na hora.</p>
            <Link href={agendarHref} className="btn btn-primary px-8 py-3 text-base">
              <Calendar className="h-5 w-5" /> Agendar agora
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
