import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Barber, Establishment } from '@/lib/types'

// Domínio(s) raiz da plataforma — configure no .env.local / Vercel:
//   NEXT_PUBLIC_ROOT_DOMAINS=hsbarbearia.com.br,localhost
// Subdomínios (lucas.hsbarbearia.com.br) viram o site DO profissional.
const ROOT_DOMAINS_RAW = process.env.NEXT_PUBLIC_ROOT_DOMAINS ?? ''

/**
 * Extrai o subdomínio (= slug do espaço) do host atual.
 * Retorna null para o domínio raiz, www e hosts que não são subdomínio.
 */
export function parseSubdomain(host: string | null): string | null {
  if (!host) return null
  const h = host.trim().toLowerCase().replace(/:\d+$/, '')
  if (!h || h === 'localhost' || h.endsWith('.vercel.app')) return null

  const roots = ROOT_DOMAINS_RAW
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)

  if (roots.length > 0) {
    for (const root of roots) {
      if (h === root || h === 'www.' + root) return null
      if (h.endsWith('.' + root)) {
        const sub = h.slice(0, h.length - root.length - 1)
        if (sub && sub !== 'www' && !sub.includes('.')) return sub
      }
    }
    return null
  }

  // fallback heurístico (sem env configurado): x.dominio.com.br
  const labels = h.split('.')
  if (labels[labels.length - 1] === 'localhost' && labels.length >= 2) {
    return labels[0] === 'www' ? null : labels[0]
  }
  if (labels.length >= 4 && labels[0] !== 'www') return labels[0]
  return null
}

/**
 * Para páginas que exibem dados de profissionais (home, equipe, loja,
 * serviços, agendamento, perfil): em subdomínio desconhecido, NÃO renderiza
 * nada (nem no HTML invisível) — vira 404 limpo.
 */
export async function requireKnownHost(): Promise<HostContext> {
  const ctx = await getHostContext()
  if (ctx.sub && !ctx.workspace) notFound()
  return ctx
}

export interface HostWorkspace {
  establishment: Establishment
  barbers: Barber[]
}

export interface HostContext {
  /** slug do subdomínio (null = domínio principal da plataforma) */
  sub: string | null
  /** espaço do subdomínio (null quando sub é nulo OU não existe) */
  workspace: HostWorkspace | null
}

/**
 * Contexto do host atual (cacheado por request):
 * - sub null → site plataforma (mostra todos os profissionais);
 * - sub + workspace → o visitante está no site de UM profissional;
 * - sub sem workspace → subdomínio configurado que não bate com espaço.
 */
export const getHostContext = cache(async (): Promise<HostContext> => {
  let sub: string | null = null
  try {
    const h = await headers()
    sub = parseSubdomain(h.get('host') ?? h.get('x-forwarded-host'))
  } catch {
    sub = null
  }
  if (!sub) return { sub: null, workspace: null }
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(sub)) {
    return { sub, workspace: null }
  }

  try {
    const supabase = await createClient()
    const { data: est } = await supabase
      .from('establishments')
      .select('*')
      .eq('slug', sub)
      .maybeSingle()
    if (!est) return { sub, workspace: null }

    const { data: barbers } = await supabase
      .from('barbers')
      .select('*')
      .eq('establishment_id', (est as Establishment).id)
      .eq('is_active', true)
      .order('full_name')

    return {
      sub,
      workspace: {
        establishment: est as Establishment,
        barbers: (barbers ?? []) as Barber[],
      },
    }
  } catch {
    return { sub, workspace: null }
  }
})
