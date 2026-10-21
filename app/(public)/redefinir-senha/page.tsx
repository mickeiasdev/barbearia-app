import Link from 'next/link'
import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/auth/reset-password-form'

export const metadata: Metadata = { title: 'Redefinir senha' }

export default function RedefinirSenhaPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Criar nova senha
        </h1>
        <p className="mb-6 mt-1 text-sm text-stone-400">
          Defina a nova senha da sua conta.
        </p>

        <ResetPasswordForm />

        <p className="mt-6 text-center text-sm text-stone-400">
          Depois de redefinir,{' '}
          <Link href="/entrar" className="font-medium text-amber-400 hover:text-amber-300">
            entre com a nova senha
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
