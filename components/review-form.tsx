"use client"

import { useActionState, useState } from 'react'
import { Star } from 'lucide-react'
import { createReviewAction, type ReviewState } from '@/actions/booking'

export default function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const [state, formAction, isPending] = useActionState<ReviewState, FormData>(
    createReviewAction,
    {}
  )
  const [rating, setRating] = useState(5)
  const [hover, setHover] = useState(0)

  if (state.ok) {
    return <div className="ok-box" role="status">{state.notice ?? 'Obrigado pela avaliação!'}</div>
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.error && <div className="error-box" role="alert">{state.error}</div>}

      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <span className="label">Sua nota</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={i + (i === 1 ? ' estrela' : ' estrelas')}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="cursor-pointer"
            >
              <Star
                className={
                  'h-6 w-6 transition-colors ' +
                  (i <= (hover || rating) ? 'fill-amber-500 text-amber-500' : 'text-stone-600')
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={'rev-' + appointmentId} className="label">
          Comentário (opcional)
        </label>
        <textarea
          id={'rev-' + appointmentId}
          name="comment"
          rows={2}
          maxLength={600}
          className="input resize-none"
          placeholder="Como foi o atendimento?"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary btn-sm">
        <Star className="h-3.5 w-3.5" />
        {isPending ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </form>
  )
}
