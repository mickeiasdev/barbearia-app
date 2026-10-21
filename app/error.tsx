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
        <div className="max-w-md space-y-2 text-sm text-stone-400">
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
        <div className="max-w-md space-y-3 text-sm text-stone-400">
          <p>Ocorreu um erro inesperado. Tente novamente em instantes.</p>
          <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-4 text-left">
            <p className="mb-2 font-semibold text-stone-200">Acabou de fazer deploy? Verifique:</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-stone-400">
              <li>
                Variáveis de ambiente na Vercel (Settings → Environment Variables):
                <code className="mx-1 rounded bg-stone-950 px-1 py-0.5 text-amber-400">NEXT_PUBLIC_SUPABASE_URL</code> e
                <code className="mx-1 rounded bg-stone-950 px-1 py-0.5 text-amber-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              </li>
              <li>
                Depois de adicionar/alterar variáveis, é preciso{' '}
                <strong className="text-stone-200">Redeploy</strong> (Deployments → ⋯ → Redeploy)
                — elas só são aplicadas no momento do build.
              </li>
              <li>
                Se o problema continuar, veja o erro real em{' '}
                <strong className="text-stone-200">Deployments → Runtime Logs</strong>.
              </li>
            </ol>
            {error.digest && (
              <p className="mt-2 text-[11px] text-stone-500">
                Código do erro para o suporte: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>
        </div>
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
