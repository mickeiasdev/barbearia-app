import Link from 'next/link'
import { requireAdminPage } from '@/lib/data'
import { formatBRL, formatDuration } from '@/lib/utils'
import { verticalName, catalogFor } from '@/lib/verticals'
import ServiceForm from '@/components/admin/service-form'
import { deleteServiceAction, toggleServiceAction, importCatalogAction } from '@/actions/admin'
import type { Service } from '@/lib/types'
import ActionButton from '@/components/admin/action-button'

export default async function AdminServicosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>
}) {
  const sp = await searchParams
  const { supabase, establishment } = await requireAdminPage()

  if (!establishment) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center">
        <p className="text-sm text-stone-400">
          Configure o estabelecimento antes de cadastrar serviços.
        </p>
        <Link href="/admin/configuracoes" className="btn btn-primary mt-4">
          Ir para Configurações
        </Link>
      </div>
    )
  }

  const { data: servicesData } = await supabase
    .from('services')
    .select('*')
    .order('name')
  const services = (servicesData ?? []) as Service[]

  // nicho do espaço (herdado da empresa)
  let vertical = establishment.vertical ?? 'barbearia'
  if (establishment.parent_id) {
    const { data: parent } = await supabase
      .from('establishments')
      .select('vertical')
      .eq('id', establishment.parent_id)
      .maybeSingle()
    const p = parent as { vertical?: string } | null
    if (p?.vertical) vertical = p.vertical
  }

  return (
    <div>
      <h1 className="section-title">Serviços</h1>
      <p className="mt-2 text-sm text-stone-400">
        {services.length} serviço(s) cadastrado(s). Preço e duração alimentam o agendamento.
      </p>

      {sp.ok && <div className="ok-box mt-6">Operação realizada com sucesso.</div>}
      {sp.erro && <div className="error-box mt-6">{sp.erro}</div>}

      {/* importar catálogo do nicho */}
      {services.length === 0 && catalogFor(vertical).length > 0 && (
        <form action={importCatalogAction} className="mt-6">
          <ActionButton
            className="btn btn-outline w-full"
            pendingLabel="Importando..."
            confirmMessage={'Importar o catálogo pronto de ' + verticalName(vertical) + '?'}
          >
            Importar catálogo pronto de {verticalName(vertical)}
          </ActionButton>
        </form>
      )}

      {/* novo serviço */}
      <details className="card mt-8 p-0">
        <summary className="cursor-pointer select-none px-6 py-4 font-semibold text-amber-400 hover:text-amber-300">
          + Cadastrar novo serviço
        </summary>
        <div className="border-t border-stone-800/80 p-6">
          <ServiceForm service={null} />
        </div>
      </details>

      {/* lista */}
      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-stone-800/80">
              <th className="table-head">Serviço</th>
              <th className="table-head">Duração</th>
              <th className="table-head">Preço</th>
              <th className="table-head">Status</th>
              <th className="table-head">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {services.map((service) => (
              <tr key={service.id}>
                <td className="table-cell">
                  <p className="font-medium text-stone-100">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-stone-400">{service.description}</p>
                  )}
                </td>
                <td className="table-cell">{formatDuration(service.duration_min)}</td>
                <td className="table-cell font-semibold text-amber-500">
                  {formatBRL(service.price_cents)}
                </td>
                <td className="table-cell">
                  <span className={'badge ' + (service.is_active
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-stone-700 bg-stone-800 text-stone-400')}>
                    {service.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    <form action={toggleServiceAction}>
                      <input type="hidden" name="id" value={service.id} />
                      <ActionButton className="btn btn-outline btn-sm" pendingLabel="Salvando...">
                        {service.is_active ? 'Desativar' : 'Ativar'}
                      </ActionButton>
                    </form>
                    <form action={deleteServiceAction}>
                      <input type="hidden" name="id" value={service.id} />
                      <ActionButton className="btn btn-danger btn-sm" pendingLabel="Excluindo..." confirmMessage="Excluir este serviço? Agendamentos antigos são mantidos, mas ele some do site.">Excluir</ActionButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell py-10 text-center text-stone-400">
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* editar */}
      <div className="mt-6 space-y-3">
        {services.map((service) => (
          <details key={service.id} className="card p-0">
            <summary className="cursor-pointer select-none px-6 py-4 text-sm font-medium text-stone-300 hover:text-amber-400">
              Editar — {service.name}
            </summary>
            <div className="border-t border-stone-800/80 p-6">
              <ServiceForm service={service} />
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
