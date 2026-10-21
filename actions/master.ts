'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { MASTER_WS_COOKIE, isPlatformAdmin, getMyCompany } from '@/lib/data'
import { RESERVED_SLUGS } from '@/lib/site'
import { friendlyDbError } from '@/lib/utils'
import type { Establishment } from '@/lib/types'

export interface MasterState {
  error?: string
  ok?: boolean
  notice?: string
}

/**
 * Contexto de quem pode cadastrar barbeiros:
 * - MASTER da plataforma (qualquer empresa);
 * - GERENTE de uma barbearia (apenas a empresa dele, com limite por plano).
 */
async function requireBarberCreator(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  isMaster: boolean
  company: Establishment | null
} | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') return null

  if (await isPlatformAdmin(supabase)) {
    return { supabase, userId: auth.user.id, isMaster: true, company: null }
  }

  const company = await getMyCompany(supabase)
  if (company) {
    return { supabase, userId: auth.user.id, isMaster: false, company }
  }
  return null
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
  // verifica disponibilidade até achar um slug livre (reservados não valem)
  for (;;) {
    const { data } = await supabase
      .from('establishments')
      .select('id')
      .eq('slug', slug)
      .limit(1)
    if ((!data || data.length === 0) && !RESERVED_SLUGS.includes(slug)) return slug
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
  const creator = await requireBarberCreator()
  if (!creator) return { error: 'Sem permissão — apenas o administrador master ou o gerente da empresa cadastra barbeiros.' }
  const { supabase, isMaster } = creator

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

  // ===== EMPRESA onde o barbeiro vai trabalhar =====
  // gerente de barbearia: sempre a empresa DELE (com limite por plano);
  // master da plataforma: usa a empresa escolhida no formulário
  let company: Establishment | null = null

  if (!isMaster) {
    company = creator.company
    if (!company) return { error: 'Empresa não encontrada.' }
    if (company.plan === 'free') {
      const { count } = await supabase
        .from('establishments')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', company.id)
      if ((count ?? 0) >= 1) {
        return {
          error:
            'O plano Grátis permite 1 profissional. Assine o Pro em Assinar para cadastrar mais barbeiros.',
        }
      }
    }
  } else {
  const companyId = String(formData.get('company_id') ?? '').trim()

  if (companyId) {
    const { data: companyData } = await supabase
      .from('establishments')
      .select('*')
      .eq('id', companyId)
      .maybeSingle()
    company = companyData as Establishment | null
    if (!company || !company.is_company) {
      return { error: 'Empresa não encontrada.' }
    }
  } else {
    // nova empresa informada junto com o barbeiro
    const companyName = String(formData.get('company_name') ?? '').trim()
    const companyAddress = String(formData.get('company_address') ?? '').trim() || null
    const companyWhatsapp = String(formData.get('company_whatsapp') ?? '').trim() || null
    if (!companyName) {
      return { error: 'Informe a empresa onde ele vai trabalhar (escolha uma ou cadastre uma nova).' }
    }
    const companySlug = await uniqueSlug(supabase, companyName, Date.now().toString())
    const { data: newCompany, error: companyError } = await supabase
      .from('establishments')
      .insert({
        name: companyName,
        address: companyAddress,
        phone: companyWhatsapp,
        whatsapp: companyWhatsapp,
        is_company: true,
        owner_id: creator.userId,
        slug: companySlug,
      })
      .select('*')
      .single()
    if (companyError) return { error: friendlyDbError(companyError.message) }
    company = newCompany as Establishment
  }
  } // fim do bloco do master

  const workspaceName = company.name + ' — ' + name

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

  // ===== ESPAÇO DE TRABALHO DO BARBEIRO (vinculado à empresa) =====
  // slug curto = endereço próprio do profissional (lucas, joao...)
  const slug = await uniqueSlug(supabase, name, userId)
  const { data: estData, error: estError } = await supabase
    .from('establishments')
    .insert({
      name: workspaceName,
      parent_id: company.id,
      address: company.address,
      phone: company.phone,
      whatsapp: company.whatsapp,
      opening_time: company.opening_time,
      closing_time: company.closing_time,
      slot_step_min: company.slot_step_min,
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

  // PRIMEIRO barbeiro da empresa vira GERENCIADOR dela
  // (acesso a /admin/empresa para editar dados e adicionar gerenciadores)
  const { count: teamCount } = await supabase
    .from('establishments')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', company.id)
  if ((teamCount ?? 0) <= 1) {
    await supabase
      .from('establishment_admins')
      .upsert(
        { establishment_id: company.id, profile_id: userId },
        { onConflict: 'establishment_id,profile_id', ignoreDuplicates: true }
      )
  }

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

// ============================================================
// EMPRESAS (cadastradas pelo master; agrupam profissionais)
// ============================================================
export async function masterCreateCompanyAction(
  _prev: MasterState,
  formData: FormData
): Promise<MasterState> {
  const master = await requireMaster()
  if (!master) return { error: 'Sem permissão — apenas o administrador master cadastra empresas.' }
  const { supabase } = master

  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim() || null
  const whatsapp = String(formData.get('whatsapp') ?? '').trim() || null
  const opening = String(formData.get('opening_time') ?? '09:00') || '09:00'
  const closing = String(formData.get('closing_time') ?? '19:00') || '19:00'

  if (!name) return { error: 'Informe o nome da empresa (ex.: HS Barearia — Unidade Centro).' }
  if (opening >= closing) return { error: 'O horário de abertura deve ser antes do fechamento.' }

  const slug = await uniqueSlug(supabase, name, Date.now().toString())
  const { error } = await supabase.from('establishments').insert({
    name,
    address,
    phone: whatsapp,
    whatsapp,
    opening_time: opening,
    closing_time: closing,
    is_company: true,
    owner_id: master.userId,
    slug,
  })
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath('/admin/master')
  revalidatePath('/')
  return { ok: true, notice: 'Empresa cadastrada! Agora cadastre os barbeiros que trabalham nela.' }
}
