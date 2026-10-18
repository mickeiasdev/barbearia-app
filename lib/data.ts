import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Barber, Establishment, Profile } from '@/lib/types'

/** O estabelecimento do deploy (o primeiro criado). */
export async function getEstablishment(): Promise<Establishment | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select('*')
    .order('created_at')
    .limit(1)
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

/** Usado nas páginas admin: exige sessão + papel admin (redireciona). */
export async function requireAdminPage(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
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

  const establishment = await getEstablishment()

  return {
    supabase,
    user: { id: auth.user.id, email: auth.user.email },
    profile: profile as Profile,
    establishment,
  }
}

/** Usado em Server Actions: retorna null se não for admin. */
export async function requireAdminAction(): Promise<Awaited<ReturnType<typeof createClient>> | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') return null
  return supabase
}

/** Usado nas páginas do portal do barbeiro: exige papel 'barber' + vínculo. */
export async function requireBarberPage(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
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

/** Barbeiros ativos do estabelecimento. */
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
