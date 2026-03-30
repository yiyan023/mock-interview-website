import { supabase } from './supabase'

const DATES_TABLE = 'dates-table'
type SlotRow = Record<string, unknown>

function calendarDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parsePostgresDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function rowToSlotDate(row: SlotRow): Date | null {
  if (!isString(row.date)) return null
  return parsePostgresDateOnly(row.date)
}

export async function fetchSlotsForCurrentMonth(date: Date): Promise<Set<string>> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const { data, error } = await supabase
    .from(DATES_TABLE)
    .select('*')
    .eq('year', year)
    .eq('month', month)

  if (error) throw error

  const rows = (data ?? []) as SlotRow[]
  const keys = new Set<string>()
  for (const row of rows) {
    const d = rowToSlotDate(row)
    if (d) keys.add(calendarDateKey(d))
  }
  return keys
}
