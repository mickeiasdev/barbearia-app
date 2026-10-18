import Link from 'next/link'
import type { Metadata } from 'next'
import LoginForm from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const sp = await searchParams
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '/'

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Bem-vindo de volta
        </h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          Entre para gerenciar seus agendamentos e pedidos.
        </p>

        <LoginForm next={next} />

        <p className="mt-6 text-center text-sm text-stone-500">
          Ainda não tem conta?{' '}
          <Link href="/registrar" className="font-medium text-amber-400 hover:text-amber-300">
            Cadastre-se
          </Link>
        </p>
      </div>
    </main>
  )
}
