import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/sidebar'
import WorkspaceOnboarding from '@/components/admin/workspace-onboarding'
import { requireAdminPage } from '@/lib/data'
import type { Establishment } from '@/lib/types'

export const metadata: Metadata = { title: 'Painel Admin' }

function TrialBanner({ company }: { company: Establishment }) {
  const endsAt = company.trial_ends_at ? new Date(company.trial_ends_at) : null
  const days = endsAt
    ? Math.max(
        0,
        Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      )
    : 0

  if (company.plan === 'pro' || company.plan === 'business') return null
  if (company.plan === 'trial' && endsAt) {
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-400">
        Teste do plano Pro — <strong>{days} dia{days === 1 ? '' : 's'} restante{days === 1 ? '' : 's'}</strong>.{' '}
        <Link href="/assinar" className="font-semibold underline underline-offset-2 hover:text-amber-300">
          Assinar para não perder recursos
        </Link>
      </div>
    )
  }
  if (company.plan === 'free') {
    return (
      <div className="border-b border-stone-700 bg-stone-900/60 px-4 py-2.5 text-center text-sm text-stone-400">
        Plano Grátis (1 profissional).{' '}
        <Link href="/assinar" className="font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300">
          Conheça o plano Pro
        </Link>
      </div>
    )
  }
  return null
}

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const { profile, supabase, establishment, isMaster, company } = await requireAdminPage()

  // master sem espaço vai direto ao Painel Master (ele administra os demais)
  if (!establishment && isMaster) {
    redirect('/admin/master')
  }

  // dono/gerente de BARBEARIA (sem espaço próprio): painel normal,
  // hub em "Minha empresa" — cadastra barbeiros e gerencia o tenant
  if (!establishment && !company) {
    // sem espaço e sem empresa: onboarding de criação (ou adoção)
    const [{ data: superRes }, { data: allEsts }] = await Promise.all([
      supabase.rpc('is_platform_admin'),
      supabase.from('establishments').select('id, name, owner_id').order('created_at'),
    ])
    const canClaim = !!superRes
    const unclaimed = (
      (allEsts ?? []) as { id: string; name: string; owner_id: string | null }[]
    )
      .filter((e) => !e.owner_id)
      .map((e) => ({ id: e.id, name: e.name }))

    return (
      <WorkspaceOnboarding
        adminName={profile.full_name || 'Admin'}
        unclaimed={canClaim ? unclaimed : []}
        canClaim={canClaim}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-stone-950">
      <AdminSidebar
        adminName={profile.full_name || 'Admin'}
        establishmentName={establishment?.name ?? company?.name ?? null}
        isMaster={isMaster}
        isCompanyManager={!!company}
      />
      <div className="min-w-0 flex-1">
        <div className="h-[104px] md:hidden" />
        {company && <TrialBanner company={company} />}
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  )
}
