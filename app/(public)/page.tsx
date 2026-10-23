import { requireKnownHost } from '@/lib/site'
import BarberLanding from '@/components/barber-landing'
import CompanySite from '@/components/company-site'
import SellingLanding from '@/components/selling-landing'

/**
 * PÁGINA DA RAIZ:
 * - Subdomínio de profissional → site dele (layout próprio)
 * - Subdomínio de empresa → site da empresa (equipe)
 * - Raiz do domínio → LANDING DE VENDAS do produto (o que você vende)
 */
export default async function HomePage() {
  const host = await requireKnownHost()

  if (host.workspace) {
    return <BarberLanding workspace={host.workspace} />
  }

  if (host.company) {
    return <CompanySite company={host.company} />
  }

  // RAIZ = landing de vendas do produto
  return <SellingLanding />
}
