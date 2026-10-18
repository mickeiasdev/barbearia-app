import Link from 'next/link'
import { requireAdminPage } from '@/lib/data'
import { formatBRL, PAYMENT_LABEL } from '@/lib/utils'
import { currentMonthKey, dateKey, monthRange, timeInSP } from '@/lib/tz'
import PosTerminal from '@/components/admin/pos-terminal'
import type { OrderWithItems, Product, Profile } from '@/lib/types'

export default async function AdminVendasPage() {
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

  const [{ data: productsData }, { data: clientsData }, { data: ordersData }, { data: monthOrders }] =
    await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('profiles').select('id, full_name').in('role', ['client', 'barber']).order('full_name').limit(300),
      supabase
        .from('orders')
        .select('*, client:profiles!orders_client_id_fkey(full_name), order_items(product_name, quantity, unit_price_cents)')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('orders').select('total_cents').gte('created_at', month.start).lt('created_at', month.end).eq('status', 'paid'),
    ])

  const products = (productsData ?? []) as Product[]
  const clients = (clientsData ?? []) as Profile[]
  const orders = (ordersData ?? []) as unknown as OrderWithItems[]
  const monthRevenue = (monthOrders ?? []).reduce(
    (acc, o) => acc + ((o as { total_cents: number }).total_cents ?? 0),
    0
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Vendas</h1>
          <p className="mt-2 text-sm text-stone-500">
            PDV para vendas no balcão + histórico de pedidos (site e balcão).
          </p>
        </div>
        <div className="card px-5 py-3 text-right">
          <p className="text-xs uppercase tracking-wide text-stone-500">Vendas do mês</p>
          <p className="text-xl font-bold text-amber-500">{formatBRL(monthRevenue)}</p>
        </div>
      </div>

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

      {/* histórico */}
      <section className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-stone-800/80">
              <th className="table-head">Pedido</th>
              <th className="table-head">Data</th>
              <th className="table-head">Cliente</th>
              <th className="table-head">Itens</th>
              <th className="table-head">Pagamento</th>
              <th className="table-head">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {orders.map((order) => (
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
                  <span className="text-xs text-stone-600"> {timeInSP(order.created_at)}</span>
                </td>
                <td className="table-cell">
                  {order.client?.full_name ?? <span className="text-stone-600">Avulso (balcão)</span>}
                </td>
                <td className="table-cell">
                  <details>
                    <summary className="cursor-pointer text-xs text-stone-400 hover:text-amber-400">
                      {(order.order_items ?? []).length} item(ns)
                    </summary>
                    <ul className="mt-1 space-y-0.5">
                      {(order.order_items ?? []).map((item, idx) => (
                        <li key={idx} className="text-xs text-stone-500">
                          {item.quantity}× {item.product_name} —{' '}
                          {formatBRL(item.unit_price_cents * item.quantity)}
                        </li>
                      ))}
                    </ul>
                  </details>
                </td>
                <td className="table-cell">{PAYMENT_LABEL[order.payment_method]}</td>
                <td className="table-cell font-semibold text-stone-100">
                  {formatBRL(order.total_cents)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="table-cell py-10 text-center text-stone-500">
                  Nenhuma venda registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
