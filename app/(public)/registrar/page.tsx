import Link from 'next/link'
import type { Metadata } from 'next'
import RegisterForm from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Criar conta' }

export default function RegistrarPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Criar conta
        </h1>
        <p className="mb-6 mt-1 text-sm text-stone-500">
          Leva menos de um minuto para começar a agendar.
        </p>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-stone-500">
          Já tem conta?{' '}
          <Link href="/entrar" className="font-medium text-amber-400 hover:text-amber-300">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
