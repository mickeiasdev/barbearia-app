import Link from 'next/link'
import { Scissors, Calendar, User as UserIcon } from 'lucide-react'
import CartIndicator from '@/components/cart-indicator'
import { getCurrentUser } from '@/lib/data'
import { logoutAction } from '@/actions/auth'
import { APP_NAME } from '@/lib/utils'

export default async function SiteHeader() {
  const user = await getCurrentUser()
  const isAdmin = user?.profile?.role === 'admin'

  const navLink = 'text-sm text-stone-400 transition-colors hover:text-amber-400'

  return (
    <header className="sticky top-0 z-40 border-b border-stone-800/80 bg-stone-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
            <Scissors className="h-5 w-5" />
          </span>
          <span className="font-serif text-lg font-bold uppercase tracking-wide text-stone-100">
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/servicos" className={navLink}>Serviços</Link>
          <Link href="/barbeiros" className={navLink}>Barbeiros</Link>
          <Link href="/loja" className={navLink}>Loja</Link>
          {isAdmin && <Link href="/admin" className={navLink}>Painel Admin</Link>}
          {user?.profile?.role === 'barber' && (
            <Link href="/barbeiro" className={navLink}>Minha agenda</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <CartIndicator />
          {user ? (
            <>
              <Link
                href="/minha-conta"
                className="btn btn-outline btn-sm hidden md:inline-flex"
              >
                <UserIcon className="h-4 w-4" />
                {user.profile?.full_name?.split(' ')[0] || 'Minha conta'}
              </Link>
              <form action={logoutAction} className="hidden md:block">
                <button type="submit" className="btn btn-ghost btn-sm">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="btn btn-ghost btn-sm hidden md:inline-flex">
              Entrar
            </Link>
          )}
          <Link href="/agendar" className="btn btn-primary btn-sm">
            <Calendar className="h-4 w-4" />
            Agendar
          </Link>
        </div>
      </div>

      {/* nav mobile */}
      <nav className="flex items-center justify-center gap-6 border-t border-stone-800/60 px-4 py-2 md:hidden">
        <Link href="/servicos" className={navLink}>Serviços</Link>
        <Link href="/barbeiros" className={navLink}>Barbeiros</Link>
        <Link href="/loja" className={navLink}>Loja</Link>
        <Link href="/minha-conta" className={navLink}>
          {user ? 'Minha conta' : 'Entrar'}
        </Link>
      </nav>
    </header>
  )
}
