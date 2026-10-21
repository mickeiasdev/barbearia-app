import { redirect } from 'next/navigation'
import { Building2, UserPlus } from 'lucide-react'
import { requireAdminPage } from '@/lib/data'
import EstablishmentForm from '@/components/admin/establishment-form'
import CompanyManagersManager, { type ManagerRow } from '@/components/admin/company-managers-manager'
import MasterBarberForm from '@/components/admin/master-barber-form'

export default async function EmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, company, user } = await requireAdminPage()
  if (!company) redirect('/admin')

  const [{ data: adminsData }, { data: childrenData }] = await Promise.all([
    supabase
      .from('establishment_admins')
      .select('profile_id, profile:profiles(full_name, email)')
      .eq('establishment_id', company.id),
    supabase
      .from('establishments')
      .select('id, name')
      .eq('parent_id', company.id)
      .order('name'),
  ])

  const managers: ManagerRow[] = (adminsData ?? []).map((r) => {
    const row = r as unknown as {
      profile_id: string
      profile: { full_name: string; email: string | null } | null
    }
    return {
      profile_id: row.profile_id,
      full_name: row.profile?.full_name ?? '—',
      email: row.profile?.email ?? null,
      is_me: row.profile_id === user.id,
    }
  })

  const team = (childrenData ?? []) as { id: string; name: string }[]
  const isTrialOrPaid = company.plan !== 'free'
  const canAddBarber = isTrialOrPaid || team.length < 1

  return (
    <div className="max-w-3xl">
      <h1 className="section-title flex items-center gap-3">
        <Building2 className="h-7 w-7 text-amber-500" /> Minha empresa
      </h1>
      <p className="mt-2 text-sm text-stone-400">
        Você gerencia a <strong className="text-stone-200">{company.name}</strong> — ajuste os
        dados como preferir, cadastre barbeiros e adicione gerenciadores.
      </p>

      {sp.ok && <div className="ok-box mt-6" role="status">{sp.ok}</div>}
      {sp.erro && <div className="error-box mt-6" role="alert">{sp.erro}</div>}

      {/* ===== barbeiros da empresa ===== */}
      <div className="card mt-8 p-6 md:p-8">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-stone-100">
          <UserPlus className="h-5 w-5 text-amber-500" /> Barbeiros da empresa
        </h2>
        <p className="mb-5 text-xs text-stone-400">
          Cada barbeiro ganha login próprio, espaço independente (serviços, produtos,
          clientes e vendas) e um site individual — tudo dentro da sua empresa.
        </p>

        {team.length > 0 && (
          <ul className="mb-6 divide-y divide-stone-800/70 rounded-lg border border-stone-800">
            {team.map((child) => (
              <li key={child.id} className="px-4 py-3 text-sm text-stone-200">
                {child.name.split(' — ').slice(-1)[0]}
                <span className="ml-2 text-xs text-stone-400">{child.name}</span>
              </li>
            ))}
          </ul>
        )}

        {canAddBarber ? (
          <MasterBarberForm companies={[{ id: company.id, name: company.name }]} />
        ) : (
          <div className="ok-box flex flex-wrap items-center justify-between gap-3">
            <span>
              Plano Grátis permite 1 profissional. Assine o Pro para cadastrar mais
              barbeiros.
            </span>
            <a href="/assinar" className="btn btn-primary btn-sm shrink-0">Ver planos</a>
          </div>
        )}
      </div>

      {/* ===== dados da empresa ===== */}
      <div className="card mt-6 p-6 md:p-8">
        <h2 className="mb-6 font-semibold text-stone-100">Dados da empresa</h2>
        <EstablishmentForm establishment={company} mode="company" />
      </div>

      {/* ===== gerenciadores ===== */}
      <div className="card mt-6 p-6 md:p-8">
        <CompanyManagersManager managers={managers} />
      </div>
    </div>
  )
}
