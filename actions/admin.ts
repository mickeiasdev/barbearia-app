'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdminAction, getEstablishment } from '@/lib/data'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { friendlyDbError, parsePriceToCents } from '@/lib/utils'
import { dayTimeLabel, shortDateLabel, spDateTimeToUTC } from '@/lib/tz'
import { sendEmail, emailHtml } from '@/lib/email'
import type { Barber, Establishment, Service } from '@/lib/types'

/** Envia uma imagem para o bucket público "media" e devolve a URL. */
async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  folder: string
): Promise<{ url: string } | { error: string }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Formato de imagem inválido (use JPG, PNG ou WebP).' }
  }
  if (file.size > 4 * 1024 * 1024) {
    return { error: 'Imagem muito grande (máximo 4MB).' }
  }
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = folder + '/' + crypto.randomUUID() + '.' + ext
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, { contentType: file.type })
  if (error) {
    return { error: 'Falha no upload da imagem: ' + error.message }
  }
  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return { url: data.publicUrl }
}

export interface AdminFormState {
  error?: string
  ok?: boolean
  notice?: string
}

// ============================================================
// ESTABELECIMENTO
// ============================================================
export async function saveEstablishmentAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const supabase = await requireAdminAction()
  if (!supabase) return { error: 'Sem permissão.' }

  const id = String(formData.get('id') ?? '').trim() || null
  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim() || null
  const phone = String(formData.get('phone') ?? '').trim() || null
  const whatsapp = String(formData.get('whatsapp') ?? '').trim() || null
  const instagram = String(formData.get('instagram') ?? '').trim() || null
  const openingTime = String(formData.get('opening_time') ?? '09:00')
  const closingTime = String(formData.get('closing_time') ?? '19:00')
  const step = Number(formData.get('slot_step_min') ?? 15)

  if (!name) return { error: 'Informe o nome da barbearia.' }
  if (openingTime >= closingTime) return { error: 'O horário de abertura deve ser antes do fechamento.' }
  if (!Number.isInteger(step) || step < 5 || step > 60) {
    return { error: 'O intervalo entre horários deve ficar entre 5 e 60 minutos.' }
  }

  const values = {
    name,
    address,
    phone,
    whatsapp,
    instagram,
    pix_key: String(formData.get('pix_key') ?? '').trim() || null,
    opening_time: openingTime,
    closing_time: closingTime,
    slot_step_min: step,
  }

  const { error } = id
    ? await supabase.from('establishments').update(values).eq('id', id)
    : await supabase.from('establishments').insert(values)

  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath('/', 'layout')
  return { ok: true }
}

