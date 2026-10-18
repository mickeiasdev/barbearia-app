import Link from 'next/link'
import { ArrowRight, Calendar, Clock, MapPin, Phone, Scissors, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEstablishment } from '@/lib/data'
import { formatBRL, formatDuration, initials } from '@/lib/utils'
import type { Barber, Product, Service } from '@/lib/types'

async function fetchData() {
  const supabase = await createClient()
  const [services, barbers, products] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('price_cents')
      .limit(6),
    supabase
      .from('barbers')
      .select('*')
      .eq('is_active', true)
      .order('full_name')
      .limit(4),
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at')
      .limit(4),
  ])

  return {
    services: (services.data ?? []) as Service[],
    barbers: (barbers.data ?? []) as Barber[],
    products: (products.data ?? []) as Product[],
  }
}

export default async function HomePage() {
  const { services, barbers, products } = await fetchData()
  const establishment = await getEstablishment()

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="hero-pattern border-b border-stone-800/60">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            Agendamento online em segundos
          </div>

          <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-6xl">
            Seu corte, <span className="text-amber-500">no horário perfeito</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-stone-400 md:text-lg">
            Escolha o serviço, o barbeiro e o horário. A barbearia completa com
            produtos profissionais — tudo em um só lugar.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/agendar" className="btn btn-primary px-8 py-3 text-base">
              <Calendar className="h-5 w-5" />
              Agendar agora
            </Link>
            <Link href="/servicos" className="btn btn-outline px-8 py-3 text-base">
              Ver serviços
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {establishment && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-stone-500">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" /> {establishment.address}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-500" /> {establishment.phone}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                {establishment.opening_time.slice(0, 5)} às {establishment.closing_time.slice(0, 5)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="section-title text-center">Como funciona</h2>
        <p className="mt-2 text-center text-sm text-stone-500">
          Três passos simples até a cadeira do barbeiro.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Scissors, title: '1. Escolha o serviço', text: 'Corte, barba, pigmentação... você decide o que precisa.' },
            { icon: Star, title: '2. Escolha o barbeiro', text: 'Conheça a equipe e selecione seu profissional favorito.' },
            { icon: Calendar, title: '3. Escolha o horário', text: 'Veja os horários livres em tempo real e confirme na hora.' },
          ].map((step) => (
            <div key={step.title} className="card p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold text-stone-100">{step.title}</h3>
              <p className="mt-2 text-sm text-stone-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section className="border-t border-stone-800/60 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Serviços</h2>
              <p className="mt-2 text-sm text-stone-500">Preços justos e qualidade profissional.</p>
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
                {service.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-stone-500">{service.description}</p>
                )}
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-500">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
                </p>
              </Link>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-stone-500">
                Nenhum serviço cadastrado ainda. Volte em breve!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== BARBEIROS ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Nossa equipe</h2>
            <p className="mt-2 text-sm text-stone-500">Profissionais prontos para atender você.</p>
          </div>
          <Link href="/barbeiros" className="btn btn-outline btn-sm shrink-0">
            Ver todos
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {barbers.map((barber) => (
            <Link
              key={barber.id}
              href={'/agendar?barbeiro=' + barber.id}
              className="card p-6 text-center transition-colors hover:border-amber-500/40"
            >
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
              {barber.bio && (
                <p className="mt-1 line-clamp-2 text-xs text-stone-500">{barber.bio}</p>
              )}
            </Link>
          ))}
          {barbers.length === 0 && (
            <p className="text-sm text-stone-500">Equipe em formação. Volte em breve!</p>
          )}
        </div>
      </section>

      {/* ===== PRODUTOS ===== */}
      <section className="border-t border-stone-800/60 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Loja</h2>
              <p className="mt-2 text-sm text-stone-500">Produtos profissionais para manter o visual.</p>
            </div>
            <Link href="/loja" className="btn btn-outline btn-sm shrink-0">
              Ver loja
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="card p-5">
                <h3 className="font-semibold text-stone-100">{product.name}</h3>
                {product.category && (
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-stone-600">{product.category}</p>
                )}
                {product.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-stone-500">{product.description}</p>
                )}
                <p className="mt-3 font-bold text-amber-500">{formatBRL(product.price_cents)}</p>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-stone-500">Em breve você encontra nossos produtos aqui.</p>
            )}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="card hero-pattern flex flex-col items-center gap-4 p-10 text-center">
          <ShieldCheck className="h-10 w-10 text-amber-500" />
          <h2 className="section-title">Pronto para o melhor corte da sua vida?</h2>
          <p className="max-w-md text-sm text-stone-500">
            Agende em menos de um minuto. Sem filas, sem espera, sem ligação.
          </p>
          <Link href="/agendar" className="btn btn-primary px-8 py-3 text-base">
            <Calendar className="h-5 w-5" />
            Agendar meu horário
          </Link>
        </div>
      </section>
    </div>
  )
}
