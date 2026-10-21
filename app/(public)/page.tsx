import Link from 'next/link'
import { ArrowRight, Calendar, Clock, MapPin, Scissors, Sparkles, Star, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration, initials } from '@/lib/utils'
import Stars from '@/components/stars'
import FavoriteButton from '@/components/favorite-button'
import { getCurrentUser } from '@/lib/data'
import type { Barber, Product, Service } from '@/lib/types'

async function fetchData() {
  const supabase = await createClient()
  const [services, barbers, products, links, reviews] = await Promise.all([
    supabase
      .from('services')
      .select('*, establishment:establishments(name)')
      .eq('is_active', true)
      .order('price_cents')
      .limit(6),
    supabase
      .from('barbers')
      .select('*, establishment:establishments(name, address, slug)')
      .eq('is_active', true)
      .order('full_name')
      .limit(12),
    supabase
      .from('products')
      .select('*, establishment:establishments(name)')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at')
      .limit(4),
    supabase.from('barber_services').select('barber_id, service_id'),
    supabase.from('reviews').select('barber_id, rating').eq('is_visible', true),
  ])

  // especialidades (nomes de serviços) para o filtro
  const { data: allServices } = await supabase
    .from('services')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return {
    services: (services.data ?? []) as unknown as (Service & { establishment?: { name: string } | null })[],
    barbers: (barbers.data ?? []) as unknown as (Barber & {
      establishment?: { name: string; address: string | null; slug: string | null } | null
    })[],
    products: (products.data ?? []) as unknown as (Product & { establishment?: { name: string } | null })[],
    links: (links.data ?? []) as { barber_id: string; service_id: string }[],
    reviews: (reviews.data ?? []) as { barber_id: string; rating: number }[],
    specialties: (allServices ?? []) as { id: string; name: string }[],
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ esp?: string }>
}) {
  const sp = await searchParams
  const esp = sp.esp?.trim() || null

  const { services, barbers, products, links, reviews, specialties } = await fetchData()
  const user = await getCurrentUser()

  // filtro por especialidade (?esp=ID do serviço)
  const professionals = esp
    ? barbers.filter((b) => links.some((l) => l.barber_id === b.id && l.service_id === esp))
    : barbers
  const espName = esp ? specialties.find((s) => s.id === esp)?.name : null

  // nota média por profissional
  const ratingByBarber = new Map<string, { sum: number; count: number }>()
  for (const r of reviews) {
    const cur = ratingByBarber.get(r.barber_id) ?? { sum: 0, count: 0 }
    cur.sum += r.rating
    cur.count += 1
    ratingByBarber.set(r.barber_id, cur)
  }

  // favoritos do cliente logado
  const { data: favRows } = user
    ? await (await createClient())
        .from('favorites')
        .select('barber_id')
        .eq('client_id', user.id)
        .in('barber_id', barbers.map((b) => b.id))
    : { data: null }
  const favIds = new Set(((favRows ?? []) as { barber_id: string }[]).map((r) => r.barber_id))

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="hero-pattern border-b border-stone-800/60">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            Vários profissionais independentes em um só lugar
          </div>

          <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-6xl">
            Seu corte, <span className="text-amber-500">com o seu barbeiro</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-stone-400 md:text-lg">
            Escolha o profissional, o serviço e o horário. Cada barbeiro tem seu
            próprio espaço, agenda e produtos — tudo em um só site.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/barbeiros" className="btn btn-primary px-8 py-3 text-base">
              <Scissors className="h-5 w-5" />
              Encontrar profissional
            </Link>
            <Link href="/loja" className="btn btn-outline px-8 py-3 text-base">
              <Store className="h-5 w-5" />
              Ver a loja
            </Link>
          </div>

          {barbers.length > 0 && (
            <p className="mt-10 text-sm text-stone-400">
              {barbers.length === 1
                ? '1 profissional pronto para atender você'
                : barbers.length + ' profissionais prontos para atender você'}
            </p>
          )}
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="section-title text-center">Como funciona</h2>
        <p className="mt-2 text-center text-sm text-stone-400">
          Três passos simples até a cadeira do barbeiro.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Star, title: '1. Escolha o profissional', text: 'Conheça a equipe e selecione seu barbeiro favorito.' },
            { icon: Scissors, title: '2. Escolha o serviço', text: 'Corte, barba, pigmentação... cada profissional tem seus serviços e preços.' },
            { icon: Calendar, title: '3. Escolha o horário', text: 'Veja os horários livres em tempo real e confirme na hora.' },
          ].map((step) => (
            <div key={step.title} className="card p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold text-stone-100">{step.title}</h3>
              <p className="mt-2 text-sm text-stone-400">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PROFISSIONAIS ===== */}
      <section id="profissionais" className="border-t border-stone-800/60 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Nossos profissionais</h2>
              <p className="mt-2 text-sm text-stone-400">
                {espName ? 'Especialistas em ' + espName + '.' : 'Escolha com quem você quer atender.'}
              </p>
            </div>
            <Link href="/barbeiros" className="btn btn-outline btn-sm shrink-0">
              Ver todos
            </Link>
          </div>

          {/* filtro por especialidade */}
          {specialties.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/"
                className={'badge ' + (!esp ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-stone-700 bg-stone-800/60 text-stone-400 hover:text-amber-400')}
              >
                Todos
              </Link>
              {specialties.slice(0, 10).map((s) => (
                <Link
                  key={s.id}
                  href={'/?esp=' + s.id + '#profissionais'}
                  className={'badge ' + (esp === s.id ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-stone-700 bg-stone-800/60 text-stone-400 hover:text-amber-400')}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {professionals.map((barber) => {
              const rating = ratingByBarber.get(barber.id)
              const back = '/?esp=' + (esp ?? '') + '#profissionais'
              return (
                <div key={barber.id} className="card p-6 text-center transition-colors hover:border-amber-500/40">
                  {barber.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={barber.photo_url}
                      alt={barber.full_name}
                      className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-amber-500/30"
                    />
                  ) : (
                    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-xl font-bold text-amber-500 ring-2 ring-amber-500/30">
                      {initials(barber.full_name)}
                    </span>
                  )}
                  <h3 className="mt-4 font-semibold text-stone-100">{barber.full_name}</h3>
                  {barber.establishment?.name && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-400">
                      <MapPin className="h-3 w-3 text-amber-500/80" /> {barber.establishment.name}
                    </p>
                  )}
                  {rating && (
                    <div className="mt-1 flex justify-center">
                      <Stars rating={rating.sum / rating.count} count={rating.count} />
                    </div>
                  )}
                  {barber.bio && (
                    <p className="mt-1 line-clamp-2 text-xs text-stone-400">{barber.bio}</p>
                  )}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Link href={'/agendar?barbeiro=' + barber.id} className="btn btn-primary btn-sm flex-1">
                      Agendar
                    </Link>
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
            {professionals.length === 0 && (
              <p className="text-sm text-stone-400">
                Nenhum profissional encontrado{espName ? ' para ' + espName : ''}.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Serviços</h2>
            <p className="mt-2 text-sm text-stone-400">Cada profissional com seus preços.</p>
          </div>
          <Link href="/servicos" className="btn btn-outline btn-sm shrink-0">
            Ver todos
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={'/agendar?servico=' + service.id}
              className="card group p-5 transition-colors hover:border-amber-500/40"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-stone-100 group-hover:text-amber-400">
                  {service.name}
                </h3>
                <span className="shrink-0 font-bold text-amber-500">
                  {formatBRL(service.price_cents)}
                </span>
              </div>
              {service.establishment?.name && (
                <p className="mt-1 text-xs text-stone-400">{service.establishment.name}</p>
              )}
              {service.description && (
                <p className="mt-2 line-clamp-2 text-sm text-stone-400">{service.description}</p>
              )}
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-400">
                <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
              </p>
            </Link>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-stone-400">
              Nenhum serviço cadastrado ainda. Volte em breve!
            </p>
          )}
        </div>
      </section>

      {/* ===== PRODUTOS ===== */}
      <section className="border-t border-stone-800/60 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Loja</h2>
              <p className="mt-2 text-sm text-stone-400">Produtos profissionais dos nossos barbeiros.</p>
            </div>
            <Link href="/loja" className="btn btn-outline btn-sm shrink-0">
              Ver loja
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="card p-5">
                <h3 className="font-semibold text-stone-100">{product.name}</h3>
                {product.establishment?.name && (
                  <p className="mt-0.5 text-xs text-stone-400">{product.establishment.name}</p>
                )}
                {product.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-stone-400">{product.description}</p>
                )}
                <p className="mt-3 font-bold text-amber-500">{formatBRL(product.price_cents)}</p>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-stone-400">Em breve você encontra nossos produtos aqui.</p>
            )}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="card hero-pattern flex flex-col items-center gap-4 p-10 text-center">
          <Sparkles className="h-10 w-10 text-amber-500" />
          <h2 className="section-title">Pronto para o melhor corte da sua vida?</h2>
          <p className="max-w-md text-sm text-stone-400">
            Agende em menos de um minuto. Sem filas, sem espera, sem ligação.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/barbeiros" className="btn btn-primary px-8 py-3 text-base">
              <Calendar className="h-5 w-5" />
              Agendar meu horário
            </Link>
            <Link href="/registrar" className="btn btn-outline px-8 py-3 text-base">
              Sou barbeiro — criar meu espaço
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
