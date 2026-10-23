import SiteHeader from '@/components/site-header'
import SiteHeaderMinimal from '@/components/site-header-minimal'
import SiteFooter from '@/components/site-footer'
import SellingHeader from '@/components/selling-header'
import SellingFooter from '@/components/selling-footer'
import { CartProvider } from '@/components/cart-provider'
import { getHostContext } from '@/lib/site'
import type { Establishment } from '@/lib/types'

function MinimalFooter({ establishment }: { establishment: Establishment }) {
  return (
    <footer className="border-t border-stone-800/80 bg-stone-900/30 py-8">
      <div className="mx-auto max-w-6xl space-y-1.5 px-4 text-center text-xs text-stone-400">
        <p className="font-serif text-sm font-bold uppercase tracking-wide text-stone-200">
          {establishment.name}
        </p>
        {establishment.address && <p>{establishment.address}</p>}
        <p>
          {establishment.opening_time.slice(0, 5)} às {establishment.closing_time.slice(0, 5)}
          {establishment.phone ? ' · ' + establishment.phone : ''}
        </p>
        <p className="pt-2 text-stone-500">
          © {new Date().getFullYear()} {establishment.name}
        </p>
      </div>
    </footer>
  )
}

export default async function PublicLayout({
  children,
}: { children: React.ReactNode }) {
  const host = await getHostContext()

  // subdomínio desconhecido: não vaza nada
  if (host.sub && !host.workspace && !host.company) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-serif text-5xl font-bold text-amber-500">404</p>
        <h1 className="text-lg font-semibold text-stone-200">Site não encontrado</h1>
        <p className="max-w-sm text-sm text-stone-400">
          O endereço <span className="font-mono text-stone-300">{host.sub}</span> não corresponde a
          nenhum site ativo.
        </p>
        <a href="/" className="btn btn-primary">Ir para o site principal</a>
      </main>
    )
  }

  // SITE DE UM PROFISSIONAL (subdomínio/caminho dele)
  if (host.workspace) {
    const { establishment, barbers } = host.workspace
    return (
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          <SiteHeaderMinimal establishment={establishment} barber={barbers[0] ?? null} />
          <main className="flex-1">{children}</main>
          <MinimalFooter establishment={establishment} />
        </div>
      </CartProvider>
    )
  }

  // SITE DE UMA EMPRESA (subdomínio/caminho dela)
  if (host.company) {
    return (
      <CartProvider>
        <div className="flex min-h-screen flex-col">
          <SiteHeaderMinimal establishment={host.company} barber={null} />
          <main className="flex-1">{children}</main>
          <MinimalFooter establishment={host.company} />
        </div>
      </CartProvider>
    )
  }

  // RAIZ DA PLATAFORMA = PÁGINA DE VENDAS
  // (sem links de marketplace — aqui é onde se vende o sistema)
  return (
    <div className="flex min-h-screen flex-col">
      <SellingHeader />
      <main className="flex-1">{children}</main>
      <SellingFooter />
    </div>
  )
}
