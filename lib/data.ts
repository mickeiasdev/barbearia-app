import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Barber, Establishment, Profile } from '@/lib/types'

/**
 * Todos os espaços cadastrados (público). Cada profissional
 * independente tem o seu — a plataforma mostra todos.
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

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * O espaço de trabalho que o usuário logado administra:
 * o espaço que ele criou (dono) ou do qual foi convidado.
 * Superadmins sem espaço próprio recebem null (onboarding).
 */
export async function getMyWorkspace(supabase: Supabase): Promise<Establishment | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const [{ data: memberRows }, { data: ownedRows }] = await Promise.all([
    supabase
      .from('establishment_admins')
      .select('establishment_id')
      .eq('profile_id', auth.user.id),
    supabase
      .from('establishments')
      .select('id')
      .eq('owner_id', auth.user.id)
      .limit(1),
  ])

  const ids = new Set<string>()
  for (const r of (memberRows ?? []) as { establishment_id: string }[]) ids.add(r.establishment_id)
  for (const r of (ownedRows ?? []) as { id: string }[]) ids.add(r.id)
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

  const establishment = await getMyWorkspace(supabase)

  return {
    supabase,
    user: { id: auth.user.id, email: auth.user.email },
    profile: profile as Profile,
    establishment,
  }
}

/**
 * Usado em Server Actions: exige admin e devolve o espaço dele.
 * Retorna null se não houver sessão/papel — actions respondem
 * "Sem permissão." Um admin sem espaço recebe establishment null
 * e a action orienta a criar o espaço primeiro.
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
