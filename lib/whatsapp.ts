// Mensagens de WhatsApp via gateway compatível (ex.: Z-API / WhatsApp Business API).
// Degradação graciosa: sem WHATSAPP_API_URL configurada, nada é enviado
// e o fluxo do app continua funcionando normalmente (só e-mails).
//
// Configure no .env.local:
//   WHATSAPP_API_URL=https://sua-api/instances/XXXX/send-text   (endpoint de envio)
//   WHATSAPP_API_TOKEN=seu-token                                 (Bearer)
// O corpo enviado é { "phone": "5511999999999", "message": "texto" } —
// formato usado pela Z-API e fácil de adaptar a outros gateways.

const GATEWAY = process.env.WHATSAPP_API_URL
const TOKEN = process.env.WHATSAPP_API_TOKEN

/** Só dígitos, com 55 na frente (padrão wa.me e gateways BR). */
export function waDigits(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') ? digits : '55' + digits
}

export async function sendWhatsApp(
  phone: string | null | undefined,
  message: string
): Promise<boolean> {
  const target = waDigits(phone)
  if (!GATEWAY || !target) return false

  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: {
        ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: target, message }),
    })
    if (!res.ok) {
      console.error('[whatsapp] gateway respondeu', res.status)
      return false
    }
    return true
  } catch (err) {
    console.error('[whatsapp] falha no envio:', err)
    return false
  }
}

/** Link wa.me com mensagem pré-preenchida (funciona SEM gateway). */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const target = waDigits(phone)
  if (!target) return null
  return 'https://wa.me/' + target + '?text=' + encodeURIComponent(message)
}
