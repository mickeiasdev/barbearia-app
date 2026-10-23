import { Store } from 'lucide-react'
import { APP_NAME } from '@/lib/utils'

/** Footer da página de vendas — simples, sem links de marketplace. */
export default function SellingFooter() {
  return (
    <footer className="border-t border-stone-800/70 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center">
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-stone-950">
            <Store className="h-4 w-4" />
          </span>
          <span className="font-serif text-sm font-bold uppercase tracking-wide text-stone-200">
            {APP_NAME}
          </span>
        </span>
        <p className="text-xs text-stone-500">
          Sistema de agendamento e gestão para barbearias, salões, estética,
          unhas, tatuagem e personal trainers.
        </p>
        <p className="text-xs text-stone-600">
          © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
