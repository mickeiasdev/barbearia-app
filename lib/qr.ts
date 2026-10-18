// Geração de QR Code no SERVIDOR (pacote qrcode roda no Node).
// Importado apenas por páginas/actions server-side — nunca pelo bundle do navegador.
import QRCode from 'qrcode'

export async function qrFromPayload(payload: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(payload, {
      margin: 1,
      width: 220,
      color: { dark: '#0c0a09', light: '#ffffff' },
    })
  } catch (err) {
    console.error('[pix] falha ao gerar QR:', err)
    return null
  }
}
