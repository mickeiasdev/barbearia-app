import Link from 'next/link'
import type { Metadata } from 'next'
import { Clock, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatBRL, formatDuration } from '@/lib/utils'
import { requireKnownHost } from '@/lib/site'
import type { Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Serviços' }

type ServiceWithPlace = Service & { establishment?: { name: string } | null }

export default async function ServicosPage() {
  const supabase = await createClient()

  // subdomínio: mostra apenas os serviços do profissional do site;
  // no site de uma EMPRESA, os serviços ficam nos sites dos profissionais
  const host = await requireKnownHost()
  if (host.company) redirect('/')
  let query = supabase
    .from('services')
    .select('*, establishment:establishments(name)')
    .eq('is_active', true)
    .order('price_cents')
  if (host.workspace) {
    query = query.eq('establishment_id', host.workspace.establishment.id)
  }
  const { data } = await query
  const services = (data ?? []) as unknown as ServiceWithPlace[]

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title">Serviços</h1>
      <p className="mt-2 text-sm text-stone-400">
        Cada profissional define seus serviços e preços. Escolha um para ver quem executa e os horários.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <div key={service.id} className="card flex flex-col p-6">
            <h2 className="font-semibold text-stone-100">{service.name}</h2>
            {service.establishment?.name && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-400">
                <MapPin className="h-3 w-3 text-amber-500/80" />
                {service.establishment.name}
              </p>
            )}
            {service.description && (
              <p className="mt-2 flex-1 text-sm text-stone-400">{service.description}</p>
            )}
            <div className="mt-4 flex items-center gap-4 text-xs text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-amber-500">
                {formatBRL(service.price_cents)}
              </span>
              <Link href={'/agendar?servico=' + service.id} className="btn btn-primary btn-sm">
                Agendar
              </Link>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="text-sm text-stone-400">Nenhum serviço cadastrado ainda.</p>
        )}
      </div>
    </main>
  )
}
