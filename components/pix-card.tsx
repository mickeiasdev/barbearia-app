"use client"

import { useEffect, useState } from 'react'
import { Check, Copy, QrCode } from 'lucide-react'
import { buildPixPayload } from '@/lib/pix'
import { formatBRL } from '@/lib/utils'

interface Props {
  pixKey: string
  amountCents: number
  merchantName?: string
  txid?: string
  defaultOpen?: boolean
  note?: string
}

export default function PixCard({
  pixKey,
  amountCents,
  merchantName,
  txid,
  defaultOpen = false,
  note,
}: Props) {
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const payload = buildPixPayload({ key: pixKey, amountCents, merchantName, txid })

  useEffect(() => {
    if (!payload) return
    let active = true
    import('qrcode')
      .then((mod) => {
        const toDataURL = mod.default?.toDataURL ?? mod.toDataURL
        return toDataURL(payload, {
          margin: 1,
          width: 220,
          color: { dark: '#0c0a09', light: '#ffffff' },
        })
      })
      .then((url) => {
        if (active) setQr(url)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [payload])

  if (!payload) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = payload
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <details open={defaultOpen} className="card p-0">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 text-sm font-medium text-amber-400 hover:text-amber-300">
        <QrCode className="h-4 w-4" />
        Pagar com Pix — {formatBRL(amountCents)}
      </summary>

      <div className="grid gap-4 border-t border-stone-800/80 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto w-[220px] rounded-xl bg-white p-2">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR Code Pix" width={220} height={220} />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-xs text-stone-500">
              Gerando QR Code...
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-lg font-bold text-stone-100">{formatBRL(amountCents)}</p>
          <p className="text-xs text-stone-500">
            Abra o app do seu banco, escolha Pix e escaneie o QR Code — ou use o
            código copia e cola abaixo.
          </p>
          <div className="flex gap-2">
            <code className="max-h-16 flex-1 overflow-hidden break-all rounded-lg bg-stone-950 px-3 py-2 text-[10px] leading-relaxed text-stone-400">
              {payload}
            </code>
            <button type="button" onClick={copy} className="btn btn-primary btn-sm shrink-0">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiar código
                </>
              )}
            </button>
          </div>
          {note && <p className="text-[11px] text-stone-600">{note}</p>}
        </div>
      </div>
    </details>
  )
}
