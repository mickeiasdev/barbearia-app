import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, Scissors } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import BarberLanding from '@/components/barber-landing'
import CompanySite from '@/components/company-site'
import { getHostContext, subdomainUrl } from '@/lib/site'
import { initials } from '@/lib/utils'
import type { Barber, Establishment } from '@/lib/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()
  return { title: (data as { name: string } | null)?.name ?? 'Página' }
}

/**
 * Destinos por caminho — RESOLVEM PELO CONTEXTO:
 *
 * Em um subdomínio de empresa (ex.: hsbarbearia.nuhorario.com.br):
 *   /lucas  → o LUCAS FILHO DAQUELA empresa (não o global)
 *
 * Na raiz do domínio:
 *   /lucas  → se só existe um "lucas", mostra ele
 *             se existem vários, mostra página de escolha
 *   /{empresa} → site da empresa
 */
export default async function PathPage({ params }: Props) {
  const { slug } = await params
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) notFound()

  const supabase = await createClient()
  const host = await getHostContext()

  // ============================================================
  // 1) ESTAMOS NO SITE DE UMA EMPRESA? resolve o slug FILHO DELA
  // ============================================================
  if (host.company) {
    const companyId = host.company.id

    // tenta pelo slug exato do workspace-filho
    const { data: child } = await supabase
      .from('establishments')
      .select('*')
      .eq('parent_id', companyId)
      .eq('slug', slug)
      .maybeSingle()
    if (child) {
      return <WorkspaceOrCompany supabase={supabase} est={child as Establishment} />
    }

    // tenta pelo slug que COMEÇA com o caminho (ex.: /lucas acha "lucas-2")
    const { data: children } = await supabase
      .from('establishments')
      .select('*')
      .eq('parent_id', companyId)
      .like('slug', slug + '%')
    const matches = (children ?? []) as Establishment[]
    if (matches.length === 1) {
      return <WorkspaceOrCompany supabase={supabase} est={matches[0]} />
    }

    // tenta pelo NOME do barbeiro (ex.: /lucas acha "HS Barearia — Lucas")
    const { data: byName } = await supabase
      .from('establishments')
      .select('*, barbers!inner(full_name)')
      .eq('parent_id', companyId)
      .ilike('barbers.full_name', slug + '%')
      .limit(5)
    const nameMatches = (byName ?? []) as unknown as Establishment[]
    if (nameMatches.length === 1) {
      return <WorkspaceOrCompany supabase={supabase} est={nameMatches[0]} />
    }

    // não achou na empresa: 404 (não vaza profissionais de outra)
    notFound()
  }

  // ============================================================
  // 2) NA RAIZ: resolução global (com desambiguação)
  // ============================================================
  const { data: estData } = await supabase
    .from('establishments')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  const est = (estData ?? null) as Establishment | null

  if (est) {
    if (est.is_company) {
      return <CompanySite company={est} />
    }
    return <WorkspaceOrCompany supabase={supabase} est={est} />
  }

  // não achou pelo slug exato — pode ser o nome de um barbeiro
  // procura workspaces cujo slug começa com o caminho OU cujo barbeiro tem o nome
  const [{ data: bySlug }, { data: byBarber }] = await Promise.all([
    supabase
      .from('establishments')
      .select('*')
      .like('slug', slug + '%')
      .limit(10),
    supabase
      .from('establishments')
      .select('*, barbers!inner(full_name)')
      .ilike('barbers.full_name', slug + '%')
      .limit(10),
  ])

  const candidates = [
    ...((bySlug ?? []) as Establishment[]),
    ...((byBarber ?? []) as unknown as Establishment[]),
  ].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)

  if (candidates.length === 0) notFound()

  if (candidates.length === 1) {
    const match = candidates[0]
    if (match.is_company) {
      return <CompanySite company={match} />
    }
    return <WorkspaceOrCompany supabase={supabase} est={match} />
  }

  // múltiplos: página de escolha
  return <DisambiguationPage slug={slug} candidates={candidates} />
}

/** Renderiza um workspace-filho (site do profissional). */
async function WorkspaceOrCompany({
  supabase,
  est,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  est: Establishment
}) {
  const { data: barbersData } = await supabase
    .from('barbers')
    .select('*')
    .eq('establishment_id', est.id)
    .eq('is_active', true)
    .order('full_name')

  return (
    <BarberLanding
      workspace={{ establishment: est, barbers: (barbersData ?? []) as Barber[] }}
    />
  )
}

/** Página de escolha quando há múltiplos profissionais com o mesmo nome. */
function DisambiguationPage({
  slug,
  candidates,
}: {
  slug: string
  candidates: Establishment[]
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="card p-8 text-center">
        <Scissors className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Qual "{slug}" você procura?
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Há mais de um profissional com esse nome. Escolha:
        </p>
        <div className="mt-8 space-y-3">
          {candidates.map((candidate) => (
            <Link
              key={candidate.id}
              href={'/' + candidate.slug}
              className="card flex items-center justify-between gap-4 p-4 transition-colors hover:border-amber-500/40"
            >
              <div className="min-w-0 text-left">
                <p className="font-semibold text-stone-100">{candidate.name.split(' — ').slice(-1)[0]}</p>
                <p className="mt-0.5 text-xs text-stone-400">{candidate.name}</p>
              </div>
              <span className="btn btn-outline btn-sm shrink-0">Ver</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
