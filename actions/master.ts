'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { MASTER_WS_COOKIE, isPlatformAdmin } from '@/lib/data'
import { friendlyDbError } from '@/lib/utils'
import type { Establishment } from '@/lib/types'

export interface MasterState {
  error?: string
  ok?: boolean
  notice?: string
}

/** Exige sessão de admin MASTER da plataforma (não é qualquer admin). */
async function requireMaster() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') return null
  if (!(await isPlatformAdmin(supabase))) return null
  return { supabase, userId: auth.user.id }
}

/** Slug único a partir do nome (padrão do app). */
async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, name: string, fallbackId: string): Promise<string> {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (slug.length < 2) slug = 'espaco'
  let base = slug
  let n = 1
  // verifica disponibilidade até achar um slug livre
  for (;;) {
    const { data } = await supabase
      .from('establishments')
      .select('id')
      .eq('slug', slug)
      .limit(1)
    if (!data || data.length === 0) return slug
    n += 1
    slug = base + '-' + n
    if (n > 50) {
      base = base + '-' + fallbackId.slice(0, 4)
      n = 1
    }
  }
}

/**
 * Cadastro de barbeiro pelo MASTER:
 * cria o LOGIN (e-mail + senha), o espaço de trabalho dele
 * (com o local informado ou copiado de outro espaço) e o registro
 * de barbeiro já vinculado. Requer SUPABASE_SERVICE_ROLE_KEY para
 * criar o login.
 */
export async function masterCreateBarberAction(
  _prev: MasterState,
  formData: FormData
): Promise<MasterState> {
  const master = await requireMaster()
  if (!master) return { error: 'Sem permissão — apenas o administrador master cadastra barbeiros.' }
  const { supabase } = master

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const phone = String(formData.get('phone') ?? '').trim() || null
  const bio = String(formData.get('bio') ?? '').trim() || null
  const commission = Number(formData.get('commission_pct') ?? 100)

  if (!name) return { error: 'Informe o nome do barbeiro.' }
  if (!email.includes('@')) return { error: 'Informe um e-mail válido para o login.' }
  if (password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    return { error: 'A comissão deve estar entre 0 e 100%.' }
  }

  // ===== local de trabalho =====
  const baseEstId = String(formData.get('base_establishment_id') ?? '').trim()
  let unitName = ''
  let unitAddress: string | null = null
  let unitWhatsapp: string | null = null
  let unitPhone: string | null = null
  let unitPix: string | null = null

  if (baseEstId) {
    // copia o local de um espaço existente
    const { data: baseEst } = await supabase
      .from('establishments')
      .select('*')
      .eq('id', baseEstId)
      .maybeSingle()
    const est = baseEst as Establishment | null
    if (!est) return { error: 'Espaço base não encontrado.' }
    unitName = (est.name.split(' — ')[0] ?? est.name).trim()
    unitAddress = est.address
    unitWhatsapp = est.whatsapp
    unitPhone = est.phone
    unitPix = null // Pix é individual de cada barbeiro
  } else {
    unitName = String(formData.get('unit_name') ?? '').trim()
    unitAddress = String(formData.get('unit_address') ?? '').trim() || null
    unitWhatsapp = String(formData.get('unit_whatsapp') ?? '').trim() || null
    if (!unitName) return { error: 'Informe o nome do local (ex.: HS Barearia) ou escolha um espaço existente.' }
  }

  const workspaceName = unitName + ' — ' + name

  // ===== LOGIN: cria a conta (ou usa uma já existente) =====
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      error:
        'Para cadastrar logins, adicione SUPABASE_SERVICE_ROLE_KEY no .env.local ' +
        '(Supabase → Settings → API → service_role key) e reinicie o servidor.',
    }
  }

  let userId: string | null = null
  let reusedAccount = false
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, phone },
  })

  if (createError) {
    const msg = String(createError.message).toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      // conta já existe: vincula se não administrar outro espaço
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .ilike('email', email)
        .maybeSingle()
      const p = existing as { id: string; role: string } | null
      if (!p) return { error: 'Já existe um cadastro com este e-mail, mas não foi possível encontrá-lo.' }
      if (p.role === 'admin') {
        return { error: 'Este e-mail já administra outro espaço. Use outro e-mail para este barbeiro.' }
      }
      userId = p.id
      reusedAccount = true
      // padroniza o nome da conta existente com o nome do barbeiro
      await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', p.id)
    } else {
      return { error: friendlyDbError(createError.message) }
    }
  } else {
    userId = created.user?.id ?? null
  }

  if (!userId) return { error: 'Não foi possível criar o login. Tente novamente.' }

  // ===== ESPAÇO DE TRABALHO DO BARBEIRO =====
  const slug = await uniqueSlug(supabase, workspaceName, userId)
  const { data: estData, error: estError } = await supabase
    .from('establishments')
    .insert({
      name: workspaceName,
      address: unitAddress,
      phone: unitPhone,
      whatsapp: unitWhatsapp,
      pix_key: unitPix,
      opening_time: '09:00',
      closing_time: '19:00',
      slot_step_min: 15,
      owner_id: userId,
      slug,
    })
    .select('id')
    .single()
  if (estError) return { error: friendlyDbError(estError.message) }
  const estId = (estData as { id: string }).id

  // ===== VÍNCULOS =====
  await supabase
    .from('establishment_admins')
    .insert({ establishment_id: estId, profile_id: userId })

  const { error: barberError } = await supabase.from('barbers').insert({
    establishment_id: estId,
    profile_id: userId,
    full_name: name,
    bio,
    commission_pct: commission,
    is_active: true,
  })
  if (barberError) return { error: friendlyDbError(barberError.message) }

  // promove a admin (o master pode; o trigger valida)
  await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId)
    .eq('role', 'client')
  await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId)
    .eq('role', 'barber')

  revalidatePath('/admin/master')
  revalidatePath('/', 'layout')
  return {
    ok: true,
    notice:
      'Barbeiro cadastrado! Login: ' + email + ' · Senha: ' + password +
      (reusedAccount ? ' (usamos a conta que já existia com este e-mail)' : '') +
      '. Ele pode trocar a senha em Minha Conta.',
  }
}

