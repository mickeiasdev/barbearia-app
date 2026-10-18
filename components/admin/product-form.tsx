"use client"

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { saveProductAction, type AdminFormState } from '@/actions/admin'
import { centsToInput } from '@/lib/utils'
import type { Product } from '@/lib/types'

export default function ProductForm({ product }: { product: Product | null }) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    saveProductAction,
    {}
  )

  const key = product?.id ?? 'new'

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <div className="error-box">{state.error}</div>}
      {state.ok && !state.error && (
        <div className="ok-box">Produto salvo com sucesso!</div>
      )}

      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor={'prod-name-' + key}>Nome *</label>
          <input
            id={'prod-name-' + key}
            name="name"
            required
            defaultValue={product?.name ?? ''}
            className="input"
            placeholder="Ex.: Pomada Modeladora"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={'prod-desc-' + key}>Descrição</label>
          <input
            id={'prod-desc-' + key}
            name="description"
            defaultValue={product?.description ?? ''}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor={'prod-cat-' + key}>Categoria</label>
          <input
            id={'prod-cat-' + key}
            name="category"
            defaultValue={product?.category ?? ''}
            className="input"
            placeholder="Pomadas, Barba..."
          />
        </div>
        <div>
          <label className="label" htmlFor={'prod-img-' + key}>Imagem (URL)</label>
          <input
            id={'prod-img-' + key}
            name="image_url"
            type="url"
            defaultValue={product?.image_url ?? ''}
            className="input"
            placeholder="https://..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={'prod-file-' + key}>
            …ou envie uma imagem do computador (JPG/PNG/WebP, máx. 4MB)
          </label>
          <input
            id={'prod-file-' + key}
            name="image_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-stone-950"
          />
          {product?.image_url && (
            <p className="mt-2 flex items-center gap-2 text-xs text-stone-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
              Imagem atual — envie outra para substituir.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor={'prod-price-' + key}>Preço (R$) *</label>
          <input
            id={'prod-price-' + key}
            name="price"
            required
            inputMode="decimal"
            defaultValue={product ? centsToInput(product.price_cents) : ''}
            className="input"
            placeholder="35,00"
          />
        </div>
        <div>
          <label className="label" htmlFor={'prod-stock-' + key}>Estoque *</label>
          <input
            id={'prod-stock-' + key}
            name="stock"
            type="number"
            required
            min={0}
            defaultValue={product?.stock ?? 0}
            className="input"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={product ? product.is_active : true}
          className="h-4 w-4 accent-amber-500"
        />
        Produto ativo (aparece na loja)
      </label>

      <button type="submit" disabled={isPending} className="btn btn-primary">
        <Save className="h-4 w-4" />
        {isPending ? 'Salvando...' : product ? 'Salvar produto' : 'Cadastrar produto'}
      </button>
    </form>
  )
}
