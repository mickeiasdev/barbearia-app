// E-mails transacionais via Resend (https://resend.com — plano grátis disponível).
// Degradação graciosa: sem RESEND_API_KEY configurada, nada é enviado
// e o fluxo do app continua funcionando normalmente.

const FROM = process.env.EMAIL_FROM || 'BarberPro <onboarding@resend.dev>'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BarberPro'

export async function sendEmail(
  to: string | null | undefined,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !to || !to.includes('@')) return

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) {
      console.error('[email] Resend respondeu', res.status)
    }
  } catch (err) {
    // nunca quebra a ação do usuário por causa do e-mail
    console.error('[email] falha no envio:', err)
  }
}

/** Template visual simples alinhado à identidade do app. */
export function emailHtml(
  title: string,
  paragraphs: (string | null | undefined)[],
  footerNote?: string
): string {
  const body = paragraphs
    .filter(Boolean)
    .map(
      (p) =>
        '<p style="margin:0 0 12px;color:#d6d3d1;font-size:15px;line-height:1.6;">' +
        p +
        '</p>'
    )
    .join('')

  return (
    '<div style="background:#0c0a09;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="max-width:520px;margin:0 auto;background:#1c1917;border:1px solid #292524;border-radius:16px;overflow:hidden;">' +
    '<div style="background:#f59e0b;color:#0c0a09;padding:16px 24px;font-weight:bold;font-size:18px;">' +
    APP_NAME +
    '</div>' +
    '<div style="padding:24px;">' +
    '<h1 style="margin:0 0 16px;color:#fafaf9;font-size:20px;">' +
    title +
    '</h1>' +
    body +
    (footerNote
      ? '<p style="margin:16px 0 0;color:#78716c;font-size:12px;">' + footerNote + '</p>'
      : '') +
    '</div></div></div>'
  )
}