/**
 * Ativa/desativa o acesso de um barbeiro:
 * - desativar remove o acesso ao painel e ao portal (conta vira cliente);
 * - reativar devolve o acesso ao espaço de trabalho dele.
 */
export async function masterToggleBarberAction(formData: FormData) {
  const master = await requireMaster()
  if (!master) redirect('/entrar?next=/admin/master')
  const { supabase } = master

  const id = String(formData.get('id') ?? '')
  const { data: barberData } = await supabase
    .from('barbers')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  const barber = barberData as
    | { id: string; establishment_id: string; profile_id: string | null; is_active: boolean; full_name: string }
    | null
  if (!barber) redirect('/admin/master?erro=' + encodeURIComponent('Barbeiro não encontrado.'))

  if (barber.is_active) {
    await supabase.from('barbers').update({ is_active: false }).eq('id', id)
    if (barber.profile_id) {
      await supabase
        .from('establishment_admins')
        .delete()
        .eq('establishment_id', barber.establishment_id)
        .eq('profile_id', barber.profile_id)
      // sem mais nenhuma administração de espaço, a conta volta a cliente
      const { data: memberships } = await supabase
        .from('establishment_admins')
        .select('establishment_id')
        .eq('profile_id', barber.profile_id)
      if ((memberships ?? []).length === 0) {
        await supabase
          .from('profiles')
          .update({ role: 'client' })
          .eq('id', barber.profile_id)
          .eq('role', 'admin')
      }
    }
    revalidatePath('/admin/master')
    revalidatePath('/', 'layout')
    redirect('/admin/master?ok=' + encodeURIComponent('Acesso de ' + barber.full_name.split(' ')[0] + ' removido.'))
  } else {
    await supabase.from('barbers').update({ is_active: true }).eq('id', id)
    if (barber.profile_id) {
      await supabase
        .from('establishment_admins')
        .upsert(
          { establishment_id: barber.establishment_id, profile_id: barber.profile_id },
          { onConflict: 'establishment_id,profile_id', ignoreDuplicates: true }
        )
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', barber.profile_id)
        .in('role', ['client', 'barber'])
    }
    revalidatePath('/admin/master')
    revalidatePath('/', 'layout')
    redirect('/admin/master?ok=' + encodeURIComponent(barber.full_name.split(' ')[0] + ' reativado.'))
  }
}

/** Master escolhe qual espaço gerenciar no painel (cookie httpOnly). */
export async function masterSetWorkspaceAction(formData: FormData) {
  const master = await requireMaster()
  if (!master) redirect('/entrar?next=/admin/master')

  const id = String(formData.get('id') ?? '')
  const { data } = await master.supabase
    .from('establishments')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (!data) redirect('/admin/master')

  const cookieStore = await cookies()
  cookieStore.set(MASTER_WS_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath('/', 'layout')
  redirect('/admin')
}