// ============================================================
// BARBEIROS
// ============================================================
export async function saveBarberAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const supabase = await requireAdminAction()
  if (!supabase) return { error: 'Sem permissão.' }

  const establishment = (await getEstablishment()) as Establishment | null
  if (!establishment) {
    return { error: 'Configure o estabelecimento em Configurações antes de cadastrar barbeiros.' }
  }

  const id = String(formData.get('id') ?? '').trim() || null
  const fullName = String(formData.get('full_name') ?? '').trim()
  const bio = String(formData.get('bio') ?? '').trim() || null
  let photoUrl = String(formData.get('photo_url') ?? '').trim() || null
  const commission = Number(formData.get('commission_pct') ?? 0)
  const isActive = formData.get('is_active') !== null
  const profileId = String(formData.get('profile_id') ?? '').trim() || null
  const serviceIds = formData.getAll('service_ids').map(String)

  if (!fullName) return { error: 'Informe o nome do barbeiro.' }
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    return { error: 'A comissão deve estar entre 0 e 100%.' }
  }

  // upload de foto direto do computador (Supabase Storage)
  const photoFile = formData.get('photo_file')
  if (photoFile instanceof File && photoFile.size > 0) {
    const uploaded = await uploadImage(supabase, photoFile, 'barbers')
    if ('error' in uploaded) return { error: uploaded.error }
    photoUrl = uploaded.url
  }

  const values = {
    full_name: fullName,
    bio,
    photo_url: photoUrl,
    commission_pct: commission,
    is_active: isActive,
    profile_id: profileId,
  }

  let barberId = id
  if (id) {
    const { error } = await supabase.from('barbers').update(values).eq('id', id)
    if (error) return { error: friendlyDbError(error.message) }
  } else {
    const { data, error } = await supabase
      .from('barbers')
      .insert({ ...values, establishment_id: establishment.id })
      .select('id')
      .single()
    if (error) return { error: friendlyDbError(error.message) }
    barberId = (data as { id: string }).id
  }

  // vínculo de login: promove a conta vinculada a 'barber' (sem rebaixar admins)
  if (profileId) {
    await supabase
      .from('profiles')
      .update({ role: 'barber' })
      .eq('id', profileId)
      .eq('role', 'client')
  }

  // serviços executados
  await supabase.from('barber_services').delete().eq('barber_id', barberId)
  if (serviceIds.length > 0) {
    const { error } = await supabase
      .from('barber_services')
      .insert(serviceIds.map((sid) => ({ barber_id: barberId, service_id: sid })))
    if (error) return { error: friendlyDbError(error.message) }
  }

  // jornada semanal (até 2 janelas por dia, ex.: manhã e tarde)
  await supabase.from('barber_schedules').delete().eq('barber_id', barberId)
  const rows: { barber_id: string; weekday: number; start_time: string; end_time: string }[] = []
  const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  for (let d = 0; d <= 6; d++) {
    if (formData.get('enabled_' + d) === null) continue
    for (const w of ['1', '2']) {
      const start = String(formData.get('start_' + d + '_' + w) ?? '')
      const end = String(formData.get('end_' + d + '_' + w) ?? '')
      if (!start && !end) continue
      if (!start || !end || start >= end) {
        return { error: 'Janela de horário inválida na ' + dayNames[d] + '.' }
      }
      rows.push({ barber_id: barberId as string, weekday: d, start_time: start, end_time: end })
    }
  }
  if (rows.length > 0) {
    const { error } = await supabase.from('barber_schedules').insert(rows)
    if (error) return { error: friendlyDbError(error.message) }
  }

  revalidatePath('/admin/barbeiros')
  revalidatePath('/barbeiros')
  revalidatePath('/agendar')
  return rows.length === 0
    ? { ok: true, notice: 'Barbeiro salvo, mas sem dias de trabalho — edite a escala para liberar horários.' }
    : { ok: true }
}

export async function toggleBarberAction(formData: FormData) {
  const supabase = await requireAdminAction()
  if (!supabase) redirect('/entrar?next=/admin')
  const id = String(formData.get('id') ?? '')

  const { data } = await supabase.from('barbers').select('is_active').eq('id', id).maybeSingle()
  const current = (data as { is_active: boolean } | null)?.is_active ?? false

  await supabase.from('barbers').update({ is_active: !current }).eq('id', id)
  revalidatePath('/admin/barbeiros')
  revalidatePath('/barbeiros')
  revalidatePath('/agendar')
  redirect('/admin/barbeiros?ok=1')
}

export async function deleteBarberAction(formData: FormData) {
  const supabase = await requireAdminAction()
  if (!supabase) redirect('/entrar?next=/admin')
  const id = String(formData.get('id') ?? '')

  const { error } = await supabase.from('barbers').delete().eq('id', id)
  if (error) {
    const msg = /foreign key|violates/i.test(error.message)
      ? 'Não é possível excluir: existem agendamentos vinculados. Desative o barbeiro.'
      : friendlyDbError(error.message)
    redirect('/admin/barbeiros?erro=' + encodeURIComponent(msg))
  }
  revalidatePath('/admin/barbeiros')
  revalidatePath('/barbeiros')
  revalidatePath('/agendar')
  redirect('/admin/barbeiros?ok=1')
}

