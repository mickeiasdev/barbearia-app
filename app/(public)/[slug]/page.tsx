import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BarberLanding from '@/components/barber-landing'
import CompanySite from '@/components/company-site'
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
 * Destinos por caminho na raiz do domínio:
 *   /{empresa}        → site da empresa (profissionais dela)
 *   /{profissional}   → site do profissional (layout escolhido)
 * Rotas reais (/agendar, /loja, ...) têm prioridade sobre este catch-all.
 */
export default async function PathPage({ params }: Props) {
  const { slug } = await params
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) notFound()

  const supabase = await createClient()
  const { data: estData } = await supabase
    .from('establishments')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  const est = (estData ?? null) as Establishment | null
  if (!est) notFound()

  if (est.is_company) {
    return <CompanySite company={est} />
  }

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
