import { requireAdminPage } from '@/lib/data'
import EstablishmentForm from '@/components/admin/establishment-form'

export default async function ConfiguracoesPage() {
  const { establishment } = await requireAdminPage()

  const sql1 = "insert into public.admin_emails (email) values ('novo-admin@email.com');"
  const sql2 = "update public.profiles set role = 'admin' where email = 'pessoa@email.com';"

  return (
    <div className="max-w-3xl">
      <h1 className="section-title">Configurações</h1>
      <p className="mt-2 text-sm text-stone-500">
        Dados da barbearia exibidos no site e usados nos agendamentos.
      </p>

      <div className="card mt-8 p-6 md:p-8">
        <h2 className="mb-6 font-semibold text-stone-100">
          {establishment ? 'Editar barbearia' : 'Primeira configuração'}
        </h2>
        <EstablishmentForm establishment={establishment} />
      </div>

      <div className="card mt-6 space-y-3 p-6 text-sm text-stone-400 md:p-8">
        <h2 className="font-semibold text-stone-100">Como adicionar outro administrador</h2>
        <p>
          No SQL Editor do Supabase, insira o e-mail da nova pessoa <strong>antes</strong>{' '}
          do cadastro dela:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-stone-950 p-4 text-xs text-amber-400">{sql1}</pre>
        <p>
          Depois é só cadastrar-se no site com esse e-mail — a conta nasce como admin.
          Para promover uma conta <strong>já existente</strong>:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-stone-950 p-4 text-xs text-amber-400">{sql2}</pre>
      </div>
    </div>
  )
}
