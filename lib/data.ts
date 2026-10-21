import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Barber, Establishment, Profile } from '@/lib/types'

const WORKSPACE_COOKIE = 'dsh-master-ws'

/**
 * Todos os espaços cadastrados (o master vê todos; demais papéis
 * veem apenas os que administram via RLS).
 */
export async function getEstablishments(): Promise<Establishment[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select('*')
    .order('name')
  return (data ?? []) as Establishment[]
}

/** Um espaço por id (público). */
export async function getEstablishmentById(id: string): Promise<Establishment | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as Establishment | null) ?? null
}

/** Usuário logado + perfil, ou null. */
export async function getCurrentUser(): Promise<{ id: string; profile: Profile | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()
  return { id: data.user.id, profile: (profile as Profile | null) ?? null }
}

/** O usuário logado é o administrador MASTER da plataforma? */
export async function isPlatformAdmin(supabase: Supabase): Promise<boolean> {
  const { data } = await supabase.rpc('is_platform_admin')
  return !!data
}

/**
 * A EMPRESA que o usuário logado gerencia (se ele for gerenciador
 * de alguma empresa — o 1º barbeiro criado nela ou um convidado).
 * Retorna null se ele só administra o próprio espaço de trabalho.
 */
export async function getMyCompany(supabase: Supabase): Promise<Establishment | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data } = await supabase
    .from('establishments')
    .select('*, establishment_admins!inner(profile_id)')
    .eq('establishment_admins.profile_id', auth.user.id)
    .eq('is_company', true)
    .order('created_at')
    .limit(1)
    .maybeSingle()
  return (data as unknown as Establishment | null) ?? null
}

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * O espaço de trabalho que o usuário logado administra:
 * - ADMIN MASTER: o espaço escolhido no painel master (cookie);
 *   sem cookie, o primeiro espaço que ele administra; sem nenhum, null.
 * - Admin comum: o espaço onde é dono ou convidado.
 */
export async function getMyWorkspace(supabase: Supabase): Promise<Establishment | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const master = await isPlatformAdmin(supabase)

  if (master) {
    // cookie do painel master: o master pode inspecionar qualquer espaço
    const cookieStore = await cookies()
    const wsId = cookieStore.get(WORKSPACE_COOKIE)?.value
    if (wsId && /^[0-9a-f-]{36}$/i.test(wsId)) {
      const { data: chosen } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', wsId)
        .maybeSingle()
      if (chosen) return (chosen as Establishment | null) ?? null
    }
  }

  const [{ data: memberRows }, { data: ownedRows }] = await Promise.all([
    supabase
      .from('establishment_admins')
      .select('establishment_id, establishment:establishments(is_company)')
      .eq('profile_id', auth.user.id),
    supabase
      .from('establishments')
      .select('id, is_company')
      .eq('owner_id', auth.user.id),
  ])

  // apenas ESPAÇOS de trabalho (empresas não são "onde eu atendo")
  const ids = new Set<string>()
  for (const r of (memberRows ?? []) as unknown as {
    establishment_id: string
    establishment?: { is_company: boolean }[] | null
  }[]) {
    const est = Array.isArray(r.establishment) ? r.establishment[0] : null
    if (!est?.is_company) ids.add(r.establishment_id)
  }
  for (const r of (ownedRows ?? []) as { id: string; is_company: boolean }[]) {
    if (!r.is_company) ids.add(r.id)
  }
  if (ids.size === 0) return null

  const { data } = await supabase
    .from('establishments')
    .select('*')
    .in('id', [...ids])
    .order('created_at')
    .limit(1)
  return (data?.[0] as Establishment | undefined) ?? null
}

/** Usado nas páginas admin: exige sessão + papel admin (redireciona). */
export async function requireAdminPage(): Promise<{
  supabase: Supabase
  user: { id: string; email?: string }
  profile: Profile
  establishment: Establishment | null
  isMaster: boolean
  company: Establishment | null
}> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/entrar?next=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!profile || (profile as Profile).role !== 'admin') redirect('/')

  const isMaster = await isPlatformAdmin(supabase)
  const establishment = await getMyWorkspace(supabase)
  const company = await getMyCompany(supabase)

  return {
    supabase,
    user: { id: auth.user.id, email: auth.user.email },
    profile: profile as Profile,
    establishment,
    isMaster,
    company,
  }
}

/**
 * Usado em Server Actions: exige admin e devolve o espaço dele.
 * Retorna null se não houver sessão/papel — actions respondem
 * "Sem permissão." Um admin sem espaço recebe establishment null
 * e a action orienta a falar com o administrador master.
 */
export async function requireAdminAction(): Promise<{
  supabase: Supabase
  establishment: Establishment | null
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
  const establishment = await getMyWorkspace(supabase)
  return { supabase, establishment }
}

/** Usado nas páginas do portal do barbeiro: exige papel 'barber' + vínculo. */
export async function requireBarberPage(): Promise<{
  supabase: Supabase
  user: { id: string; email?: string }
  profile: Profile
  barber: Barber
}> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/entrar?next=/barbeiro')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!profile) redirect('/')
  const prof = profile as Profile
  if (prof.role === 'admin') redirect('/admin')
  if (prof.role !== 'barber') redirect('/')

  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('profile_id', auth.user.id)
    .maybeSingle()

  if (!barber) redirect('/minha-conta?sembarbeiro=1')

  return {
    supabase,
    user: { id: auth.user.id, email: auth.user.email },
    profile: prof,
    barber: barber as Barber,
  }
}

/** Barbeiros ativos de um espaço. */
export async function getActiveBarbers(establishmentId: string): Promise<Barber[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('barbers')
    .select('*')
    .eq('establishment_id', establishmentId)
    .eq('is_active', true)
    .order('full_name')
  return (data ?? []) as Barber[]
}

/** Nome do cookie de troca de espaço do painel master. */
export const MASTER_WS_COOKIE = WORKSPACE_COOKIE
