import type { Metadata } from 'next'
import AdminSidebar from '@/components/admin/sidebar'
import { requireAdminPage } from '@/lib/data'

export const metadata: Metadata = { title: 'Painel Admin' }

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const { profile, establishment } = await requireAdminPage()

  return (
    <div className="flex min-h-screen bg-stone-950">
      <AdminSidebar
        adminName={profile.full_name || 'Admin'}
        establishmentName={establishment?.name ?? null}
      />
      <div className="min-w-0 flex-1">
        <div className="h-[104px] md:hidden" />
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  )
}
