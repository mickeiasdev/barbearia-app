import Link from 'next/link'
import { Calendar, Scissors, User as UserIcon } from 'lucide-react'
import CartIndicator from '@/components/cart-indicator'
import { getCurrentUser } from '@/lib/data'
import { logoutAction } from '@/actions/auth'
import type { Barber, Establishment } from '@/lib/types'

/** Header do SITE de um profissional (subdomínio): sem links para concorrentes. */
export default async function SiteHeaderMinimal({
  establishment,
  barber,
}: {
  establishment: Establishment
  barber: Barber | null
}) {
  const brand = barber?.full_name ?? establishment.name
  const user = await getCurrentUser()

  return (
    <header className="sticky top-0 z-40 border-b border-stone-800/80 bg-stone-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          {barber?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={barber.photo_url}
              alt={barber.full_name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-amber-500/30"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
              <Scissors className="h-5 w-5" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-serif text-base font-bold uppercase tracking-wide text-stone-100">
              {brand}
            </span>
            {barber && (
              <span className="block truncate text-[11px] text-stone-400">
                {establishment.name}
              </span>
            )}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <CartIndicator />
          {user ? (
            <>
              <Link href="/minha-conta" className="btn btn-outline btn-sm">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {user.profile?.full_name?.split(' ')[0] || 'Minha conta'}
                </span>
              </Link>
              <form action={logoutAction} className="hidden md:block">
                <button type="submit" className="btn btn-ghost btn-sm">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="btn btn-ghost btn-sm">Entrar</Link>
          )}
          <Link href="/agendar" className="btn btn-primary btn-sm">
            <Calendar className="h-4 w-4" />
            Agendar
          </Link>
        </div>
      </div>
    </header>
  )
}
