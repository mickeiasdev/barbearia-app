import type { Metadata } from 'next'
import { Package } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/utils'
import AddToCartButton from '@/components/add-to-cart-button'
import type { Product } from '@/lib/types'

export const metadata: Metadata = { title: 'Loja' }

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const sp = await searchParams
  const activeCat = sp.cat && sp.cat !== 'todos' ? sp.cat : null

  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (activeCat) {
    query = query.eq('category', activeCat)
  }

  const [{ data: productsData }, { data: allProducts }] = await Promise.all([
    query,
    supabase.from('products').select('category').eq('is_active', true),
  ])

  const products = (productsData ?? []) as Product[]
  const categories = [...new Set((allProducts ?? []).map((p) => p.category).filter(Boolean))] as string[]

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="section-title">Loja</h1>
      <p className="mt-2 text-sm text-stone-500">
        Produtos profissionais usados pelos nossos barbeiros. Compre online e retire na barbearia.
      </p>

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
              <span className="mb-4 flex h-36 w-full items-center justify-center rounded-lg bg-stone-800/60 text-stone-600">
                <Package className="h-10 w-10" />
              </span>
            )}

            {product.category && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">
                {product.category}
              </p>
            )}
            <h2 className="mt-0.5 font-semibold text-stone-100">{product.name}</h2>
            {product.description && (
              <p className="mt-1 line-clamp-2 flex-1 text-xs text-stone-500">
                {product.description}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold text-amber-500">{formatBRL(product.price_cents)}</span>
              <span className={'text-xs ' + (product.stock <= 3 ? 'text-red-400' : 'text-stone-500')}>
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
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="card mt-8 p-10 text-center text-sm text-stone-500">
          Nenhum produto encontrado nesta categoria.
        </div>
      )}
    </main>
  )
}
