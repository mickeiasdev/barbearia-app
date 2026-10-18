import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, LogOut, Scissors, Store } from 'lucide-react'
import { getCurrentUser } from '@/lib/data'
import { logoutAction } from '@/actions/auth'
import { APP_NAME } from '@/lib/utils'

export const metadata: Metadata = { title: 'Minha agenda' }

export default async function BarbeiroLayout({
  children,
}: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-800/80 bg-stone-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/barbeiro" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
              <Scissors className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-serif text-sm font-bold uppercase tracking-wide text-stone-100">
                {APP_NAME}
              </span>
              <span className="block text-[11px] text-amber-500">Minha agenda</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-stone-400 sm:block">
              {user?.profile?.full_name?.split(' ')[0] ?? 'Barbeiro'}
            </span>
            <Link href="/" className="btn btn-outline btn-sm">
              <Store className="h-4 w-4" /> Ver site
            </Link>
            <form action={logoutAction}>
              <button type="submit" aria-label="Sair" className="btn btn-ghost btn-sm">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-6 flex items-center gap-2 text-stone-300">
          <CalendarCheck className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-stone-500">
            Confirme e conclua seus atendimentos — o cliente vê tudo em tempo real.
          </p>
        </div>
        {children}
      </main>
    </div>
  )
}