// ============================================================
// SERVIÇOS
// ============================================================
export async function saveServiceAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const supabase = await requireAdminAction()
  if (!supabase) return { error: 'Sem permissão.' }

  const establishment = (await getEstablishment()) as Establishment | null
  if (!establishment) {
    return { error: 'Configure o estabelecimento em Configurações primeiro.' }
  }

  const id = String(formData.get('id') ?? '').trim() || null
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const priceCents = parsePriceToCents(String(formData.get('price') ?? ''))
  const durationMin = parseInt(String(formData.get('duration_min') ?? ''), 10)
  const isActive = formData.get('is_active') !== null

  if (!name) return { error: 'Informe o nome do serviço.' }
  if (priceCents === null) return { error: 'Preço inválido. Use o formato 45,90.' }
  if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 480) {
    return { error: 'A duração deve ficar entre 5 e 480 minutos.' }
  }

  const values = { name, description, price_cents: priceCents, duration_min: durationMin, is_active: isActive }

  const { error } = id
    ? await supabase.from('services').update(values).eq('id', id)
    : await supabase.from('services').insert({ ...values, establishment_id: establishment.id })

  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath('/admin/servicos')
  revalidatePath('/servicos')
  revalidatePath('/agendar')
  revalidatePath('/')
  return { ok: true }
}

export async function toggleServiceAction(formData: FormData) {
  const supabase = await requireAdminAction()
  if (!supabase) redirect('/entrar?next=/admin')
  const id = String(formData.get('id') ?? '')

  const { data } = await supabase.from('services').select('is_active').eq('id', id).maybeSingle()
  const current = (data as { is_active: boolean } | null)?.is_active ?? false

  await supabase.from('services').update({ is_active: !current }).eq('id', id)
  revalidatePath('/admin/servicos')
  revalidatePath('/servicos')
  revalidatePath('/agendar')
  revalidatePath('/')
  redirect('/admin/servicos?ok=1')
}

export async function deleteServiceAction(formData: FormData) {
  const supabase = await requireAdminAction()
  if (!supabase) redirect('/entrar?next=/admin')
  const id = String(formData.get('id') ?? '')

  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) {
    const msg = /foreign key|violates/i.test(error.message)
      ? 'Não é possível excluir: existem agendamentos vinculados. Desative o serviço.'
      : friendlyDbError(error.message)
    redirect('/admin/servicos?erro=' + encodeURIComponent(msg))
  }
  revalidatePath('/admin/servicos')
  revalidatePath('/servicos')
  revalidatePath('/agendar')
  revalidatePath('/')
  redirect('/admin/servicos?ok=1')
}

// ============================================================
// PRODUTOS
// ============================================================
export async function saveProductAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const supabase = await requireAdminAction()
  if (!supabase) return { error: 'Sem permissão.' }

  const establishment = (await getEstablishment()) as Establishment | null
  if (!establishment) {
    return { error: 'Configure o estabelecimento em Configurações primeiro.' }
  }

  const id = String(formData.get('id') ?? '').trim() || null
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const category = String(formData.get('category') ?? '').trim() || null
  let imageUrl = String(formData.get('image_url') ?? '').trim() || null
  const priceCents = parsePriceToCents(String(formData.get('price') ?? ''))
  const stock = parseInt(String(formData.get('stock') ?? '0'), 10)
  const isActive = formData.get('is_active') !== null

  if (!name) return { error: 'Informe o nome do produto.' }
  if (priceCents === null) return { error: 'Preço inválido. Use o formato 45,90.' }
  if (!Number.isInteger(stock) || stock < 0) return { error: 'Estoque inválido.' }

  // upload de imagem direto do computador (Supabase Storage)
  const imageFile = formData.get('image_file')
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadImage(supabase, imageFile, 'products')
    if ('error' in uploaded) return { error: uploaded.error }
    imageUrl = uploaded.url
  }

  const values = {
    name,
    description,
    category,
    image_url: imageUrl,
    price_cents: priceCents,
    stock,
    is_active: isActive,
  }

  const { error } = id
    ? await supabase.from('products').update(values).eq('id', id)
    : await supabase.from('products').insert({ ...values, establishment_id: establishment.id })

  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath('/admin/produtos')
  revalidatePath('/loja')
  revalidatePath('/')
  return { ok: true }
}

