import Link from 'next/link'
import { Store } from 'lucide-react'
import { getCurrentUser } from '@/lib/data'
import { APP_NAME } from '@/lib/utils'

/**
 * Header da página de VENDAS (raiz da plataforma).
 * Sem links de marketplace (barbeiros/serviços/loja) —
 * aqui é onde você vende o sistema, não onde o cliente agenda.
 */
export default async function SellingHeader() {
  const user = await getCurrentUser()

  const navLink = 'text-sm text-stone-400 transition-colors hover:text-amber-400'

  return (
    <header className="sticky top-0 z-40 border-b border-stone-800/80 bg-stone-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
            <Store className="h-5 w-5" />
          </span>
          <span className="font-serif text-lg font-bold uppercase tracking-wide text-stone-100">
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="#recursos" className={navLink}>Recursos</a>
          <a href="#planos" className={navLink}>Planos</a>
          <a href="#faq" className={navLink}>Dúvidas</a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href={user.profile?.role === 'admin' ? '/admin' : '/minha-conta'} className="btn btn-ghost btn-sm">
              Meu painel
            </Link>
          ) : (
            <Link href="/entrar" className="btn btn-ghost btn-sm">Entrar</Link>
          )}
          <Link href="/registrar-empresa" className="btn btn-primary btn-sm">
            Criar meu negócio
          </Link>
        </div>
      </div>
    </header>
  )
}
