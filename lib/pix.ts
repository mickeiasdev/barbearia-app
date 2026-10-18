// Geração de "Pix copia e cola" (BR Code EMV QRCPS-MPM — Banco Central).
// 100% local: nenhuma API externa, sem taxas. O banco do cliente lê o QR.

function tlv(tag: string, value: string): string {
  return tag + String(value.length).padStart(2, '0') + value
}

/** CRC16/CCITT-FALSE — exigido pelo padrão Pix (poly 0x1021, init 0xFFFF). */
function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Remove acentos e caracteres não alfanuméricos (padrão EMV). */
function ascii(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
}

export interface PixOptions {
  /** Chave Pix da barbearia (CPF/CNPJ, e-mail, telefone ou aleatória) */
  key: string
  /** Valor em centavos (ex.: 4590 = R$ 45,90) */
  amountCents: number
  /** Nome do recebedor (máx. 25 caracteres após limpeza) */
  merchantName?: string
  /** Identificador da transação (máx. 25 alfanuméricos) */
  txid?: string
}

/** Monta o payload "copia e cola" do Pix. Retorna '' se inválido. */
export function buildPixPayload(opts: PixOptions): string {
  const key = (opts.key ?? '').trim()
  if (!key || !Number.isFinite(opts.amountCents) || opts.amountCents <= 0) return ''

  const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', key)

  let payload = tlv('00', '01') // payload format indicator
  payload += tlv('01', '12') // uso único (valor embutido)
  payload += tlv('26', merchantAccount)
  payload += tlv('52', '0000') // merchant category code
  payload += tlv('53', '986') // BRL
  payload += tlv('58', 'BR')
  payload += tlv('54', (opts.amountCents / 100).toFixed(2))
  payload += tlv('59', (ascii(opts.merchantName ?? 'BARBEARIA') || 'BARBEARIA').slice(0, 25))
  payload += tlv('60', 'BRASIL')

  const txid = (opts.txid ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'PEDIDO'
  payload += tlv('62', tlv('05', txid))

  payload += '6304' + crc16(payload + '6304')
  return payload
}
