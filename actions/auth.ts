'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { friendlyDbError } from '@/lib/utils'

export interface AuthState {
  error?: string
  notice?: string
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

  revalidatePath('/', 'layout')
  redirect(next)
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
    notice:
      'Conta criada! Verifique sua caixa de e-mail para confirmar o cadastro antes de entrar.',
  }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
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
