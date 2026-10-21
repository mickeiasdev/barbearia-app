import { requireAdminPage } from '@/lib/data'
import EstablishmentForm from '@/components/admin/establishment-form'
import SpaceAdminsManager, { type AdminRow } from '@/components/admin/space-admins-manager'

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, establishment, profile } = await requireAdminPage()
  if (!establishment) return null

  const { data: adminsData } = await supabase
    .from('establishment_admins')
    .select('profile_id, profile:profiles(full_name, email)')
    .eq('establishment_id', establishment.id)

  const admins: AdminRow[] = (adminsData ?? []).map((r) => {
    const row = r as unknown as {
      profile_id: string
      profile: { full_name: string; email: string | null } | null
    }
    return {
      profile_id: row.profile_id,
      full_name: row.profile?.full_name ?? '—',
      email: row.profile?.email ?? null,
      is_owner: row.profile_id === establishment.owner_id,
      is_me: row.profile_id === profile.id,
    }
  })

  // garante que o dono sempre apareça na lista
  if (establishment.owner_id && !admins.some((a) => a.profile_id === establishment.owner_id)) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', establishment.owner_id)
      .maybeSingle()
    const o = owner as { full_name: string; email: string | null } | null
    if (o) {
      admins.unshift({
        profile_id: establishment.owner_id,
        full_name: o.full_name,
        email: o.email,
        is_owner: true,
        is_me: establishment.owner_id === profile.id,
      })
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="section-title">Configurações</h1>
      <p className="mt-2 text-sm text-stone-400">
        Dados do seu espaço exibidos no site e usados nos agendamentos.
      </p>

      {sp.ok && (
        <div className="ok-box mt-6" role="status">Operação realizada com sucesso.</div>
      )}
      {sp.erro && (
        <div className="error-box mt-6" role="alert">{sp.erro}</div>
      )}

      <div className="card mt-8 p-6 md:p-8">
        <h2 className="mb-6 font-semibold text-stone-100">Meu espaço</h2>
        <EstablishmentForm establishment={establishment} />
      </div>

      <div className="card mt-6 p-6 md:p-8">
        <SpaceAdminsManager admins={admins} />
      </div>

      <div className="card mt-6 p-6 text-sm text-stone-400 md:p-8">
        <h2 className="font-semibold text-stone-100">Chave Pix = QR Code automático</h2>
        <p className="mt-2">
          Com a chave Pix cadastrada, cada agendamento e pedido do seu espaço gera um
          QR Code e um código copia-e-cola para o cliente pagar na hora — sem taxas,
          direto na sua conta.
        </p>
      </div>
    </div>
  )
}
