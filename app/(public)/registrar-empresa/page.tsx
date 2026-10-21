import Link from 'next/link'
import type { Metadata } from 'next'
import RegisterTenantForm from '@/components/auth/register-tenant-form'
import { getCurrentUser } from '@/lib/data'

export const metadata: Metadata = { title: 'Criar minha barbearia' }

export default async function RegistrarEmpresaPage() {
  const user = await getCurrentUser()

  return (
    <main className="mx-auto flex max-w-xl flex-col justify-center px-4 py-16">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Criar minha barbearia
        </h1>
        <p className="mb-6 mt-1 text-sm text-stone-400">
          Em 1 minuto você tem o painel completo: agendamentos, site próprio para cada
          barbeiro, PDV e Pix direto na sua conta.
        </p>

        {user?.profile?.role === 'client' ? (
          <RegisterTenantForm loggedIn />
        ) : user ? (
          <div className="space-y-4">
            <div className="ok-box">
              Você já tem uma conta. Verifique em <strong>Minha empresa</strong> se já
              administra uma barbearia.
            </div>
            <Link href="/admin/empresa" className="btn btn-primary w-full">Ir para Minha empresa</Link>
          </div>
        ) : (
          <RegisterTenantForm loggedIn={false} />
        )}

        <p className="mt-6 text-center text-sm text-stone-400">
          Já é cliente?{' '}
          <Link href="/entrar" className="font-medium text-amber-400 hover:text-amber-300">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
