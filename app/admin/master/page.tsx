import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { requireAdminPage } from '@/lib/data'
import ActionButton from '@/components/admin/action-button'
import MasterBarberForm from '@/components/admin/master-barber-form'
import { masterToggleBarberAction, masterSetWorkspaceAction } from '@/actions/master'
import type { Barber, Establishment } from '@/lib/types'

export default async function MasterPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, isMaster } = await requireAdminPage()
  if (!isMaster) redirect('/admin')

  const [{ data: estsData }, { data: barbersData }] = await Promise.all([
    supabase
      .from('establishments')
      .select('*')
      .order('name'),
    supabase
      .from('barbers')
      .select('*, profile:profiles(email), establishment:establishments(name, slug)')
      .order('full_name'),
  ])

  const spaces = (estsData ?? []) as unknown as Establishment[]
  const barbers = (barbersData ?? []) as unknown as (Barber & {
    profile?: { email: string | null } | null
    establishment?: { name: string; slug: string | null } | null
  })[]

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-amber-500" /> Painel Master
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            Só você vê esta área: cadastra barbeiros com login, define onde cada um
            trabalha e gerencia qualquer espaço da plataforma.
          </p>
        </div>
      </div>

      {sp.ok && <div className="ok-box mt-6" role="status">{sp.ok}</div>}
      {sp.erro && <div className="error-box mt-6" role="alert">{sp.erro}</div>}

      {/* ===== cadastrar barbeiro ===== */}
      <div className="card mt-8 p-6">
        <h2 className="mb-1 font-semibold text-stone-100">Cadastrar barbeiro</h2>
        <p className="mb-6 text-xs text-stone-400">
          Cria o login, o espaço de trabalho dele e o registro no site — tudo em um
          passo. Ninguém além de você pode criar profissionais.
        </p>
        <MasterBarberForm spaces={spaces.map((s) => ({ id: s.id, name: s.name }))} />
      </div>

      {/* ===== barbeiros ===== */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-semibold text-stone-100">Barbeiros da plataforma</h2>
        {barbers.length === 0 ? (
          <p className="text-sm text-stone-400">Nenhum barbeiro cadastrado ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-800/70">
            {barbers.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-stone-200">
                    {b.full_name}
                    <span
                      className={
                        'badge ' +
                        (b.is_active
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-stone-700 bg-stone-800/60 text-stone-400')
                      }
                    >
                      {b.is_active ? 'Ativo' : 'Sem acesso'}
                    </span>
                  </p>
                  <p className="truncate text-xs text-stone-400">
                    {b.establishment?.name ?? '—'} · login: {b.profile?.email ?? '—'} ·
                    comissão {Number(b.commission_pct)}%
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <form action={masterSetWorkspaceAction}>
                    <input type="hidden" name="id" value={b.establishment_id} />
                    <button type="submit" className="btn btn-outline btn-sm">
                      Gerenciar espaço
                    </button>
                  </form>
                  <form action={masterToggleBarberAction}>
                    <input type="hidden" name="id" value={b.id} />
                    {b.is_active ? (
                      <ActionButton
                        className="btn btn-danger btn-sm"
                        pendingLabel="Removendo..."
                        confirmMessage={
                          'Remover o acesso de ' + b.full_name.split(' ')[0] +
                          '? Ele deixa de entrar no painel e some do site (os registros antigos ficam).'
                        }
                      >
                        Remover acesso
                      </ActionButton>
                    ) : (
                      <ActionButton className="btn btn-outline btn-sm" pendingLabel="Reativando...">
                        Reativar
                      </ActionButton>
                    )}
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== espaços ===== */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-semibold text-stone-100">Espaços</h2>
        <ul className="divide-y divide-stone-800/70">
          {spaces.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-200">{s.name}</p>
                <p className="truncate text-xs text-stone-400">
                  {s.address ?? 'Sem endereço'} · perfil: /p/{s.slug ?? '—'}
                </p>
              </div>
              <form action={masterSetWorkspaceAction} className="shrink-0">
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" className="btn btn-outline btn-sm">
                  Gerenciar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
