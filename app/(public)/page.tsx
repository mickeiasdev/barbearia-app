import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  QrCode,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration, initials } from '@/lib/utils'
import Stars from '@/components/stars'
import FavoriteButton from '@/components/favorite-button'
import BarberLanding from '@/components/barber-landing'
import CompanySite from '@/components/company-site'
import { requireKnownHost, subdomainUrl } from '@/lib/site'
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
      .select('*, establishment:establishments(name, address, slug, parent_id)')
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

  const { data: allServices } = await supabase
    .from('services')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // empresas cadastradas na plataforma (diretório)
  const { data: companiesData } = await supabase
    .from('establishments')
    .select('id, name, slug, address')
    .eq('is_company', true)
    .order('name')

  return {
    services: (services.data ?? []) as unknown as (Service & { establishment?: { name: string } | null })[],
    barbers: (barbers.data ?? []) as unknown as (Barber & {
      establishment?: { name: string; address: string | null; slug: string | null; parent_id: string | null } | null
    })[],
    products: (products.data ?? []) as unknown as (Product & { establishment?: { name: string } | null })[],
    links: (links.data ?? []) as { barber_id: string; service_id: string }[],
    reviews: (reviews.data ?? []) as { barber_id: string; rating: number }[],
    specialties: (allServices ?? []) as { id: string; name: string }[],
    companies: (companiesData ?? []) as { id: string; name: string; slug: string; address: string | null }[],
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ esp?: string }>
}) {
  const sp = await searchParams
  const esp = sp.esp?.trim() || null

  const host = await requireKnownHost()
  if (host.workspace) {
    return <BarberLanding workspace={host.workspace} />
  }
  if (host.company) {
    return <CompanySite company={host.company} />
  }

  const { services, barbers, products, links, reviews, specialties, companies } = await fetchData()
  const user = await getCurrentUser()

  const professionals = esp
    ? barbers.filter((b) => links.some((l) => l.barber_id === b.id && l.service_id === esp))
    : barbers
  const espName = esp ? specialties.find((s) => s.id === esp)?.name : null

  const ratingByBarber = new Map<string, { sum: number; count: number }>()
  for (const r of reviews) {
    const cur = ratingByBarber.get(r.barber_id) ?? { sum: 0, count: 0 }
    cur.sum += r.rating
    cur.count += 1
    ratingByBarber.set(r.barber_id, cur)
  }

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
      {/* ===== HERO: a plataforma ===== */}
      <section className="hero-pattern border-b border-stone-800/60">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-24">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            Barbearias, salões, estética, unhas, tatuagem e personal
          </div>
          <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-5xl">
            Encontre o profissional perfeito — ou{' '}
            <span className="text-amber-500">tenha seu negócio online</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-400">
            Agenda, site próprio para cada profissional, Pix sem taxa e avaliações.
            Tudo em um só lugar.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/barbeiros" className="btn btn-primary px-8 py-3 text-base">
              <Scissors className="h-5 w-5" /> Encontrar profissional
            </Link>
            <Link href="/registrar-empresa" className="btn btn-outline px-8 py-3 text-base">
              <Store className="h-5 w-5" /> Criar meu negócio grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ===== BARBEARIAS NA PLATAFORMA ===== */}
      {companies.length > 0 && (
        <section className="border-t border-stone-800/60 bg-stone-900/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="section-title text-center">Negócios na plataforma</h2>
            <p className="mt-2 text-center text-sm text-stone-400">
              Cada um com endereço próprio e equipe independente.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => {
                const team = barbers.filter((b) => b.establishment?.parent_id === company.id)
                return (
                  <a
                    key={company.id}
                    href={subdomainUrl(company.slug)}
                    className="card group flex flex-col p-6 transition-colors hover:border-amber-500/40"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                      <Store className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-semibold text-stone-100 group-hover:text-amber-400">
                      {company.name}
                    </h3>
                    {company.address && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-400">
                        <MapPin className="h-3 w-3 text-amber-500/80" /> {company.address}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-stone-400">
                      {team.length === 0 ? 'Equipe em formação' : team.length === 1 ? '1 profissional' : team.length + ' profissionais'}
                    </p>
                    <div className="mt-3 flex -space-x-3">
                      {team.slice(0, 5).map((b) => (
                        <span key={b.id} className="relative">
                          {b.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={b.photo_url}
                              alt={b.full_name}
                              className="h-9 w-9 rounded-full border-2 border-stone-950 object-cover"
                            />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-stone-950 bg-stone-800 text-[11px] font-bold text-amber-400">
                              {initials(b.full_name)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== PROFISSIONAIS ===== */}
      <section id="profissionais" className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Nossos profissionais</h2>
            <p className="mt-2 text-sm text-stone-400">
              {espName ? 'Especialistas em ' + espName + '.' : 'Escolha com quem você quer atender.'}
            </p>
          </div>
          <Link href="/barbeiros" className="btn btn-outline btn-sm shrink-0">Ver todos</Link>
        </div>

        {specialties.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/" className={'badge ' + (!esp ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-stone-700 bg-stone-800/60 text-stone-400 hover:text-amber-400')}>
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
            const proUrl = barber.establishment?.slug ? '/' + barber.establishment.slug : '/barbeiros'
            return (
              <div key={barber.id} className="card p-6 text-center transition-colors hover:border-amber-500/40">
                {barber.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={barber.photo_url} alt={barber.full_name} className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-amber-500/30" />
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
                {barber.bio && <p className="mt-1 line-clamp-2 text-xs text-stone-400">{barber.bio}</p>}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Link href={'/agendar?barbeiro=' + barber.id} className="btn btn-primary btn-sm flex-1">Agendar</Link>
                  <Link href={proUrl} className="btn btn-outline btn-sm">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
          {professionals.length === 0 && (
            <p className="text-sm text-stone-400">Nenhum profissional encontrado{espName ? ' para ' + espName : ''}.</p>
          )}
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section className="border-t border-stone-800/60 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="section-title text-center">Serviços em destaque</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.id} href={'/agendar?servico=' + service.id} className="card group p-5 transition-colors hover:border-amber-500/40">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-stone-100 group-hover:text-amber-400">{service.name}</h3>
                  <span className="shrink-0 font-bold text-amber-500">{formatBRL(service.price_cents)}</span>
                </div>
                {service.establishment?.name && <p className="mt-1 text-xs text-stone-400">{service.establishment.name}</p>}
                {service.description && <p className="mt-2 line-clamp-2 text-sm text-stone-400">{service.description}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-400">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LOJA ===== */}
      {products.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Loja</h2>
              <p className="mt-2 text-sm text-stone-400">Produtos profissionais dos nossos barbeiros.</p>
            </div>
            <Link href="/loja" className="btn btn-outline btn-sm shrink-0">Ver loja</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="card p-5">
                <h3 className="font-semibold text-stone-100">{product.name}</h3>
                {product.establishment?.name && <p className="mt-0.5 text-xs text-stone-400">{product.establishment.name}</p>}
                <p className="mt-3 font-bold text-amber-500">{formatBRL(product.price_cents)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== CTA: CRIAR NEGÓCIO ===== */}
      <section className="border-t border-stone-800/60 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="card hero-pattern flex flex-col items-center gap-4 p-10 text-center">
            <ShieldCheck className="h-10 w-10 text-amber-500" />
            <h2 className="section-title">Tem um negócio? Coloque ele online em 1 minuto</h2>
            <p className="max-w-md text-sm text-stone-400">
              Agenda, site próprio para cada profissional, PDV, Pix direto na sua conta
              e avaliações. 14 dias de Pro grátis, sem cartão.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/registrar-empresa" className="btn btn-primary px-8 py-3 text-base">
                <UserPlus className="h-5 w-5" /> Criar meu negócio grátis
              </Link>
              <Link href="/vender" className="btn btn-outline px-8 py-3 text-base">
                Ver como funciona
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
