import Link from 'next/link'
import type { Metadata } from 'next'
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
  Users,
} from 'lucide-react'
import { APP_NAME } from '@/lib/utils'

export const metadata: Metadata = { title: 'Sistema para barbearias — comece grátis' }

function BrowserMock({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-700/80 bg-stone-900 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 border-b border-stone-800 bg-stone-950 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-amber-500/70" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 rounded bg-stone-800 px-3 py-0.5 font-mono text-[10px] text-stone-400">
          seubarbeiro.seudominio.com
        </span>
      </div>
      {children}
    </div>
  )
}

const FEATURES = [
  { icon: Calendar, title: 'Agendamento online', text: 'Horários livres em tempo real, sem conflito — à prova de corrida.' },
  { icon: Store, title: 'Site próprio por barbeiro', text: 'Cada profissional com endereço próprio, layout escolhível e zero concorrente na tela.' },
  { icon: QrCode, title: 'Pix direto, 0% de taxa', text: 'O pagamento cai na conta do barbeiro, sem intermediário, sem repasse.' },
  { icon: Smartphone, title: 'PDV no celular', text: 'Venda produtos no balcão com baixa de estoque, desconto e recibo por WhatsApp.' },
  { icon: Star, title: 'Avaliações com nota', text: 'Cliente avalia o atendimento; a nota aparece no site do profissional.' },
  { icon: MessageCircle, title: 'Lembretes automáticos', text: 'WhatsApp e e-mail 24h antes — menos furo na agenda.' },
  { icon: LineChart, title: 'Relatórios e comissões', text: 'Receita, top serviços e comissão de cada barbeiro, prontos para pagar.' },
  { icon: ShieldCheck, title: 'Cada um no seu quadrado', text: 'Barbeiro vê só os dados dele; o dono vê a barbearia; você vê tudo (ou nada).' },
]

const PLANS = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    period: 'para sempre',
    highlight: false,
    items: ['1 profissional', 'Agendamento online', 'Site do profissional', 'Pix na hora do atendimento', 'PDV com estoque'],
    cta: 'Começar grátis',
  },
  {
    name: 'Pro',
    price: 'R$ 69',
    period: '/mês',
    highlight: true,
    items: ['Até 10 profissionais', 'Tudo do Grátis', 'Lembretes automáticos (e-mail/WhatsApp)', 'Avaliações e portfólio', 'Pix antecipado do horário', 'Relatórios e exportação'],
    cta: 'Testar 14 dias grátis',
  },
  {
    name: 'Business',
    price: 'R$ 129',
    period: '/mês',
    highlight: false,
    items: ['Profissionais ilimitados', 'Tudo do Pro', 'Várias unidades (multi-loja)', 'Gerente por unidade', 'Suporte prioritário'],
    cta: 'Falar com a gente',
  },
]

const FAQ = [
  {
    q: 'Cobram taxa por agendamento?',
    a: 'Não. Você paga a mensalidade do plano — cada corte, barba e venda é 100% seu. O Pix vai direto da conta do cliente para a conta do barbeiro.',
  },
  {
    q: 'Meus barbeiros competem entre si no site?',
    a: 'Não. Cada profissional tem um endereço próprio (ex.: lucas.suabarbearia.com) que mostra só o trabalho dele. A página da barbearia apresenta a equipe — cada um com o link do seu site.',
  },
  {
    q: 'Consigo usar só com meu celular?',
    a: 'Sim. O painel, o PDV e o agendamento funcionam no navegador do celular, com visual adaptado. Não precisa instalar nada.',
  },
  {
    q: 'O que acontece depois dos 14 dias de teste?',
    a: 'Você escolhe: continua no Grátis (1 profissional) ou assina o Pro. Nada é apagado — agenda, clientes e vendas ficam intactos.',
  },
  {
    q: 'Dá para importar meus clientes atuais?',
    a: 'Sim — e cada barbeiro mantém a própria carteira dentro do sistema, com histórico, gastos e faltas.',
  },
]

