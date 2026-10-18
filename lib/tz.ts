// Helpers de data/hora com fuso fixo America/Sao_Paulo (UTC-3).
// O Brasil não tem horário de verão desde 2019, então o offset é constante.

export const APP_TIMEZONE = 'America/Sao_Paulo'
const SP_OFFSET_HOURS = 3 // UTC = local + 3h

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: APP_TIMEZONE, hour: '2-digit', minute: '2-digit'
})

const weekdayShort = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, weekday: 'short' })
const weekdayLong = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, weekday: 'long' })
const dayNum = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, day: '2-digit' })
const monthShort = new Intl.DateTimeFormat('pt-BR', { timeZone: APP_TIMEZONE, month: 'short' })

/** "yyyy-mm-dd" (fuso SP) de um instante. */
export function dateKey(instant: Date | string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  return keyFormatter.format(d)
}

/** "HH:mm" (fuso SP) de um instante ISO. */
export function timeInSP(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/** Converte "yyyy-mm-dd" + "HH:mm" (horário SP) no instante UTC equivalente. */
export function spDateTimeToUTC(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh + SP_OFFSET_HOURS, mm, 0, 0))
}

/** Hoje no fuso SP ("yyyy-mm-dd"). */
export function todayKey(): string {
  return dateKey(new Date())
}

/** Início (00:00 SP) de um dia "yyyy-mm-dd" como ISO UTC. */
export function dayStartISO(key: string): string {
  return spDateTimeToUTC(key, '00:00').toISOString()
}

/** Início do dia seguinte, útil para consultas .lt(). */
export function nextDayStartISO(key: string): string {
  const d = spDateTimeToUTC(key, '00:00')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString()
}

export interface DayChip {
  key: string // yyyy-mm-dd
  weekday: string // "seg."
  day: string // "15"
  month: string // "jan."
  isToday: boolean
}

/** Próximos N dias (incluindo hoje) com rótulos prontos para a UI. */
export function nextDays(n: number): DayChip[] {
  const out: DayChip[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getTime() + i * 86400000)
    const key = dateKey(d)
    out.push({
      key,
      weekday: weekdayShort.format(d).replace('.', ''),
      day: dayNum.format(d),
      month: monthShort.format(d).replace('.', ''),
      isToday: i === 0,
    })
  }
  return out
}

/** "seg" / "segunda-feira" a partir de um "yyyy-mm-dd". */
export function weekdayName(key: string, long = false): string {
  const d = spDateTimeToUTC(key, '12:00')
  const name = (long ? weekdayLong : weekdayShort).format(d)
  return name.replace('.', '')
}

/** Rótulo amigável: "15 de jan. de 2026". */
export function friendlyDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
  return d + ' de ' + months[m - 1] + ' de ' + y
}

/** Data curta exibida: "seg, 15 de jan.". */
export function shortDateLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
  return weekdayName(key) + ', ' + d + ' de ' + months[m - 1]
}

/** Dia + hora a partir de um ISO: "15/01 às 14:30". */
export function dayTimeLabel(iso: string): string {
  const d = new Date(iso)
  return dateKey(d).split('-').reverse().join('/') + ' às ' + timeInSP(iso)
}

/** Mês atual "yyyy-mm" no fuso SP. */
export function currentMonthKey(): string {
  const k = todayKey()
  return k.slice(0, 7)
}

/** Início/fim do mês dado "yyyy-mm" (ISO UTC). */
export function monthRange(monthKey: string): { start: string; end: string } {
  const y = Number(monthKey.slice(0, 4))
  const m = Number(monthKey.slice(5, 7))
  const start = new Date(Date.UTC(y, m - 1, 1, 3, 0, 0)) // 00:00 SP
  const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 3, 0, 0))
  return { start: start.toISOString(), end: end.toISOString() }
}

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
