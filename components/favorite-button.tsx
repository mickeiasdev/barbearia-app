"use client"

import { Heart } from 'lucide-react'
import { toggleFavoriteAction } from '@/actions/booking'

interface Props {
  barberId: string
  barberName: string
  isFavorite: boolean
  loggedIn: boolean
  back: string
  className?: string
}

/** Coração de favorito — toggle via server action. */
export default function FavoriteButton({
  barberId,
  barberName,
  isFavorite,
  loggedIn,
  back,
  className,
}: Props) {
  const label = (isFavorite ? 'Remover ' : 'Favoritar ') + barberName.split(' ')[0]

  if (!loggedIn) {
    return (
      <a
        href={'/entrar?next=' + encodeURIComponent(back)}
        aria-label={label + ' (entrar)'}
        title="Entre para favoritar"
        className={className ?? 'btn btn-outline btn-sm'}
      >
        <Heart className="h-4 w-4" />
      </a>
    )
  }

  return (
    <form action={toggleFavoriteAction}>
      <input type="hidden" name="barber_id" value={barberId} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        aria-label={label}
        title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        className={className ?? 'btn btn-outline btn-sm'}
      >
        <Heart
          className={'h-4 w-4 ' + (isFavorite ? 'fill-amber-500 text-amber-500' : 'text-stone-400')}
        />
      </button>
    </form>
  )
}
