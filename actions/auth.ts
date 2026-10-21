'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { friendlyDbError } from '@/lib/utils'

export interface AuthState {
  error?: string
  notice?: string
}

export interface WorkspaceState {
  error?: string
}

function safeNext(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? '/')
  return value.startsWith('/') ? value : '/'
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: friendlyDbError(error.message) }
  }

  // destino padrão por papel (wizard/agendamento preserva o ?next explícito)
  let dest = next
  if (next === '/') {
    const { data: authData } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user?.id ?? '')
      .maybeSingle()
    const role = (profile as { role: string } | null)?.role
    if (role === 'admin') dest = '/admin'
    else if (role === 'barber') dest = '/barbeiro'
  }

  revalidatePath('/', 'layout')
  redirect(dest)
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!fullName) return { error: 'Informe seu nome completo.' }
  if (!email.includes('@')) return { error: 'Informe um e-mail válido.' }
  if (password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || null },
    },
  })

  if (error) {
    return { error: friendlyDbError(error.message) }
  }

  // Login automático quando a confirmação de e-mail está desativada.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/')
  }

  return {
    notice: 'Conta criada! Verifique sua caixa de e-mail para confirmar o cadastro antes de entrar.',
  }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// ============================================================
// RECUPERAÇÃO DE SENHA
// ============================================================
export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email.includes('@')) return { error: 'Informe um e-mail válido.' }

  const supabase = await createClient()

  // origem absolute do request para o link do e-mail
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  const origin = proto + '://' + host

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin + '/auth/callback?next=/redefinir-senha',
  })

  if (error) return { error: friendlyDbError(error.message) }

  // resposta neutra: não revela se o e-mail existe
  return {
    notice: 'Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha. Verifique a caixa de entrada e o spam.',
  }
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }
  if (password !== confirm) return { error: 'As senhas não coincidem.' }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Link expirado ou inválido. Solicite um novo em "Esqueci minha senha".' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: friendlyDbError(error.message) }

  return { notice: 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.' }
}

// ============================================================
// ESPAÇO DE TRABALHO (profissional independente)
// ============================================================
export async function createWorkspaceAction(
  _prev: WorkspaceState,
  formData: FormData
): Promise<WorkspaceState> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Entre na sua conta para criar seu espaço.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Informe o nome do seu espaço (ex.: Studio João).' }

  const opening = String(formData.get('opening_time') ?? '09:00') || '09:00'
  const closing = String(formData.get('closing_time') ?? '19:00') || '19:00'
  const step = Number(formData.get('slot_step_min') ?? 15) || 15

  const { error } = await supabase.rpc('create_workspace', {
    p_name: name,
    p_address: String(formData.get('address') ?? '').trim() || null,
    p_phone: String(formData.get('phone') ?? '').trim() || null,
    p_whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
    p_opening: opening,
    p_closing: closing,
    p_step: step,
    p_pix_key: String(formData.get('pix_key') ?? '').trim() || null,
  })

  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

/** Superadmin adota um espaço antigo sem dono. */
export async function claimWorkspaceAction(formData: FormData) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/entrar?next=/admin')

  const id = String(formData.get('id') ?? '')
  if (id) {
    await supabase.rpc('claim_workspace', { p_establishment_id: id })
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

// ============================================================
// PERFIL E SENHA (logado)
// ============================================================
export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }
  if (password !== confirm) return { error: 'As senhas não coincidem.' }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Sessão expirada. Entre novamente.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: friendlyDbError(error.message) }

  return { notice: 'Senha alterada com sucesso.' }
}

export async function updateProfileAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!fullName) return { error: 'Informe seu nome completo.' }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'Sessão expirada. Entre novamente.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone: phone || null })
    .eq('id', auth.user.id)

  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath('/minha-conta')
  return { notice: 'Perfil atualizado com sucesso.' }
}
