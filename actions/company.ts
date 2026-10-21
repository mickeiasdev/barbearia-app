'use server'

import { createClient } from '@/lib/supabase/server'
import { getMyCompany } from '@/lib/data'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { friendlyDbError } from '@/lib/utils'
import type { Establishment } from '@/lib/types'

export interface CompanyState {
  error?: string
  ok?: boolean
  notice?: string
}

/** Exige gerenciador de empresa (devolve a empresa ou redireciona). */
async function requireCompany(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; company: Establishment } | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') return null
  const company = await getMyCompany(supabase)
  if (!company) return null
  return { supabase, company }
}

/**
 * Editar os dados da EMPRESA (gerenciador ou master):
 * nome, endereço, contatos, horários, endereço do site (slug) e plano
 * de pagamento antecipado são geridos pelo gerenciador, do jeito dele.
 */
export async function saveCompanyAction(
  _prev: CompanyState,
  formData: FormData
): Promise<CompanyState> {
  const ctx = await requireCompany()
  if (!ctx) return { error: 'Sem permissão — apenas gerenciadores da empresa alteram estes dados.' }
  const { supabase, company } = ctx

  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim() || null
  const phone = String(formData.get('phone') ?? '').trim() || null
  const whatsapp = String(formData.get('whatsapp') ?? '').trim() || null
  const instagram = String(formData.get('instagram') ?? '').trim() || null
  const openingTime = String(formData.get('opening_time') ?? '09:00')
  const closingTime = String(formData.get('closing_time') ?? '19:00')
  const step = Number(formData.get('slot_step_min') ?? 15)

  const slugInput = String(formData.get('slug') ?? '').trim().toLowerCase() || null
  if (slugInput !== null && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugInput)) {
    return { error: 'O endereço do site deve ter só letras minúsculas, números e hífens (ex.: hs-barearia).' }
  }

  if (!name) return { error: 'Informe o nome da empresa.' }
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
    opening_time: openingTime,
    closing_time: closingTime,
    slot_step_min: step,
    ...(slugInput !== null ? { slug: slugInput } : {}),
  }

  const { error } = await supabase
    .from('establishments')
    .update(values)
    .eq('id', company.id)
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath('/admin/empresa')
  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * Adicionar gerenciador por e-mail — SOMENTE se o e-mail pertencer a um
 * barbeiro vinculado a esta empresa (login dele + registro de barbeiro
 * em um espaço filho).
 */
export async function addCompanyManagerAction(
  _prev: CompanyState,
  formData: FormData
): Promise<CompanyState> {
  const ctx = await requireCompany()
  if (!ctx) return { error: 'Sem permissão.' }
  const { supabase, company } = ctx

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email.includes('@')) return { error: 'Informe um e-mail válido.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .ilike('email', email)
    .maybeSingle()
  const p = profile as { id: string; full_name: string; role: string } | null
  if (!p) {
    return { error: 'Nenhuma conta encontrada com este e-mail.' }
  }

  // valida: precisa ser barbeiro vinculado a um espaço desta empresa
  const { data: children } = await supabase
    .from('establishments')
    .select('id')
    .eq('parent_id', company.id)
  const childIds = ((children ?? []) as { id: string }[]).map((c) => c.id)

  const { data: linkedBarber } = await supabase
    .from('barbers')
    .select('id, full_name')
    .eq('profile_id', p.id)
    .in('establishment_id', childIds.length > 0 ? childIds : ['00000000-0000-0000-0000-000000000000'])
    .limit(1)
    .maybeSingle()
  if (!linkedBarber) {
    return {
      error:
        p.full_name.split(' ')[0] + ' não é um barbeiro vinculado a esta empresa. ' +
        'O gerenciador só pode ser adicionado se o login dele já for de um barbeiro daqui.',
    }
  }

  const { error } = await supabase
    .from('establishment_admins')
    .insert({ establishment_id: company.id, profile_id: p.id })
  if (error) {
    if (error.code === '23505') return { error: 'Esta pessoa já é gerenciadora da empresa.' }
    return { error: friendlyDbError(error.message) }
  }

  revalidatePath('/admin/empresa')
  return { ok: true, notice: p.full_name.split(' ')[0] + ' agora também gerencia a empresa.' }
}

/** Remover um gerenciador (não pode remover a si mesmo). */
export async function removeCompanyManagerAction(formData: FormData) {
  const ctx = await requireCompany()
  if (!ctx) redirect('/entrar?next=/admin/empresa')
  const { supabase, company } = ctx

  const id = String(formData.get('id') ?? '')
  const { data: auth } = await supabase.auth.getUser()
  if (auth.user?.id === id) {
    redirect('/admin/empresa?erro=' + encodeURIComponent('Para deixar de gerenciar, peça a outro gerenciador para te remover.'))
  }

  const { error } = await supabase
    .from('establishment_admins')
    .delete()
    .eq('establishment_id', company.id)
    .eq('profile_id', id)
  if (error) {
    redirect('/admin/empresa?erro=' + encodeURIComponent(friendlyDbError(error.message)))
  }

  revalidatePath('/admin/empresa')
  redirect('/admin/empresa?ok=1')
}
