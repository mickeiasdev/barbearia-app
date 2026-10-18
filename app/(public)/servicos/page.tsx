import Link from 'next/link'
import type { Metadata } from 'next'
import { Clock, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration } from '@/lib/utils'
import type { Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Serviços' }

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('price_cents')
  const services = (data ?? []) as Service[]

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title">Nossos serviços</h1>
      <p className="mt-2 text-sm text-stone-500">
        Escolha um serviço para ver os horários disponíveis.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <div key={service.id} className="card flex flex-col p-6">
            <h2 className="font-semibold text-stone-100">{service.name}</h2>
            {service.description && (
              <p className="mt-2 flex-1 text-sm text-stone-500">{service.description}</p>
            )}
            <div className="mt-4 flex items-center gap-4 text-xs text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-amber-500">
                {formatBRL(service.price_cents)}
              </span>
              <Link href={'/agendar?servico=' + service.id} className="btn btn-primary btn-sm">
                <Calendar className="h-4 w-4" />
                Agendar
              </Link>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="text-sm text-stone-500">Nenhum serviço cadastrado ainda.</p>
        )}
      </div>
    </main>
  )
}
