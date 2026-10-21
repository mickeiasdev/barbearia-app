'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { friendlyDbError } from '@/lib/utils'

/**
 * Barbeiro confirma (pending -> confirmed), conclui (-> completed) ou
 * marca não compareceu (-> no_show) um atendimento DELE. A policy RLS
 * garante que só pode tocar nos próprios agendamentos e nesses status.
 */
export async function barberSetStatusAction(formData: FormData) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/entrar?next=/barbeiro')

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')

  if (!['confirmed', 'completed', 'no_show'].includes(status)) {
    redirect('/barbeiro?erro=' + encodeURIComponent('Status inválido.'))
  }

  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) {
    redirect('/barbeiro?erro=' + encodeURIComponent(friendlyDbError(error.message)))
  }

  revalidatePath('/barbeiro')
  redirect('/barbeiro?ok=1')
}
