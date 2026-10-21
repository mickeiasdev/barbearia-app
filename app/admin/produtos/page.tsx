import Link from 'next/link'
import { requireAdminPage } from '@/lib/data'
import { formatBRL } from '@/lib/utils'
import ProductForm from '@/components/admin/product-form'
import { deleteProductAction, toggleProductAction } from '@/actions/admin'
import type { Product } from '@/lib/types'
import ActionButton from '@/components/admin/action-button'

export default async function AdminProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, establishment } = await requireAdminPage()

  if (!establishment) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="text-sm text-stone-400">
          Configure o estabelecimento antes de cadastrar produtos.
        </p>
        <Link href="/admin/configuracoes" className="btn btn-primary mt-4">
          Ir para Configurações
        </Link>
      </div>
    )
  }

  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .order('name')
  const products = (productsData ?? []) as Product[]

  return (
    <div>
      <h1 className="section-title">Produtos</h1>
      <p className="mt-2 text-sm text-stone-400">
        {products.length} produto(s) — vendidos na loja online e no PDV.
      </p>

      {sp.ok && <div className="ok-box mt-6">Operação realizada com sucesso.</div>}
      {sp.erro && <div className="error-box mt-6">{sp.erro}</div>}

      {/* novo produto */}
      <details className="card mt-8 p-0">
        <summary className="cursor-pointer select-none px-6 py-4 font-semibold text-amber-400 hover:text-amber-300">
          + Cadastrar novo produto
        </summary>
        <div className="border-t border-stone-800/80 p-6">
          <ProductForm product={null} />
        </div>
      </details>

      {/* lista */}
      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-stone-800/80">
              <th className="table-head">Produto</th>
              <th className="table-head">Categoria</th>
              <th className="table-head">Preço</th>
              <th className="table-head">Estoque</th>
              <th className="table-head">Status</th>
              <th className="table-head">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="table-cell">
                  <p className="font-medium text-stone-100">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-stone-400">{product.description}</p>
                  )}
                </td>
                <td className="table-cell">{product.category ?? '—'}</td>
                <td className="table-cell font-semibold text-amber-500">
                  {formatBRL(product.price_cents)}
                </td>
                <td className="table-cell">
                  <span
                    className={
                      'font-bold ' +
                      (product.stock === 0
                        ? 'text-red-400'
                        : product.stock <= 5
                          ? 'text-amber-400'
                          : 'text-stone-300')
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={'badge ' + (product.is_active
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-stone-700 bg-stone-800 text-stone-400')}>
                    {product.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    <form action={toggleProductAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <ActionButton className="btn btn-outline btn-sm" pendingLabel="Salvando...">
                        {product.is_active ? 'Desativar' : 'Ativar'}
                      </ActionButton>
                    </form>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <ActionButton className="btn btn-danger btn-sm" pendingLabel="Excluindo..." confirmMessage="Excluir este produto? Pedidos antigos são mantidos.">Excluir</ActionButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="table-cell py-10 text-center text-stone-400">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* editar */}
      <div className="mt-6 space-y-3">
        {products.map((product) => (
          <details key={product.id} className="card p-0">
            <summary className="cursor-pointer select-none px-6 py-4 text-sm font-medium text-stone-300 hover:text-amber-400">
              Editar — {product.name}
            </summary>
            <div className="border-t border-stone-800/80 p-6">
              <ProductForm product={product} />
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
