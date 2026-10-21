import type { Metadata } from 'next'
import { Package, Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/utils'
import AddToCartButton from '@/components/add-to-cart-button'
import { redirect } from 'next/navigation'
import { requireKnownHost } from '@/lib/site'
import type { Product } from '@/lib/types'

export const metadata: Metadata = { title: 'Loja' }

type ProductWithPlace = Product & { establishment?: { name: string } | null }

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>
}) {
  const sp = await searchParams
  const activeCat = sp.cat && sp.cat !== 'todos' ? sp.cat : null
  const q = (sp.q ?? '').trim().replace(/[%_]/g, '')

  const supabase = await createClient()

  // subdomínio: a loja mostra apenas os produtos do profissional do site;
  // no site de uma EMPRESA, a loja fica na home (cada profissional tem a sua)
  const host = await requireKnownHost()
  if (host.company) redirect('/')
  const hostEstId = host.workspace?.establishment.id ?? null

  let query = supabase
    .from('products')
    .select('*, establishment:establishments(name)')
    .eq('is_active', true)
    .order('name')

  if (hostEstId) {
    query = query.eq('establishment_id', hostEstId)
  }

  if (activeCat) {
    query = query.eq('category', activeCat)
  }

  if (q) {
    query = query.ilike('name', '%' + q + '%')
  }

  let allQuery = supabase.from('products').select('category').eq('is_active', true)
  if (hostEstId) allQuery = allQuery.eq('establishment_id', hostEstId)

  const [{ data: productsData }, { data: allProducts }] = await Promise.all([
    query,
    allQuery,
  ])

  const products = (productsData ?? []) as unknown as ProductWithPlace[]
  const categories = [...new Set((allProducts ?? []).map((p) => (p as { category: string | null }).category).filter(Boolean))] as string[]

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title">Loja</h1>
      <p className="mt-2 text-sm text-stone-400">
        Produtos profissionais dos nossos barbeiros. Compre online e retire com o profissional.
      </p>

      {/* busca */}
      <form action="/loja" className="mt-6 flex max-w-md gap-2">
        {activeCat && <input type="hidden" name="cat" value={activeCat} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar produto..."
          aria-label="Buscar produto"
          className="input"
        />
        <button type="submit" className="btn btn-outline shrink-0" aria-label="Buscar">
          <Search className="h-4 w-4" />
        </button>
      </form>

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/loja"
            className={'badge ' + (!activeCat ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-stone-700 bg-stone-800/60 text-stone-400 hover:text-amber-400')}
          >
            Todos
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={'/loja?cat=' + encodeURIComponent(cat)}
              className={'badge ' + (activeCat === cat ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-stone-700 bg-stone-800/60 text-stone-400 hover:text-amber-400')}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="card flex flex-col p-5">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="mb-4 h-36 w-full rounded-lg object-cover"
              />
            ) : (
              <span className="mb-4 flex h-36 w-full items-center justify-center rounded-lg bg-stone-800/60 text-stone-400">
                <Package className="h-10 w-10" />
              </span>
            )}

            {product.category && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
                {product.category}
              </p>
            )}
            <h2 className="mt-0.5 font-semibold text-stone-100">{product.name}</h2>
            {product.establishment?.name && (
              <p className="mt-0.5 text-xs text-stone-400">por {product.establishment.name}</p>
            )}
            {product.description && (
              <p className="mt-1 line-clamp-2 flex-1 text-xs text-stone-400">
                {product.description}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold text-amber-500">{formatBRL(product.price_cents)}</span>
              <span className={'text-xs ' + (product.stock <= 3 ? 'text-red-400' : 'text-stone-400')}>
                {product.stock <= 0 ? 'Esgotado' : product.stock + ' em estoque'}
              </span>
            </div>

            <div className="mt-4">
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  price_cents: product.price_cents,
                  stock: product.stock,
                  establishment_id: product.establishment_id,
                  establishment_name: product.establishment?.name ?? 'profissional',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="card mt-8 p-10 text-center text-sm text-stone-400">
          Nenhum produto encontrado nesta categoria.
        </div>
      )}
    </main>
  )
}
