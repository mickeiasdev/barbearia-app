"use client"

import { useActionState } from 'react'
import { ImagePlus } from 'lucide-react'
import { uploadPortfolioPhotoAction, type AdminFormState } from '@/actions/admin'

export default function PortfolioForm({ barberId }: { barberId: string }) {
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    uploadPortfolioPhotoAction,
    {}
  )

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}
      {state.ok && state.notice && <div className="ok-box" role="status">{state.notice}</div>}

      <input type="hidden" name="barber_id" value={barberId} />

      <div>
        <label htmlFor={'pf-file-' + barberId} className="label">Foto do trabalho</label>
        <input
          id={'pf-file-' + barberId}
          name="photo_file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="input py-1.5 text-xs"
        />
      </div>

      <div>
        <label htmlFor={'pf-caption-' + barberId} className="label">Legenda (opcional)</label>
        <input
          id={'pf-caption-' + barberId}
          name="caption"
          placeholder="Ex.: Degradê navalhado"
          className="input py-1.5"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-outline btn-sm w-full">
        <ImagePlus className="h-3.5 w-3.5" />
        {isPending ? 'Enviando...' : 'Adicionar ao portfólio'}
      </button>
    </form>
  )
}
