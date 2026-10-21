import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsApp } from '@/lib/whatsapp'
import { sendEmail, emailHtml } from '@/lib/email'
import { dayTimeLabel } from '@/lib/tz'

export const dynamic = 'force-dynamic'

/**
 * Tarefas diárias (cron 09:00 Brasília):
 * 1. Expira trials vencidos (trial → free).
 * 2. Envia lembretes de agendamentos das próximas 24h.
 * Protegido por CRON_SECRET (se configurado).
 * Pode ser chamado manualmente: /api/cron/lembretes?secret=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provided =
    request.headers.get('authorization')?.replace('Bearer ', '') ?? searchParams.get('secret')
  const secret = process.env.CRON_SECRET
  if (secret && provided !== secret) {
    return new Response('Proibido', { status: 403 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return new Response('SUPABASE_SERVICE_ROLE_KEY não configurada', { status: 503 })
  }

  // 1) trials vencidos voltam ao plano Grátis
  const { data: expired } = await supabase
    .from('establishments')
    .update({ plan: 'free', trial_ends_at: null })
    .eq('plan', 'trial')
    .lt('trial_ends_at', new Date().toISOString())
    .eq('is_company', true)
    .select('id')

  const now = new Date()
  const until = new Date(now.getTime() + 24 * 3600 * 1000)

  const { data: apptsData, error } = await supabase
    .from('appointments')
    .select(
      'id, starts_at, client:profiles!appointments_client_id_fkey(full_name, phone, email), ' +
        'barber:barbers(full_name), service:services(name), ' +
        'establishment:establishments(name, whatsapp)'
    )
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', now.toISOString())
    .lte('starts_at', until.toISOString())
    .is('reminder_sent_at', null)
    .limit(300)

  if (error) {
    return new Response('Erro ao buscar agendamentos: ' + error.message, { status: 500 })
  }

  const appts = (apptsData ?? []) as unknown as {
    id: string
    starts_at: string
    client: { full_name: string; phone: string | null; email: string | null } | null
    barber: { full_name: string } | null
    service: { name: string } | null
    establishment: { name: string; whatsapp: string | null } | null
  }[]

  let sent = 0
  for (const appt of appts) {
    const resumo =
      (appt.service?.name ?? 'atendimento') +
      ' com ' +
      (appt.barber?.full_name ?? 'seu barbeiro') +
      ' — ' +
      dayTimeLabel(appt.starts_at) +
      ' (horário de Brasília)'

    const message =
      'Olá, ' +
      (appt.client?.full_name?.split(' ')[0] ?? 'tudo bem?') +
      '! Lembrete do seu agendamento amanhã: ' +
      resumo +
      '. Até lá! — ' +
      (appt.establishment?.name ?? 'BarberPro')

    let delivered = false
    if (await sendWhatsApp(appt.client?.phone, message)) delivered = true

    if (appt.client?.email) {
      await sendEmail(
        appt.client.email,
        'Lembrete: seu agendamento é amanhã',
        emailHtml('Lembrete do seu horário ⏰', [
          'Não esqueça: <strong>' + resumo + '</strong>',
          'Se precisar remarcar ou cancelar, é só entrar em Minha Conta.',
        ])
      )
      delivered = true
    }

    if (delivered) {
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', appt.id)
      sent++
    } else {
      // sem telefone nem e-mail: marca para não repetir a tentativa
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', appt.id)
    }
  }

  return Response.json({ ok: true, trialsExpired: expired?.length ?? 0, checked: appts.length, sent })
}
