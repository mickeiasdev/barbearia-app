import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton({ whatsapp }: { whatsapp: string | null }) {
  if (!whatsapp) return null

  const digits = whatsapp.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : '55' + digits

  return (
    <a
      href={'https://wa.me/' + number}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
