import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/sidebar'
import WorkspaceOnboarding from '@/components/admin/workspace-onboarding'
import { requireAdminPage } from '@/lib/data'

export const metadata: Metadata = { title: 'Painel Admin' }

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const { profile, supabase, establishment, isMaster } = await requireAdminPage()

  // master sem espaço vai direto ao Painel Master (ele administra os demais)
  if (!establishment && isMaster) {
    redirect('/admin/master')
  }

  // sem espaço: onboarding de criação (ou adoção, para superadmins)
  if (!establishment) {
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
        establishmentName={establishment.name}
        isMaster={isMaster}
      />
      <div className="min-w-0 flex-1">
        <div className="h-[104px] md:hidden" />
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  )
}
