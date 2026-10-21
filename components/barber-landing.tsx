import type { HostWorkspace } from '@/lib/site'
import { getLandingData } from '@/components/landing/data'
import LandingClassic from '@/components/landing/classic'
import LandingSplit from '@/components/landing/split'
import LandingEditorial from '@/components/landing/editorial'

/**
 * Página de apresentação do barbeiro (site próprio no subdomínio).
 * O layout é escolhido nas Configurações: 1 Clássico, 2 Painel, 3 Editorial.
 */
export default async function BarberLanding({ workspace }: { workspace: HostWorkspace }) {
  const data = await getLandingData(workspace)
  if (data.layout === 2) return <LandingSplit data={data} />
  if (data.layout === 3) return <LandingEditorial data={data} />
  return <LandingClassic data={data} />
}
