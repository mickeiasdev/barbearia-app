import Link from 'next/link'
import type { Metadata } from 'next'
import { Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { initials, formatBRL } from '@/lib/utils'
import { WEEKDAY_LABELS } from '@/lib/tz'
import type { Barber, BarberSchedule, Service } from '@/lib/types'

export const metadata: Metadata = { title: 'Barbeiros' }

export default async function BarbeirosPage() {
  const supabase = await createClient()

  const [{ data: barbersData }, { data: schedulesData }, { data: linksData }] =
    await Promise.all([
      supabase.from('barbers').select('*').eq('is_active', true).order('full_name'),
      supabase.from('barber_schedules').select('*'),
      supabase.from('barber_services').select('barber_id, services(name, price_cents)'),
    ])

  const barbers = (barbersData ?? []) as Barber[]
  const schedules = (schedulesData ?? []) as BarberSchedule[]
  const links = (linksData ?? []) as unknown as {
    barber_id: string
    services: Service | null
  }[]

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title">Nossa equipe</h1>
      <p className="mt-2 text-sm text-stone-500">
        Vários barbeiros, um só padrão: excelência.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {barbers.map((barber) => {
          const mySchedules = schedules.filter((s) => s.barber_id === barber.id)
          const days = [...new Set(mySchedules.map((s) => s.weekday))].sort()
          const myServices = links
            .filter((l) => l.barber_id === barber.id && l.services)
            .map((l) => l.services as Service)

          return (
            <div key={barber.id} className="card p-6">
              <div className="flex items-start gap-4">
                {barber.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={barber.photo_url}
                    alt={barber.full_name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/30"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-lg font-bold text-amber-500 ring-2 ring-amber-500/30">
                    {initials(barber.full_name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-stone-100">{barber.full_name}</h2>
                  {barber.bio && (
                    <p className="mt-1 text-sm text-stone-500">{barber.bio}</p>
                  )}

                  {days.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        Atende:{' '}
                        {days.map((d, i) => (
                          <span key={d} className="text-stone-300">
                            {WEEKDAY_LABELS[d]}
                            {i < days.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}

                  {myServices.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {myServices.map((s) => (
                        <span key={s.id} className="badge border-stone-700 bg-stone-800/60 text-stone-400">
                          {s.name} · {formatBRL(s.price_cents)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <Link href={'/agendar?barbeiro=' + barber.id} className="btn btn-primary btn-sm w-full">
                  <Calendar className="h-4 w-4" />
                  Agendar com {barber.full_name.split(' ')[0]}
                </Link>
              </div>
            </div>
          )
        })}
        {barbers.length === 0 && (
          <p className="text-sm text-stone-500">Nenhum barbeiro cadastrado ainda.</p>
        )}
      </div>
    </main>
  )
}
