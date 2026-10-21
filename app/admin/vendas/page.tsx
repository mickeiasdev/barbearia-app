import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requireAdminPage } from '@/lib/data'
import { formatBRL, PAYMENT_LABEL } from '@/lib/utils'
import { currentMonthKey, dateKey, dayStartISO, monthRange, nextDayStartISO, timeInSP, todayKey } from '@/lib/tz'
import { waLink } from '@/lib/whatsapp'
import PosTerminal from '@/components/admin/pos-terminal'
import ActionButton from '@/components/admin/action-button'
import { refundOrderAction } from '@/actions/admin'
import type { OrderWithItems, Product, Profile } from '@/lib/types'

export default async function AdminVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const rawQ = (sp.q ?? '').trim()
  // remove caracteres usados pela sintaxe do .or() do supabase
  const q = rawQ.replace(/[%_,()]/g, '')
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const perPage = 15

  const { supabase, establishment } = await requireAdminPage()

  if (!establishment) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="text-sm text-stone-400">Configure o estabelecimento primeiro.</p>
        <Link href="/admin/configuracoes" className="btn btn-primary mt-4">
          Ir para Configurações
        </Link>
      </div>
    )
  }

  const month = monthRange(currentMonthKey())
  const today = todayKey()
  const dayStart = dayStartISO(today)
  const dayEnd = nextDayStartISO(today)

  // busca por cliente: perfis que casam -> filtra os pedidos
  let matchedIds: string[] = []
  if (q) {
    const { data: matched } = await supabase
      .from('profiles')
      .select('id')
      .or('full_name.ilike.%' + q + '%,phone.ilike.%' + q + '%')
      .limit(50)
    matchedIds = (matched ?? []).map((m) => (m as { id: string }).id)
  }

  let ordersQuery = supabase
    .from('orders')
    .select(
      '*, client:profiles!orders_client_id_fkey(full_name, phone), order_items(product_name, quantity, unit_price_cents)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (q) {
    ordersQuery = ordersQuery.in(
      'client_id',
      matchedIds.length > 0 ? matchedIds : ['00000000-0000-0000-0000-000000000000']
    )
  }

  const [
    { data: productsData },
    { data: clientsData },
    { data: ordersData, count: ordersCount },
    { data: monthOrders },
    { data: todayOrdersData },
  ] = await Promise.all([
    supabase.from('products').select('*').eq('is_active', true).order('name'),
    supabase.from('profiles').select('id, full_name').in('role', ['client', 'barber']).order('full_name').limit(300),
    ordersQuery,
    supabase.from('orders').select('total_cents').gte('created_at', month.start).lt('created_at', month.end).eq('status', 'paid'),
    supabase
      .from('orders')
      .select('total_cents, payment_method, status')
      .gte('created_at', dayStart)
      .lt('created_at', dayEnd)
      .in('status', ['paid', 'cancelled']),
  ])

  const products = (productsData ?? []) as Product[]
  const clients = (clientsData ?? []) as Profile[]
  const orders = (ordersData ?? []) as unknown as Array<
    Omit<OrderWithItems, 'client'> & {
      discount_cents: number
      client?: { full_name: string; phone: string | null } | null
    }
  >
  const monthRevenue = (monthOrders ?? []).reduce(
    (acc, o) => acc + ((o as { total_cents: number }).total_cents ?? 0),
    0
  )

  // paginação do histórico
  const totalOrders = ordersCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalOrders / perPage))
  const hasPrev = page > 1
  const hasNext = page < totalPages
  const pageHref = (p: number) => '/admin/vendas?page=' + p + (rawQ ? '&q=' + encodeURIComponent(rawQ) : '')

  // caixa de hoje (pedidos pagos + estornados do dia)
  const todayRows = (todayOrdersData ?? []) as { total_cents: number; payment_method: string; status: string }[]
  const todayPaid = todayRows.filter((o) => o.status === 'paid')
  const todayCancelled = todayRows.filter((o) => o.status === 'cancelled')
  const todayTotal = todayPaid.reduce((acc, o) => acc + (o.total_cents ?? 0), 0)
  const todayRefunded = todayCancelled.reduce((acc, o) => acc + (o.total_cents ?? 0), 0)
  const paymentsBreakdown = (['pix', 'dinheiro', 'cartao'] as const).map((m) => ({
    method: m,
    total: todayPaid.filter((o) => o.payment_method === m).reduce((acc, o) => acc + (o.total_cents ?? 0), 0),
    count: todayPaid.filter((o) => o.payment_method === m).length,
  }))
  const todayLabel = today.split('-').reverse().slice(0, 2).join('/')

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Vendas</h1>
          <p className="mt-2 text-sm text-stone-400">
            PDV para vendas no balcão + histórico de pedidos (site e balcão).
          </p>
        </div>
        <div className="card px-5 py-3 text-right">
          <p className="text-xs uppercase tracking-wide text-stone-400">Vendas do mês</p>
          <p className="text-xl font-bold text-amber-500">{formatBRL(monthRevenue)}</p>
        </div>
      </div>

      {sp.ok === 'estornado' && (
        <div className="ok-box mt-6">Venda estornada e estoque devolvido.</div>
      )}
      {sp.erro && <div className="error-box mt-6">{sp.erro}</div>}

      {/* caixa do dia */}
      <section className="mt-8">
        <h2 className="font-serif text-lg font-bold uppercase tracking-tight text-stone-100">
          Caixa de hoje ({todayLabel})
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Total do dia</p>
            <p className="mt-2 text-2xl font-bold text-amber-500">{formatBRL(todayTotal)}</p>
            <p className="mt-0.5 text-[11px] text-stone-400">{todayPaid.length} venda(s) paga(s)</p>
          </div>
          {paymentsBreakdown.map((p) => (
            <div key={p.method} className="card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                {PAYMENT_LABEL[p.method]}
              </p>
              <p className="mt-2 text-2xl font-bold text-stone-100">{formatBRL(p.total)}</p>
              <p className="mt-0.5 text-[11px] text-stone-400">{p.count} venda(s)</p>
            </div>
          ))}
          {todayCancelled.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Estornados hoje</p>
              <p className="mt-2 text-2xl font-bold text-stone-100">{formatBRL(todayRefunded)}</p>
              <p className="mt-0.5 text-[11px] text-stone-400">{todayCancelled.length} pedido(s) estornado(s)</p>
            </div>
          )}
        </div>
      </section>

      {/* PDV */}
      <section className="card mt-8 p-6">
        <h2 className="mb-4 font-serif text-lg font-bold uppercase tracking-tight text-stone-100">
          Terminal de venda (PDV)
        </h2>
        <PosTerminal
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            price_cents: p.price_cents,
            stock: p.stock,
            category: p.category,
          }))}
          clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))}
        />
      </section>

      {/* busca por cliente (GET) */}
      <form action="/admin/vendas" method="GET" className="card mt-6 flex flex-wrap gap-3 p-4 sm:items-end">
        <input type="hidden" name="page" value="1" />
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="q">Buscar cliente</label>
          <input id="q" name="q" defaultValue={rawQ} placeholder="Nome ou telefone..." className="input" />
        </div>
        <button type="submit" className="btn btn-outline btn-sm">Buscar</button>
      </form>

      {/* histórico */}
      <section className="card mt-6 overflow-x-auto p-0">
        <table className="hidden w-full min-w-[720px] md:table">
          <thead>
            <tr className="border-b border-stone-800/80">
              <th className="table-head">Pedido</th>
              <th className="table-head">Data</th>
              <th className="table-head">Cliente</th>
              <th className="table-head">Itens</th>
              <th className="table-head">Pagamento</th>
              <th className="table-head">Total</th>
              <th className="table-head">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {orders.map((order) => {
              const waHref = order.client?.phone
                ? waLink(
                    order.client.phone,
                    'Recibo do pedido #' + order.id.slice(0, 8) + ': ' +
                      (order.order_items ?? []).map((it) => it.quantity + 'x ' + it.product_name).join(', ') +
                      ' — Total: ' + formatBRL(order.total_cents) + '. Obrigado!'
                  )
                : null
              return (
              <tr key={order.id}>
                <td className="table-cell">
                  <span className="font-mono text-xs text-amber-400">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className="ml-2 align-middle">
                    <span className={'badge ' + (order.status === 'paid'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-stone-700 bg-stone-800 text-stone-400')}>
                      {order.status === 'paid' ? 'Pago' : order.status}
                    </span>
                  </span>
                </td>
                <td className="table-cell">
                  {dateKey(order.created_at).split('-').reverse().join('/')}
                  <span className="text-xs text-stone-400"> {timeInSP(order.created_at)}</span>
                </td>
                <td className="table-cell">
                  {order.client?.full_name ?? <span className="text-stone-400">Avulso (balcão)</span>}
                </td>
                <td className="table-cell">
                  <details>
                    <summary className="cursor-pointer text-xs text-stone-400 hover:text-amber-400">
                      {(order.order_items ?? []).length} item(ns)
                    </summary>
                    <ul className="mt-1 space-y-0.5">
                      {(order.order_items ?? []).map((item, idx) => (
                        <li key={idx} className="text-xs text-stone-400">
                          {item.quantity}× {item.product_name} —{' '}
                          {formatBRL(item.unit_price_cents * item.quantity)}
                        </li>
                      ))}
                    </ul>
                  </details>
                </td>
                <td className="table-cell">{PAYMENT_LABEL[order.payment_method]}</td>
                <td className="table-cell font-semibold text-stone-100">
                  <p>{formatBRL(order.total_cents)}</p>
                  {order.discount_cents > 0 && (
                    <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-400">
                      -{formatBRL(order.discount_cents)}
                    </span>
                  )}
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    {order.status === 'paid' && (
                      <form action={refundOrderAction}>
                        <input type="hidden" name="id" value={order.id} />
                        <ActionButton className="btn btn-danger btn-sm" pendingLabel="Estornando..." confirmMessage="Estornar este pedido? O estoque dos itens será devolvido.">Estornar</ActionButton>
                      </form>
                    )}
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        aria-label="Enviar recibo por WhatsApp"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="table-cell py-10 text-center text-stone-400">
                  Nenhuma venda registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* cards mobile */}
        <div className="space-y-3 p-4 md:hidden">
          {orders.map((order) => {
            const waHref = order.client?.phone
              ? waLink(
                  order.client.phone,
                  'Recibo do pedido #' + order.id.slice(0, 8) + ': ' +
                    (order.order_items ?? []).map((it) => it.quantity + 'x ' + it.product_name).join(', ') +
                    ' — Total: ' + formatBRL(order.total_cents) + '. Obrigado!'
                )
              : null
            return (
              <div key={order.id} className="card flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-amber-400">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span className={'badge ' + (order.status === 'paid'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-stone-700 bg-stone-800 text-stone-400')}>
                    {order.status === 'paid' ? 'Pago' : order.status}
                  </span>
                  <span className="ml-auto text-xs text-stone-400">
                    {dateKey(order.created_at).split('-').reverse().join('/')}{' '}
                    {timeInSP(order.created_at)}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {(order.order_items ?? []).map((item, idx) => (
                    <li key={idx} className="text-xs text-stone-400">
                      {item.quantity}× {item.product_name} —{' '}
                      {formatBRL(item.unit_price_cents * item.quantity)}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Cliente</span>
                  <span className="text-stone-200">
                    {order.client?.full_name ?? <span className="text-stone-400">Avulso (balcão)</span>}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Pagamento</span>
                  <span className="text-stone-200">{PAYMENT_LABEL[order.payment_method]}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Total</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-stone-100">
                      {formatBRL(order.total_cents)}
                    </span>
                    {order.discount_cents > 0 && (
                      <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-400">
                        -{formatBRL(order.discount_cents)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-stone-800/60 pt-2">
                  {order.status === 'paid' && (
                    <form action={refundOrderAction}>
                      <input type="hidden" name="id" value={order.id} />
                      <ActionButton className="btn btn-danger btn-sm" pendingLabel="Estornando..." confirmMessage="Estornar este pedido? O estoque dos itens será devolvido.">Estornar</ActionButton>
                    </form>
                  )}
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      aria-label="Enviar recibo por WhatsApp"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )
          })}
          {orders.length === 0 && (
            <p className="py-10 text-center text-sm text-stone-400">
              Nenhuma venda registrada ainda.
            </p>
          )}
        </div>

          {(hasPrev || hasNext) && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-800/80 px-6 py-4">
              {hasPrev ? (
                <Link href={pageHref(page - 1)} className="btn btn-outline btn-sm">
                  <ChevronLeft className="h-4 w-4" /> Anteriores
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-stone-400">
                Página {page} de {totalPages} ({totalOrders} pedido(s))
              </span>
              {hasNext ? (
                <Link href={pageHref(page + 1)} className="btn btn-outline btn-sm">
                  Próxima <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
      </section>
    </div>
  )
}
