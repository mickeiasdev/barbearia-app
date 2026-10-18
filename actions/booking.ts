'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { friendlyDbError, formatBRL } from '@/lib/utils'
import { shortDateLabel, spDateTimeToUTC } from '@/lib/tz'
import { sendEmail, emailHtml } from '@/lib/email'
import type { Barber, Service } from '@/lib/types'

export interface BookingState {
  error?: string
}

export async function createAppointmentAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const serviceId = String(formData.get('servico') ?? '')
  const barberId = String(formData.get('barbeiro') ?? '')
  const dateKey = String(formData.get('data') ?? '')
  const time = String(formData.get('hora') ?? '')
  const notes = String(formData.get('notes') ?? '').trim() || null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: 'Data ou horário inválido.' }
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { error: 'Entre na sua conta para confirmar o agendamento.' }
  }

  // ===== REAGENDAMENTO =====
  // Substitui um agendamento ativo existente; a RPC valida dono,
  // status, serviço, jornada do barbeiro e conflitos no banco.
  const rescheduleId = String(formData.get('re') ?? '').trim() || null
  if (rescheduleId) {
    const { error } = await supabase.rpc('reschedule_appointment', {
      p_appointment_id: rescheduleId,
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_date: dateKey,
      p_time: time,
    })
    if (error) return { error: friendlyDbError(error.message) }

    const { data: bName } = await supabase
      .from('barbers')
      .select('full_name')
      .eq('id', barberId)
      .maybeSingle()

    await sendEmail(
      auth.user.email,
      'Atendimento reagendado',
      emailHtml('Atendimento reagendado!', [
        'Seu atendimento foi movido para <strong>' +
          shortDateLabel(dateKey) +
          ' às ' +
          time +
          '</strong>' +
          (bName ? ' com <strong>' + (bName as { full_name: string }).full_name + '</strong>' : '') +
          '.',
        'O horário anterior foi liberado automaticamente.',
      ])
    )

    revalidatePath('/minha-conta')
    redirect('/minha-conta?reagendado=1')
  }

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('is_active', true)
    .maybeSingle()
  if (!service) return { error: 'Serviço indisponível.' }
  const svc = service as Service

  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('id', barberId)
    .eq('is_active', true)
    .maybeSingle()
  if (!barber) return { error: 'Barbeiro indisponível.' }
  const brb = barber as Barber

  const { count } = await supabase
    .from('barber_services')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barberId)
    .eq('service_id', serviceId)
  if (!count) {
    return { error: 'Este barbeiro não executa o serviço selecionado.' }
  }

  const startsAt = spDateTimeToUTC(dateKey, time)
  const endsAt = new Date(startsAt.getTime() + svc.duration_min * 60000)
  if (startsAt.getTime() <= Date.now()) {
    return { error: 'Escolha um horário futuro.' }
  }

  // Revalida contra a mesma fonte de horários livres usada na UI.
  const { data: slotsData, error: slotsError } = await supabase.rpc(
    'get_available_slots',
    { p_barber_id: barberId, p_date: dateKey, p_duration_min: svc.duration_min }
  )
  if (slotsError) return { error: friendlyDbError(slotsError.message) }
  const slots = (slotsData as unknown as string[]) ?? []
  const stillFree = slots.some(
    (s) => new Date(s).getTime() === startsAt.getTime()
  )
  if (!stillFree) {
    return { error: 'Este horário acabou de ser ocupado. Por favor, escolha outro.' }
  }

  const { error } = await supabase.from('appointments').insert({
    establishment_id: brb.establishment_id,
    barber_id: barberId,
    service_id: serviceId,
    client_id: auth.user.id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    price_cents: svc.price_cents,
    notes,
    status: 'pending',
  })

  if (error) return { error: friendlyDbError(error.message) }

  await sendEmail(
    auth.user.email,
    'Agendamento recebido — ' + svc.name,
    emailHtml(
      'Agendamento recebido!',
      [
        'Olá! Registramos seu pedido de agendamento:',
        '<strong>' + svc.name + '</strong> com ' + brb.full_name,
        '<strong>' + shortDateLabel(dateKey) + ' às ' + time + '</strong> (horário de Brasília)',
        'Valor: ' + formatBRL(svc.price_cents) + ' — pagamento no local ou por Pix.',
        'Status: <em>pendente</em>. A barbearia irá confirmar em breve.',
      ],
      'Acompanhe em Minha Conta no site.'
    )
  )

  revalidatePath('/minha-conta')
  redirect('/minha-conta?agendado=1')
}

export interface CancelState {
  error?: string
  ok?: boolean
}

export async function cancelAppointmentAction(
  _prev: CancelState,
  formData: FormData
): Promise<CancelState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Agendamento inválido.' }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Sessão expirada. Entre novamente.' }

  // A policy RLS só permite cancelar o próprio agendamento futuro.
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('client_id', auth.user.id)

  if (error) return { error: friendlyDbError(error.message) }

  await sendEmail(
    auth.user.email,
    'Agendamento cancelado',
    emailHtml('Agendamento cancelado', [
      'Seu agendamento foi cancelado com sucesso.',
      'Quer remarcar? É só escolher um novo horário no site — leva menos de um minuto.',
    ])
  )

  revalidatePath('/minha-conta')
  return { ok: true }
}
