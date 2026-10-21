import Link from 'next/link'
import { Calendar, Clock, MapPin, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, initials } from '@/lib/utils'
import Stars from '@/components/stars'
import { subdomainUrl } from '@/lib/site'
import { waLink } from '@/lib/whatsapp'
import type { Establishment } from '@/lib/types'

/**
 * SITE DE UMA EMPRESA (subdomínio dela): apresenta a unidade e os
 * profissionais que trabalham nela, cada um com link para o site próprio.
 */
export default async function CompanySite({ company }: { company: Establishment }) {
  const supabase = await createClient()

  // espaços dos profissionais vinculados a esta empresa
  const { data: childrenData } = await supabase
    .from('establishments')
    .select('id, name, slug')
    .eq('parent_id', company.id)
    .order('name')
  const children = (childrenData ?? []) as { id: string; name: string; slug: string }[]

  const childIds = children.length > 0
    ? children.map((c) => c.id)
    : ['00000000-0000-0000-0000-000000000000']

  // barbeiros da empresa primeiro (reviews e serviços dependem deles)
  const { data: barbersData } = await supabase
    .from('barbers')
    .select('*, establishment_id')
    .in('establishment_id', childIds)
    .eq('is_active', true)
    .order('full_name')
  const barberIds = ((barbersData ?? []) as { id: string }[]).map((b) => b.id)
  const barberIdList = barberIds.length > 0
    ? barberIds
    : ['00000000-0000-0000-0000-000000000000']

  const [{ data: reviewsData }, { data: linksData }] = await Promise.all([
    supabase
      .from('reviews')
      .select('barber_id, rating')
      .eq('is_visible', true)
      .in('barber_id', barberIdList),
    supabase
      .from('barber_services')
      .select('barber_id, services(name, price_cents)')
      .in('barber_id', barberIdList),
  ])

  const barbers = (barbersData ?? []) as unknown as {
    id: string
    establishment_id: string
    full_name: string
    bio: string | null
    photo_url: string | null
  }[]
  const reviews = (reviewsData ?? []) as { barber_id: string; rating: number }[]
  const links = (linksData ?? []) as unknown as {
    barber_id: string
    services: { name: string; price_cents: number } | null
  }[]

  const ratingByBarber = new Map<string, { sum: number; count: number }>()
  for (const r of reviews) {
    const cur = ratingByBarber.get(r.barber_id) ?? { sum: 0, count: 0 }
    cur.sum += r.rating
    cur.count += 1
    ratingByBarber.set(r.barber_id, cur)
  }

  const waHref = company.whatsapp
    ? waLink(company.whatsapp, 'Olá! Vi o site da barbearia e quero agendar um horário.')
    : null

  return (
    <div>
      {/* ===== HERO da empresa ===== */}
      <section className="hero-pattern border-b border-stone-800/60">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
          <h1 className="font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-5xl">
            {company.name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-stone-400">
            Nossa equipe de profissionais independentes — cada um com seu estilo,
            seus serviços e seu site próprio.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-stone-400">
            {company.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-amber-500" /> {company.address}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" />
              {company.opening_time.slice(0, 5)} às {company.closing_time.slice(0, 5)}
            </span>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-6 py-3 text-base">
                <MessageCircle className="h-5 w-5" /> WhatsApp da barbearia
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ===== PROFISSIONAIS da empresa ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="section-title text-center">Nossos profissionais</h2>
        <p className="mt-2 text-center text-sm text-stone-400">
          Escolha com quem você quer atender — o agendamento é direto com o profissional.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber) => {
            const rating = ratingByBarber.get(barber.id)
            const myServices = links
              .filter((l) => l.barber_id === barber.id && l.services)
              .map((l) => l.services!)
              .slice(0, 3)
            const child = children.find((c) => c.id === barber.establishment_id)
            return (
              <div key={barber.id} className="card p-6 text-center">
                {barber.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={barber.photo_url}
                    alt={barber.full_name}
                    className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-amber-500/30"
                  />
                ) : (
                  <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/10 text-2xl font-bold text-amber-500 ring-4 ring-amber-500/30">
                    {initials(barber.full_name)}
                  </span>
                )}
                <h3 className="mt-4 font-semibold text-stone-100">{barber.full_name}</h3>
                {rating && (
                  <div className="mt-1 flex justify-center">
                    <Stars rating={rating.sum / rating.count} count={rating.count} />
                  </div>
                )}
                {barber.bio && (
                  <p className="mt-1 line-clamp-2 text-sm text-stone-400">{barber.bio}</p>
                )}
                {myServices.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {myServices.map((s, i) => (
                      <span key={i} className="badge border-stone-700 bg-stone-800/60 text-stone-400">
                        {s.name} · {formatBRL(s.price_cents)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-5 space-y-2">
                  <Link
                    href={'/agendar?barbeiro=' + barber.id}
                    className="btn btn-primary btn-sm w-full"
                  >
                    <Calendar className="h-4 w-4" /> Agendar com {barber.full_name.split(' ')[0]}
                  </Link>
                  {child && (
                    <a
                      href={subdomainUrl(child.slug)}
                      className="btn btn-outline btn-sm w-full"
                    >
                      Site do {barber.full_name.split(' ')[0]}
                    </a>
                  )}
                </div>
              </div>
            )
          })}
          {barbers.length === 0 && (
            <p className="text-sm text-stone-400">
              Nenhum profissional vinculado a esta empresa ainda.
            </p>
          )}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card hero-pattern flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="section-title">Quer saber com quem agendar?</h2>
          <p className="max-w-md text-sm text-stone-400">
            Conheça o trabalho de cada profissional no site próprio dele e escolha o seu.
          </p>
          <Link href="/agendar" className="btn btn-primary px-8 py-3 text-base">
            <Calendar className="h-5 w-5" /> Ver horários disponíveis
          </Link>
        </div>
      </section>
    </div>
  )
}
