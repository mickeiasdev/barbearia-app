import type { Metadata } from 'next'
import { Check, CreditCard, ShieldCheck } from 'lucide-react'
import { getCurrentUser } from '@/lib/data'
import SubscribeButton from '@/components/subscribe-button'

export const metadata: Metadata = { title: 'Assinar' }

const PLANS = [
  {
    id: 'gratis',
    name: 'Grátis',
    price: 'R$ 0',
    period: 'para sempre',
    items: ['1 profissional', 'Agendamento online', 'Site do profissional', 'PDV com estoque'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 69',
    period: '/mês',
    items: [
      'Até 10 profissionais',
      'Tudo do Grátis',
      'Lembretes automáticos',
      'Avaliações e portfólio',
      'Pix antecipado do horário',
      'Relatórios e exportação',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$ 129',
    period: '/mês',
    items: [
      'Profissionais ilimitados',
      'Tudo do Pro',
      'Várias unidades',
      'Gerente por unidade',
      'Suporte prioritário',
    ],
  },
]

export default async function AssinarPage() {
  const user = await getCurrentUser()

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="section-title">Planos da sua barbearia</h1>
        <p className="mt-2 text-sm text-stone-400">
          Mensalidade fixa, sem taxa por agendamento. Pague por Pix — sem fidelidade.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isPro = plan.id === 'pro'
          const isBusiness = plan.id === 'business'
          return (
            <div
              key={plan.id}
              className={
                'card relative flex flex-col p-8 ' +
                (isPro ? 'border-amber-500/60 bg-amber-500/5' : '')
              }
            >
              {isPro && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-bold text-stone-950">
                  MAIS ESCOLHIDO
                </span>
              )}
              <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-stone-100">
                {plan.name}
              </h2>
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
              <div className="mt-8">
                {plan.id === 'gratis' ? (
                  <p className="text-center text-xs text-stone-400">
                    Plano padrão — sem necessidade de pagamento.
                  </p>
                ) : user ? (
                  <SubscribeButton
                    plan={plan.id as 'pro' | 'business'}
                    label={'Assinar ' + plan.name + ' por Pix'}
                    highlight={isPro}
                  />
                ) : (
                  <a href="/entrar?next=/assinar" className="btn btn-outline w-full">
                    Entrar para assinar
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-stone-400">
        <ShieldCheck className="h-4 w-4 text-amber-500" />
        Pagamento processado pelo Mercado Pago. Após o Pix, o plano é ativado automaticamente.
        <CreditCard className="h-4 w-4 text-amber-500" />
      </p>
    </main>
  )
}
