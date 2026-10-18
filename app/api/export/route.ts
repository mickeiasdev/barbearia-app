import { createClient } from '@/lib/supabase/server'
import { dateKey, monthRange, timeInSP } from '@/lib/tz'
import { PAYMENT_LABEL, STATUS_LABEL } from '@/lib/utils'
import type { AppointmentDetails, OrderWithItems } from '@/lib/types'

function csvEscape(value: string): string {
  return '"' + String(value).replace(/"/g, '""') + '"'
}

function toCsv(rows: string[][]): string {
  // BOM para o Excel reconhecer acentuação
  return '\uFEFF' + rows.map((r) => r.map(csvEscape).join(';')).join('\r\n')
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return new Response('Não autenticado', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return new Response('Sem permissão', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') === 'pedidos' ? 'pedidos' : 'agendamentos'
  const monthParam = searchParams.get('month') ?? ''
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : null
  const range = month ? monthRange(month) : null

  const rows: string[][] = []

  if (type === 'agendamentos') {
    let query = supabase
      .from('appointments')
      .select(
        '*, barber:barbers(full_name), service:services(name), client:profiles!appointments_client_id_fkey(full_name, phone)'
      )
      .order('starts_at')
      .limit(5000)
    if (range) query = query.gte('starts_at', range.start).lt('starts_at', range.end)

    const { data } = await query
    const appts = (data ?? []) as unknown as AppointmentDetails[]

    rows.push(['Data', 'Hora', 'Cliente', 'Telefone', 'Barbeiro', 'Serviço', 'Valor (R$)', 'Status'])
    appts.forEach((a) => {
      rows.push([
        dateKey(a.starts_at),
        timeInSP(a.starts_at),
        a.client?.full_name ?? '',
        a.client?.phone ?? '',
        a.barber?.full_name ?? '',
        a.service?.name ?? '',
        (a.price_cents / 100).toFixed(2).replace('.', ','),
        STATUS_LABEL[a.status] ?? a.status,
      ])
    })
  } else {
    let query = supabase
      .from('orders')
      .select('*, client:profiles!orders_client_id_fkey(full_name), order_items(product_name, quantity, unit_price_cents)')
      .order('created_at')
      .limit(5000)
    if (range) query = query.gte('created_at', range.start).lt('created_at', range.end)

    const { data } = await query
    const orders = (data ?? []) as unknown as OrderWithItems[]

    rows.push(['Data', 'Hora', 'Cliente', 'Itens', 'Total (R$)', 'Pagamento', 'Status'])
    orders.forEach((o) => {
      const items = (o.order_items ?? [])
        .map((i) => i.quantity + 'x ' + i.product_name)
        .join(', ')
      rows.push([
        dateKey(o.created_at),
        timeInSP(o.created_at),
        o.client?.full_name ?? 'Avulso',
        items,
        (o.total_cents / 100).toFixed(2).replace('.', ','),
        PAYMENT_LABEL[o.payment_method] ?? o.payment_method,
        STATUS_LABEL[o.status] ?? o.status,
      ])
    })
  }

  const filename = type + (month ? '-' + month : '')

  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + filename + '.csv"',
    },
  })
}
