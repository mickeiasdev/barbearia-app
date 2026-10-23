import Link from 'next/link'
import {
  Calendar,
  Check,
  Clock,
  CreditCard,
  LineChart,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Star,
  Store,
} from 'lucide-react'

const FEATURES = [
  { icon: Calendar, title: 'Agendamento online', text: 'Horários livres em tempo real, sem conflito.' },
  { icon: Store, title: 'Site próprio por profissional', text: 'Cada um com endereço, layout e avaliações próprias.' },
  { icon: QrCode, title: 'Pix direto, 0% de taxa', text: 'O pagamento cai na conta do profissional, sem intermediário.' },
  { icon: Smartphone, title: 'PDV no celular', text: 'Venda produtos no balcão com desconto, estoque e recibo.' },
  { icon: Star, title: 'Avaliações com nota', text: 'Cliente avalia; a nota aparece no site do profissional.' },
  { icon: MessageCircle, title: 'Lembretes automáticos', text: 'WhatsApp e e-mail 24h antes — menos furo na agenda.' },
  { icon: LineChart, title: 'Relatórios e comissões', text: 'Receita, top serviços e comissão de cada um.' },
  { icon: ShieldCheck, title: 'Cada um no seu quadrado', text: 'Profissional vê só os dados dele; dono vê a barbearia.' },
]

const PLANS = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    period: 'para sempre',
    highlight: false,
    items: ['1 profissional', 'Agendamento online', 'Site do profissional', 'Pix na hora', 'PDV com estoque'],
    cta: 'Começar grátis',
  },
  {
    name: 'Pro',
    price: 'R$ 69',
    period: '/mês',
    highlight: true,
    items: ['Até 10 profissionais', 'Tudo do Grátis', 'Lembretes automáticos', 'Avaliações e portfólio', 'Pix antecipado', 'Relatórios e exportação'],
    cta: 'Testar 14 dias grátis',
  },
  {
    name: 'Business',
    price: 'R$ 129',
    period: '/mês',
    highlight: false,
    items: ['Profissionais ilimitados', 'Tudo do Pro', 'Várias unidades', 'Gerente por unidade', 'Suporte prioritário'],
    cta: 'Falar com a gente',
  },
]

const FAQ = [
  { q: 'Cobram taxa por agendamento?', a: 'Não. Mensalidade fixa — cada atendimento é 100% seu. O Pix vai direto pra conta do profissional.' },
  { q: 'Serve para outros negócios além de barbearia?', a: 'Sim: salões, clínicas de estética, studios de unhas, tatuagem e personal trainers.' },
  { q: 'Consigo usar só com meu celular?', a: 'Sim. Painel, PDV e agendamento funcionam no navegador do celular.' },
  { q: 'O que acontece depois dos 14 dias de teste?', a: 'Continua no Grátis (1 profissional) ou assina o Pro. Nada é apagado.' },
  { q: 'Dá para importar meus clientes atuais?', a: 'Sim — cada profissional mantém a própria carteira, com histórico e gastos.' },
]

/** Corpo da landing de vendas — usado na raiz e em /vender. */
export default function SellingLanding() {
  return (
    <div>
      {/* hero */}
      <section className="hero-pattern border-b border-stone-800/60">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-24">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
            <ShieldCheck className="h-3.5 w-3.5" /> 14 dias de Pro grátis — sem cartão
          </p>
          <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-6xl">
            O sistema completo do seu negócio —{' '}
            <span className="text-amber-500">sem taxa por atendimento</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-400">
            Barbearias, salões, clínicas de estética, studios de unhas e tatuagem:
            agendamento online, site próprio para cada profissional, PDV, Pix direto
            na sua conta, avaliações e relatórios. Tudo no celular.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/registrar-empresa" className="btn btn-primary px-8 py-3.5 text-base">
              Criar meu negócio grátis
            </Link>
            <Link href="/barbeiros" className="btn btn-outline px-8 py-3.5 text-base">
              Ver profissionais
            </Link>
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { value: '0%', label: 'de taxa por agendamento' },
            { value: '100%', label: 'do Pix na conta do profissional' },
            { value: '1 min', label: 'para começar a usar' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 text-center">
              <p className="font-serif text-3xl font-bold text-amber-500">{stat.value}</p>
              <p className="mt-1 text-xs text-stone-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* recursos */}
      <section className="border-y border-stone-800/70 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="section-title text-center">Tudo que o seu negócio precisa</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-semibold text-stone-100">{f.title}</h3>
                <p className="mt-1 text-sm text-stone-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* planos */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="section-title text-center">Planos simples, sem letra miúda</h2>
        <p className="mt-2 text-center text-sm text-stone-400">
          Mensalidade fixa por negócio. Nada de taxa por agendamento.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className={'card relative flex flex-col p-8 ' + (plan.highlight ? 'border-amber-500/60 bg-amber-500/5' : '')}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-bold text-stone-950">
                  MAIS ESCOLHIDO
                </span>
              )}
              <h3 className="font-serif text-xl font-bold uppercase tracking-wide text-stone-100">{plan.name}</h3>
              <p className="mt-3">
                <span className="font-serif text-4xl font-bold text-stone-100">{plan.price}</span>
                <span className="ml-1 text-sm text-stone-400">{plan.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-stone-300">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/registrar-empresa" className={'btn mt-8 w-full ' + (plan.highlight ? 'btn-primary' : 'btn-outline')}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-stone-400">
          <CreditCard className="mr-1 inline h-3.5 w-3.5" />
          Pagamento mensal por Pix — sem fidelidade, cancele quando quiser.
        </p>
      </section>

      {/* faq */}
      <section id="faq" className="border-y border-stone-800/70 bg-stone-900/30">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="section-title text-center">Dúvidas frequentes</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-semibold text-stone-100 marker:hidden group-open:text-amber-400">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm text-stone-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* cta final */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="card hero-pattern flex flex-col items-center gap-4 p-12 text-center">
          <Clock className="h-10 w-10 text-amber-500" />
          <h2 className="section-title">Seu negócio online em 1 minuto</h2>
          <p className="max-w-md text-sm text-stone-400">
            Cadastre-se, crie seus profissionais e comece a receber agendamentos hoje.
            14 dias de Pro grátis, sem cartão.
          </p>
          <Link href="/registrar-empresa" className="btn btn-primary px-10 py-3.5 text-base">
            Criar meu negócio grátis
          </Link>
        </div>
      </section>
    </div>
  )
}
