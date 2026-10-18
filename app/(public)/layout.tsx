import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import WhatsAppButton from '@/components/whatsapp-button'
import { CartProvider } from '@/components/cart-provider'
import { getEstablishment } from '@/lib/data'

export default async function PublicLayout({
  children,
}: { children: React.ReactNode }) {
  const establishment = await getEstablishment()

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter establishment={establishment} />
        <WhatsAppButton whatsapp={establishment?.whatsapp ?? null} />
      </div>
    </CartProvider>
  )
}