export async function toggleProductAction(formData: FormData) {
  const supabase = await requireAdminAction()
  if (!supabase) redirect('/entrar?next=/admin')
  const id = String(formData.get('id') ?? '')

  const { data } = await supabase.from('products').select('is_active').eq('id', id).maybeSingle()
  const current = (data as { is_active: boolean } | null)?.is_active ?? false

  await supabase.from('products').update({ is_active: !current }).eq('id', id)
  revalidatePath('/admin/produtos')
  revalidatePath('/loja')
  revalidatePath('/')
  redirect('/admin/produtos?ok=1')
}

export async function deleteProductAction(formData: FormData) {
  const supabase = await requireAdminAction()
  if (!supabase) redirect('/entrar?next=/admin')
  const id = String(formData.get('id') ?? '')

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) {
    redirect('/admin/produtos?erro=' + encodeURIComponent(friendlyDbError(error.message)))
  }
  revalidatePath('/admin/produtos')
  revalidatePath('/loja')
  revalidatePath('/')
  redirect('/admin/produtos?ok=1')
}

// ============================================================
// AGENDAMENTOS
// ============================================================
export async function setAppointmentStatusAction(formData: FormData) {
  const supabase = await requireAdminAction()
  if (!supabase) redirect('/entrar?next=/admin')

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  const back = String(formData.get('back') ?? '/admin/agendamentos') || '/admin/agendamentos'

  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
    redirect(back + (back.includes('?') ? '&' : '?') + 'erro=' + encodeURIComponent('Status inválido.'))
  }

  // dados para o e-mail ao cliente (busca antes da alteração)
  const { data: apptData } = await supabase
    .from('appointments')
    .select(
      'starts_at, client:profiles!appointments_client_id_fkey(email, full_name), service:services(name), barber:barbers(full_name)'
    )
    .eq('id', id)
    .maybeSingle()
  const appt = apptData as unknown as
    | {
        starts_at: string
        client: { email: string | null; full_name: string } | null
        service: { name: string } | null
        barber: { full_name: string } | null
      }
    | null

  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) {
    redirect(back + (back.includes('?') ? '&' : '?') + 'erro=' + encodeURIComponent(friendlyDbError(error.message)))
  }

  // notifica o cliente conforme o novo status
  if (appt?.client?.email) {
    const resumo =
      (appt.service?.name ?? 'atendimento') +
      ' com ' +
      (appt.barber?.full_name ?? 'nosso barbeiro') +
      ' — ' +
      dayTimeLabel(appt.starts_at)

    if (status === 'confirmed') {
      await sendEmail(
        appt.client.email,
        'Agendamento confirmado ✔',
        emailHtml('Agendamento confirmado!', [
          'Seu atendimento foi <strong>confirmado</strong>:',
          '<strong>' + resumo + '</strong>',
          'Até lá! Se precisar reagendar ou cancelar, é só entrar em Minha Conta.',
        ])
      )
    } else if (status === 'cancelled') {
      await sendEmail(
        appt.client.email,
        'Agendamento cancelado',
        emailHtml('Agendamento cancelado', [
          'Seu atendimento foi cancelado pela barbearia:',
          resumo,
          'Quer remarcar? Escolha um novo horário no site quando quiser.',
        ])
      )
    } else if (status === 'completed') {
      await sendEmail(
        appt.client.email,
        'Atendimento concluído — obrigado!',
        emailHtml('Obrigado pela visita!', [
          'Seu atendimento foi concluído:',
          resumo,
          'Esperamos você de volta em breve! Já pode agendar o próximo corte no site.',
        ])
      )
    }
  }

  revalidatePath('/admin/agendamentos')
  revalidatePath('/admin')
  redirect(back + (back.includes('?') ? '&' : '?') + 'ok=1')
}