export default function VenderPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 antialiased">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-stone-800/70 bg-stone-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
              <Store className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-bold uppercase tracking-wide text-stone-100">
              {APP_NAME}
            </span>
          </span>
          <nav className="hidden items-center gap-6 text-sm text-stone-400 md:flex">
            <a href="#recursos" className="hover:text-amber-400">Recursos</a>
            <a href="#planos" className="hover:text-amber-400">Planos</a>
            <a href="#faq" className="hover:text-amber-400">Dúvidas</a>
          </nav>
          <Link href="/registrar-empresa" className="btn btn-primary btn-sm">
            Criar minha barbearia
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="hero-pattern border-b border-stone-800/70">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-24">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
            <ShieldCheck className="h-3.5 w-3.5" /> 14 dias de Pro grátis — sem cartão
          </p>
          <h1 className="mx-auto max-w-3xl font-serif text-4xl font-bold uppercase leading-tight tracking-tight text-stone-100 md:text-6xl">
            O sistema completo da sua barbearia —{' '}
            <span className="text-amber-500">sem taxa por corte</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-400">
            Agendamento online, site próprio para cada barbeiro, PDV, Pix direto na sua conta,
            avaliações e relatórios. Tudo em um só lugar, funcionando no celular.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/registrar-empresa" className="btn btn-primary px-8 py-3.5 text-base">
              Criar minha barbearia grátis
            </Link>
            <a href="#recursos" className="btn btn-outline px-8 py-3.5 text-base">
              Ver como funciona
            </a>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { value: '0%', label: 'de taxa por agendamento' },
              { value: '100%', label: 'do Pix na conta do barbeiro' },
              { value: '1 min', label: 'para o cliente agendar' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className="font-serif text-3xl font-bold text-amber-500">{stat.value}</p>
                <p className="mt-1 text-xs text-stone-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* mockups */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="section-title text-center">Veja ele funcionando</h2>
        <p className="mt-2 text-center text-sm text-stone-400">
          Painel de dono, site do barbeiro e agendamento — tudo responsivo.
        </p>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* dashboard */}
          <div>
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-400">
              Painel do dono
            </p>
            <BrowserMock>
              <div className="space-y-3 p-4">
                <div className="flex gap-2">
                  <div className="h-16 flex-1 rounded-lg bg-amber-500/15 p-2">
                    <div className="h-1.5 w-10 rounded bg-amber-500/60" />
                    <div className="mt-2 h-3 w-14 rounded bg-stone-600" />
                  </div>
                  <div className="h-16 flex-1 rounded-lg bg-stone-800 p-2">
                    <div className="h-1.5 w-8 rounded bg-stone-600" />
                    <div className="mt-2 h-3 w-12 rounded bg-stone-700" />
                  </div>
                  <div className="h-16 flex-1 rounded-lg bg-stone-800 p-2">
                    <div className="h-1.5 w-9 rounded bg-stone-600" />
                    <div className="mt-2 h-3 w-10 rounded bg-stone-700" />
                  </div>
                </div>
                <div className="rounded-lg border border-stone-800 p-2">
                  <div className="flex items-center justify-between py-1.5">
                    <div className="h-2 w-20 rounded bg-stone-600" />
                    <div className="h-2 w-8 rounded bg-emerald-500/60" />
                  </div>
                  <div className="flex items-center justify-between border-t border-stone-800 py-1.5">
                    <div className="h-2 w-16 rounded bg-stone-700" />
                    <div className="h-2 w-8 rounded bg-amber-500/60" />
                  </div>
                </div>
                <div className="flex h-20 items-end gap-1.5 rounded-lg bg-stone-800/60 p-2">
                  {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                    <span key={i} className="flex-1 rounded-t bg-amber-500/50" style={{ height: h + '%' }} />
                  ))}
                </div>
              </div>
            </BrowserMock>
          </div>
          {/* site do barbeiro */}
          <div>
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-400">
              Site do barbeiro (3 layouts)
            </p>
            <BrowserMock>
              <div className="p-0">
                <div className="flex h-24 items-end justify-between bg-gradient-to-t from-stone-900 to-stone-800 p-3">
                  <div className="space-y-1.5">
                    <div className="h-2 w-12 rounded bg-stone-600" />
                    <div className="h-3.5 w-28 rounded bg-stone-500" />
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-500/60" />
                </div>
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-stone-800 p-2">
                      <div className="h-2 w-16 rounded bg-stone-600" />
                      <div className="h-2 w-8 rounded bg-amber-500/70" />
                    </div>
                  ))}
                </div>
              </div>
            </BrowserMock>
          </div>
          {/* agendamento */}
          <div>
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-400">
              Agendamento do cliente
            </p>
            <BrowserMock>
              <div className="space-y-3 p-4">
                <div className="flex justify-center gap-2">
                  {['P', 'S', 'T'].map((d) => (
                    <span key={d} className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-amber-500/60 bg-amber-500/10 text-[10px] font-bold text-amber-400">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {['09:00', '10:30', '14:00', '16:30'].map((h, i) => (
                    <span key={h} className={'rounded border px-2 py-1 font-mono text-[10px] ' + (i === 1 ? 'border-amber-500 bg-amber-500 text-stone-950' : 'border-stone-700 text-stone-400')}>
                      {h}
                    </span>
                  ))}
                </div>
                <div className="rounded-lg bg-amber-500 py-2 text-center text-xs font-bold text-stone-950">
                  Confirmar agendamento
                </div>
              </div>
            </BrowserMock>
          </div>
        </div>
      </section>

      {/* recursos */}
      <section id="recursos" className="border-y border-stone-800/70 bg-stone-900/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="section-title text-center">Tudo que a barbearia precisa</h2>
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
          Mensalidade fixa por barbearia. Nada de taxa por agendamento.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                'card relative flex flex-col p-8 ' +
                (plan.highlight ? 'border-amber-500/60 bg-amber-500/5' : '')
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-bold text-stone-950">
                  MAIS ESCOLHIDO
                </span>
              )}
              <h3 className="font-serif text-xl font-bold uppercase tracking-wide text-stone-100">
                {plan.name}
              </h3>
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
              <Link
                href="/registrar-empresa"
                className={'btn mt-8 w-full ' + (plan.highlight ? 'btn-primary' : 'btn-outline')}
              >
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
          <h2 className="section-title">Sua barbearia online em 1 minuto</h2>
          <p className="max-w-md text-sm text-stone-400">
            Cadastre-se, crie seus barbeiros e comece a receber agendamentos hoje mesmo.
            14 dias de Pro grátis, sem cartão.
          </p>
          <Link href="/registrar-empresa" className="btn btn-primary px-10 py-3.5 text-base">
            Criar minha barbearia grátis
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-stone-800/70 py-8 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {APP_NAME} — Sistema para barbearias e profissionais independentes.
      </footer>
    </div>
  )
}
