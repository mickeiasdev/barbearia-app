export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span
        aria-label="Carregando"
        className="h-10 w-10 animate-spin rounded-full border-2 border-stone-700 border-t-amber-500"
      />
    </div>
  )
}
