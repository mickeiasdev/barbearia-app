import Link from 'next/link'
import { Scissors, Phone, MapPin, Instagram, Clock } from 'lucide-react'
import type { Establishment } from '@/lib/types'
import { APP_NAME } from '@/lib/utils'

export default function SiteFooter({ establishment }: { establishment: Establishment | null }) {
  const info = establishment

  return (
    <footer className="border-t border-stone-800/80 bg-stone-900/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
              <Scissors className="h-4 w-4" />
            </span>
            <span className="font-serif text-base font-bold uppercase tracking-wide text-stone-100">
              {info?.name ?? APP_NAME}
            </span>
          </div>
          <p className="max-w-xs text-sm text-stone-500">
            {info?.address ?? 'Barbearia completa: agendamentos online e produtos profissionais.'}
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="label">Contato</p>
          {info?.phone && (
            <p className="flex items-center gap-2 text-stone-400">
              <Phone className="h-4 w-4 text-amber-500" /> {info.phone}
            </p>
          )}
          {info?.instagram && (
            <p className="flex items-center gap-2 text-stone-400">
              <Instagram className="h-4 w-4 text-amber-500" /> {info.instagram}
            </p>
          )}
          {info?.address && (
            <p className="flex items-center gap-2 text-stone-400">
              <MapPin className="h-4 w-4 text-amber-500" /> {info.address}
            </p>
          )}
          {!info && <p className="text-stone-500">Contato não configurado.</p>}
        </div>

        <div className="space-y-3 text-sm">
          <p className="label">Funcionamento</p>
          <p className="flex items-center gap-2 text-stone-400">
            <Clock className="h-4 w-4 text-amber-500" />
            Seg a Sáb — {info ? info.opening_time.slice(0, 5) + ' às ' + info.closing_time.slice(0, 5) : '09:00 às 19:00'}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/servicos" className="text-stone-400 hover:text-amber-400">Nossos serviços</Link>
            <Link href="/agendar" className="text-stone-400 hover:text-amber-400">Agendar horário</Link>
            <Link href="/loja" className="text-stone-400 hover:text-amber-400">Loja</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-stone-800/60 py-4 text-center text-xs text-stone-600">
        © {new Date().getFullYear()} {info?.name ?? APP_NAME}. Todos os direitos reservados.
      </div>
    </footer>
  )
}