export async function adminCreateAppointmentAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const supabase = await requireAdminAction()
  if (!supabase) return { error: 'Sem permissão.' }

  const clientId = String(formData.get('client_id') ?? '').trim()
  const serviceId = String(formData.get('service_id') ?? '').trim()
  const barberId = String(formData.get('barber_id') ?? '').trim()
  const dateKey = String(formData.get('data') ?? '')
  const time = String(formData.get('hora') ?? '')
  const notes = String(formData.get('notes') ?? '').trim() || null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: 'Data ou horário inválido.' }
  }

  const { data: client } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return { error: 'Cliente não encontrado.' }

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .maybeSingle()
  if (!service) return { error: 'Serviço não encontrado.' }
  const svc = service as Service

  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('id', barberId)
    .maybeSingle()
  if (!barber) return { error: 'Barbeiro não encontrado.' }
  const brb = barber as Barber

  const startsAt = spDateTimeToUTC(dateKey, time)
  const endsAt = new Date(startsAt.getTime() + svc.duration_min * 60000)
  if (startsAt.getTime() <= Date.now()) {
    return { error: 'Escolha um horário futuro.' }
  }

  const { data: slotsData } = await supabase.rpc('get_available_slots', {
    p_barber_id: barberId,
    p_date: dateKey,
    p_duration_min: svc.duration_min,
  })
  const slots = (slotsData as unknown as string[]) ?? []
  if (!slots.some((s) => new Date(s).getTime() === startsAt.getTime())) {
    return { error: 'Este horário não está disponível para o barbeiro escolhido.' }
  }

  const { error } = await supabase.from('appointments').insert({
    establishment_id: brb.establishment_id,
    barber_id: barberId,
    service_id: serviceId,
    client_id: clientId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    price_cents: svc.price_cents,
    notes,
    status: 'confirmed',
  })
  if (error) return { error: friendlyDbError(error.message) }

  // avisa o cliente que a barbearia criou o atendimento para ele
  const clientRow = client as { email: string | null; full_name: string } | null
  if (clientRow?.email) {
    await sendEmail(
      clientRow.email,
      'Agendamento criado para você',
      emailHtml(
        'Um agendamento foi criado para você!',
        [
          'A barbearia agendou um atendimento no seu nome:',
          '<strong>' + svc.name + '</strong> com ' + brb.full_name,
          '<strong>' + shortDateLabel(dateKey) + ' às ' + time + '</strong> (horário de Brasília)',
          'Já está <strong>confirmado</strong> — pagamento no local ou por Pix.',
        ],
        'Detalhes em Minha Conta no site.'
      )
    )
  }

  revalidatePath('/admin/agendamentos')
  revalidatePath('/admin')
  redirect('/admin/agendamentos?data=' + dateKey + '&ok=agendado')
}

// ============================================================
// VENDAS / PDV
// ============================================================
export interface PosState {
  error?: string
  ok?: boolean
  orderId?: string
  totalCents?: number
}

export async function adminPlaceOrderAction(
  _prev: PosState,
  formData: FormData
): Promise<PosState> {
  const supabase = await requireAdminAction()
  if (!supabase) return { error: 'Sem permissão.' }

  let items: { product_id: string; quantity: number }[] = []
  try {
    const parsed = JSON.parse(String(formData.get('items') ?? '[]'))
    if (Array.isArray(parsed)) items = parsed
  } catch {
    // trata como vazio
  }
  if (items.length === 0) return { error: 'Adicione pelo menos um produto.' }

  const clientId = String(formData.get('client_id') ?? '').trim() || null
  const paymentMethod = String(formData.get('payment_method') ?? 'pix')
  if (!['pix', 'dinheiro', 'cartao'].includes(paymentMethod)) {
    return { error: 'Forma de pagamento inválida.' }
  }

  const { data, error } = await supabase.rpc('place_order', {
    p_items: items,
    p_client_id: clientId,
    p_payment_method: paymentMethod,
  })
  if (error) return { error: friendlyDbError(error.message) }

  const displayTotal = Number(formData.get('display_total') ?? 0) || 0

  revalidatePath('/admin/vendas')
  revalidatePath('/admin/produtos')
  revalidatePath('/admin')
  return { ok: true, orderId: String(data), totalCents: displayTotal }
}
