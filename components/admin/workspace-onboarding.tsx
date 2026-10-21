import { Scissors } from 'lucide-react'
import WorkspaceCreateForm from '@/components/workspace-create-form'
import { claimWorkspaceAction } from '@/actions/auth'

interface Props {
  adminName: string
  unclaimed: { id: string; name: string }[]
  canClaim: boolean
}

/**
 * Estado "sem espaço": o profissional independente cria o próprio
 * espaço aqui. Superadmins também podem adotar um espaço antigo
 * sem dono (migração de dados legados).
 */
export default function WorkspaceOnboarding({ adminName, unclaimed, canClaim }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <div className="card p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-stone-950">
          <Scissors className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-serif text-2xl font-bold uppercase tracking-tight text-stone-100">
          Bem-vindo, {adminName.split(' ')[0]}!
        </h1>
        <p className="mb-6 mt-1 text-sm text-stone-400">
          Crie seu espaço de trabalho para cadastrar serviços, produtos, equipe e
          receber agendamentos — só você enxerga e gerencia o seu.
        </p>

        <WorkspaceCreateForm />

        {canClaim && unclaimed.length > 0 && (
          <div className="mt-8 border-t border-stone-800 pt-6">
            <h2 className="mb-2 text-sm font-semibold text-stone-200">
              Espaços antigos sem dono
            </h2>
            <p className="mb-3 text-xs text-stone-400">
              Você é administrador da plataforma: pode adotar um espaço existente para
              gerenciá-lo.
            </p>
            <ul className="space-y-2">
              {unclaimed.map((est) => (
                <li key={est.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-800 px-4 py-2.5">
                  <span className="min-w-0 truncate text-sm text-stone-300">{est.name}</span>
                  <form action={claimWorkspaceAction} className="shrink-0">
                    <input type="hidden" name="id" value={est.id} />
                    <button type="submit" className="btn btn-outline btn-sm">
                      Adotar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
