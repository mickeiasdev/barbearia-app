import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { requireAdminPage } from '@/lib/data'
import EstablishmentForm from '@/components/admin/establishment-form'
import CompanyManagersManager, { type ManagerRow } from '@/components/admin/company-managers-manager'

export default async function EmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, company, user } = await requireAdminPage()
  if (!company) redirect('/admin')

  const { data: adminsData } = await supabase
    .from('establishment_admins')
    .select('profile_id, profile:profiles(full_name, email)')
    .eq('establishment_id', company.id)

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

  return (
    <div className="max-w-3xl">
      <h1 className="section-title flex items-center gap-3">
        <Building2 className="h-7 w-7 text-amber-500" /> Minha empresa
      </h1>
      <p className="mt-2 text-sm text-stone-400">
        Você gerencia a <strong className="text-stone-200">{company.name}</strong> — ajuste os
        dados como preferir e adicione outros gerenciadores.
      </p>

      {sp.ok && <div className="ok-box mt-6" role="status">Operação realizada com sucesso.</div>}
      {sp.erro && <div className="error-box mt-6" role="alert">{sp.erro}</div>}

      <div className="card mt-8 p-6 md:p-8">
        <h2 className="mb-6 font-semibold text-stone-100">Dados da empresa</h2>
        <EstablishmentForm establishment={company} mode="company" />
      </div>

      <div className="card mt-6 p-6 md:p-8">
        <CompanyManagersManager managers={managers} />
      </div>
    </div>
  )
}
