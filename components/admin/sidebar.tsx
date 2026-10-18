"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Scissors,
  Settings,
  Sparkles,
  Store,
} from 'lucide-react'
import { logoutAction } from '@/actions/auth'
import { APP_NAME } from '@/lib/utils'

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/agendamentos', label: 'Agendamentos', icon: Calendar },
  { href: '/admin/barbeiros', label: 'Barbeiros', icon: Scissors },
  { href: '/admin/servicos', label: 'Serviços', icon: Sparkles },
  { href: '/admin/produtos', label: 'Produtos', icon: Package },
  { href: '/admin/vendas', label: 'Vendas', icon: Receipt },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

function useActive(href: string, exact?: boolean) {
  const pathname = usePathname()
  return exact ? pathname === href : pathname.startsWith(href)
}

function NavLink({ href, label, icon: Icon, exact }: { href: string; label: string; icon: typeof Calendar; exact?: boolean }) {
  const active = useActive(href, exact)
  return (
    <Link
      href={href}
      className={
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
        (active
          ? 'bg-amber-500 text-stone-950'
          : 'text-stone-400 hover:bg-stone-800/70 hover:text-amber-400')
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  )
}

export default function AdminSidebar({
  adminName,
  establishmentName,
}: {
  adminName: string
  establishmentName: string | null
}) {
  return (
    <>
      {/* ===== sidebar desktop ===== */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-800/80 bg-stone-900/40 p-4 md:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-2 pt-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
            <Scissors className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-stone-100">
              {APP_NAME}
            </span>
            <span className="block truncate text-[11px] text-stone-500">Painel admin</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>

        <div className="mt-4 border-t border-stone-800/80 pt-4">
          <p className="truncate px-3 pb-1 text-xs text-stone-500">
            {establishmentName ?? 'Configure o estabelecimento'}
          </p>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-stone-800/70 hover:text-amber-400"
          >
            <Store className="h-4 w-4" /> Ver site
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-stone-400 hover:bg-stone-800/70 hover:text-amber-400"
            >
              <LogOut className="h-4 w-4" /> Sair ({adminName.split(' ')[0]})
            </button>
          </form>
        </div>
      </aside>

      {/* ===== nav mobile ===== */}
      <div className="fixed inset-x-0 top-0 z-40 border-b border-stone-800/80 bg-stone-950/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
              <Scissors className="h-4 w-4" />
            </span>
            <span className="font-serif text-sm font-bold uppercase text-stone-100">Admin</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" aria-label="Sair" className="btn btn-ghost btn-sm">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {LINKS.map((l) => (
            <div key={l.href} className="shrink-0">
              <NavLink {...l} />
            </div>
          ))}
        </nav>
      </div>
    </>
  )
}
