import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-serif text-7xl font-bold text-amber-500">404</p>
      <h1 className="text-xl font-semibold text-stone-200">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-stone-400">
        A página que você procura não existe ou foi movida.
      </p>
      <Link href="/" className="btn btn-primary">
        Voltar ao início
      </Link>
    </main>
  )
}
