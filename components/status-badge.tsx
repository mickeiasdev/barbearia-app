import { STATUS_LABEL } from '@/lib/utils'

export default function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    confirmed: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    cancelled: 'border-red-500/30 bg-red-500/10 text-red-400',
    no_show: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  }

  return (
    <span className={'badge ' + (colors[status] ?? 'border-stone-700 bg-stone-800 text-stone-400')}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
