import { Star } from 'lucide-react'

/** Nota média com estrelas (ex.: 4,6 ★ · 12 avaliações). */
export default function Stars({
  rating,
  count,
  className,
}: {
  rating: number
  count?: number
  className?: string
}) {
  const rounded = Math.round(rating)
  return (
    <span
      className={'inline-flex items-center gap-1 text-xs ' + (className ?? '')}
      aria-label={'Nota ' + rating.toFixed(1) + ' de 5' + (count ? ' com ' + count + ' avaliações' : '')}
    >
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={
              'h-3.5 w-3.5 ' +
              (i <= rounded ? 'fill-amber-500 text-amber-500' : 'text-stone-600')
            }
          />
        ))}
      </span>
      <span className="font-medium text-amber-400">{rating.toFixed(1)}</span>
      {typeof count === 'number' && (
        <span className="text-stone-400">
          ({count === 1 ? '1 avaliação' : count + ' avaliações'})
        </span>
      )}
    </span>
  )
}
