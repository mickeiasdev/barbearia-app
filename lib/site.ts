import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Barber, Establishment } from '@/lib/types'

// Domínio(s) raiz da plataforma — configure no .env.local / Vercel:
//   NEXT_PUBLIC_ROOT_DOMAINS=hsbarbearia.com.br,localhost
// - Raiz: o site da EMPRESA PADRÃO (se configurada) ou a plataforma
// - {empresa}.raiz: site da empresa (lista os profissionais dela)
// - {profissional}.raiz: site próprio do profissional
// - /{profissional}: caminho por barra no domínio principal
const ROOT_DOMAINS_RAW = process.env.NEXT_PUBLIC_ROOT_DOMAINS ?? ''

// Slug de empresa exibida na RAIZ do domínio principal (a "casa").
// Ex.: NEXT_PUBLIC_DEFAULT_COMPANY_SLUG=hsbarbearia → hsbarbearia.com.br
// é o site da própria barbearia, com profissionais em /lucas, /hiago...
const DEFAULT_COMPANY_SLUG = process.env.NEXT_PUBLIC_DEFAULT_COMPANY_SLUG ?? ''

/**
 * Endereços (slugs) reservados pelas rotas do sistema — não podem
 * ser usados como endereço de empresa/profissional.
 */
export const RESERVED_SLUGS: string[] = [
  'admin', 'barbeiro', 'api', 'auth', 'vender', 'p', 'agendar', 'loja',
  'servicos', 'barbeiros', 'entrar', 'registrar', 'registrar-empresa',
  'recuperar-senha', 'redefinir-senha', 'minha-conta', 'carrinho', 'assinar',
  'favicon.ico', 'sitemap.xml', 'robots.txt', 'manifest.webmanifest',
  'icon.svg', '_next',
]

/**
 * Extrai o subdomínio do host atual (slug de empresa ou de profissional).
 * Retorna null para a raiz, www e hosts que não são subdomínio.
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

export interface HostWorkspace {
  establishment: Establishment
  barbers: Barber[]
}

export interface HostContext {
  /** slug do subdomínio (null = site principal da plataforma) */
  sub: string | null
  /** subdomínio é uma EMPRESA (lista os profissionais dela) */
  company: Establishment | null
  /** subdomínio é o site de UM profissional */
  workspace: HostWorkspace | null
}

/** O host atual é a raiz configurada (ou localhost)? */
function isRootHost(h: string): boolean {
  const roots = ROOT_DOMAINS_RAW
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
  if (roots.length === 0) return h === 'localhost' || h.endsWith('.localhost')
  return roots.some(
    (r) => h === r || h === 'www.' + r || h === 'localhost' || h.endsWith('.localhost')
  )
}

/**
 * Contexto do host atual (cacheado por request).
 * Raiz → empresa PADRÃO (se configurada) ou plataforma.
 * {slug} → empresa (is_company) ou profissional.
 */
export const getHostContext = cache(async (): Promise<HostContext> => {
  let sub: string | null = null
  let hostName = ''
  try {
    const h = await headers()
    hostName = (h.get('host') ?? h.get('x-forwarded-host') ?? '').trim().toLowerCase().replace(/:\d+$/, '')
    sub = parseSubdomain(h.get('host') ?? h.get('x-forwarded-host'))
  } catch {
    sub = null
  }
  if (!sub) {
    // RAIZ do domínio principal: mostra a EMPRESA PADRÃO configurada
    // (ex.: hsbarbearia.com.br é o site da própria barbearia).
    if (DEFAULT_COMPANY_SLUG && isRootHost(hostName)) {
      try {
        const supabase = await createClient()
        const { data: est } = await supabase
          .from('establishments')
          .select('*')
          .eq('slug', DEFAULT_COMPANY_SLUG)
          .eq('is_company', true)
          .maybeSingle()
        if (est) return { sub: null, company: est as Establishment, workspace: null }
      } catch {
        // sem banco: segue como plataforma
      }
    }
    return { sub: null, company: null, workspace: null }
  }
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(sub)) {
    return { sub, company: null, workspace: null }
  }

  try {
    const supabase = await createClient()
    const { data: est } = await supabase
      .from('establishments')
      .select('*')
      .eq('slug', sub)
      .maybeSingle()
    if (!est) return { sub, company: null, workspace: null }
    const place = est as Establishment

    if (place.is_company) {
      return { sub, company: place, workspace: null }
    }

    const { data: barbers } = await supabase
      .from('barbers')
      .select('*')
      .eq('establishment_id', place.id)
      .eq('is_active', true)
      .order('full_name')

    return {
      sub,
      company: null,
      workspace: { establishment: place, barbers: (barbers ?? []) as Barber[] },
    }
  } catch {
    return { sub, company: null, workspace: null }
  }
})

/**
 * Para páginas que exibem dados de profissionais: em subdomínio
 * desconhecido NÃO renderiza nada (nem no HTML invisível) — vira 404.
 */
export async function requireKnownHost(): Promise<HostContext> {
  const ctx = await getHostContext()
  if (ctx.sub && !ctx.workspace && !ctx.company) notFound()
  return ctx
}

/** URL absoluta do site de uma empresa/profissional pelo slug. */
export function subdomainUrl(slug: string): string {
  const root =
    (process.env.NEXT_PUBLIC_ROOT_DOMAINS ?? '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)[0] ?? null
  if (root && root !== 'localhost') return 'https://' + slug + '.' + root
  return 'http://' + slug + '.localhost:3000'
}
