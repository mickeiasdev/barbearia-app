import Link from 'next/link'
import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/forgot-password-form'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function RecuperarSenhaPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Recuperar senha
        </h1>
        <p className="mb-6 mt-1 text-sm text-stone-400">
          Informe seu e-mail e enviaremos um link para você criar uma nova senha.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-stone-400">
          Lembrou a senha?{' '}
          <Link href="/entrar" className="font-medium text-amber-400 hover:text-amber-300">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
