import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { APP_NAME } from '@/lib/utils'

export default function SiteFooter() {
  return (
    <footer className="border-t border-stone-800/80 bg-stone-900/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
              <Scissors className="h-4 w-4" />
            </span>
            <span className="font-serif text-base font-bold uppercase tracking-wide text-stone-100">
              {APP_NAME}
            </span>
          </div>
          <p className="max-w-xs text-sm text-stone-400">
            Plataforma de profissionais independentes: cada barbeiro com seu
            próprio espaço, agenda, serviços e produtos.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="label">Para clientes</p>
          <div className="flex flex-col gap-2">
            <Link href="/barbeiros" className="text-stone-400 hover:text-amber-400">Encontrar profissional</Link>
            <Link href="/servicos" className="text-stone-400 hover:text-amber-400">Serviços</Link>
            <Link href="/loja" className="text-stone-400 hover:text-amber-400">Loja</Link>
            <Link href="/minha-conta" className="text-stone-400 hover:text-amber-400">Minha conta</Link>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <p className="label">Para profissionais</p>
          <div className="flex flex-col gap-2">
            <Link href="/entrar" className="text-stone-400 hover:text-amber-400">Entrar no meu painel</Link>
          </div>
          <p className="pt-2 text-xs text-stone-400">
            Acesso por convite: só o administrador master cadastra barbeiros e
            espaços. Agenda própria, loja, Pix e relatórios para cada profissional.
          </p>
        </div>
      </div>
      <div className="border-t border-stone-800/60 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
      </div>
    </footer>
  )
}
