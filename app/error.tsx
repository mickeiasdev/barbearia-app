'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const needsSetup = String(error.message || '').includes('Supabase')

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <h2 className="font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
        {needsSetup ? 'Configuração necessária' : 'Algo deu errado'}
      </h2>
      {needsSetup ? (
        <div className="max-w-md space-y-2 text-sm text-stone-500">
          <p>As variáveis do Supabase ainda não foram configuradas.</p>
          <p className="text-stone-400">
            1. Copie <code className="rounded bg-stone-900 px-1.5 py-0.5 text-amber-400">.env.example</code> para{' '}
            <code className="rounded bg-stone-900 px-1.5 py-0.5 text-amber-400">.env.local</code>
            <br />
            2. Preencha com a URL e a chave anônima do seu projeto Supabase
            <br />
            3. Reinicie o servidor com <code className="rounded bg-stone-900 px-1.5 py-0.5 text-amber-400">npm run dev</code>
          </p>
        </div>
      ) : (
        <p className="max-w-md text-sm text-stone-500">
          Ocorreu um erro inesperado. Tente novamente em instantes.
        </p>
      )}
      <div className="flex gap-3">
        <button onClick={reset} className="btn btn-primary">
          Tentar novamente
        </button>
        <Link href="/" className="btn btn-outline">
          Início
        </Link>
      </div>
    </main>
  )
}
