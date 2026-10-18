import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BarberPro'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Formata centavos como moeda: 4500 -> "R$ 45,00". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100)
}

/** Aceita "45", "45.90", "45,90" e devolve centavos (ou null se inválido). */
export function parsePriceToCents(input: string): number | null {
  if (!input) return null
  let clean = input.trim().replace(/[^0-9.,-]/g, '')
  if (clean.includes(',')) clean = clean.replace(/./g, '').replace(',', '.')
  const value = Number.parseFloat(clean)
  if (Number.isNaN(value) || value < 0) return null
  return Math.round(value * 100)
}

/** "50min", "1h 20min" */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return m + 'min'
  if (m === 0) return h + 'h'
  return h + 'h ' + m + 'min'
}

/** "R$ 45,00" -> "45,00" para inputs de edição. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** Traduz mensagens comuns do Supabase/Postgres para PT-BR. */
export function friendlyDbError(message: string): string {
  const msg = (message || '').toLowerCase()
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('user already exists')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('overlaps') || msg.includes('appointments_no_overlap')) return 'Este horário acabou de ser ocupado. Escolha outro.'
  if (msg.includes('estoque insuficiente')) return message
  if (msg.includes('faca login')) return 'Faça login para continuar.'
  if (msg.includes('password')) return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('duplicate key')) return 'Registro já existe.'
  if (msg.includes('foreign key') || msg.includes('violates')) return 'Não é possível concluir: existem registros vinculados.'
  return message
}

export function initials(name: string): string {
  const parts = name.trim().split(/s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('')
}

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  paid: 'Pago',
}

export const PAYMENT_LABEL: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
}
