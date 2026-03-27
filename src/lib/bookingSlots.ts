import { supabase } from './supabase'

const DATES_TABLE = 'dates-table'
type SlotRow = Record<string, unknown>

function parsePostgresDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    console.log('invalid date format in Supabase table', value)
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  console.log('year', year, 'month', month, 'day', day)
  return new Date(year, month - 1, day)
}0

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function rowToSlotDate(row: SlotRow): Date | null {
  if (!isString(row.date)) {
    console.log('invalid date column type in Supabase table', typeof row.date, row.date)
    return null
  }
  return parsePostgresDateOnly(row.date)
}

export async function fetchSlotsForCurrentMonth(date: Date): Promise<Date[]> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const { data, error } = await supabase
    .from(DATES_TABLE)
    .select('*')
    .eq('year', year)
    .eq('month', month)

  if (error) throw error

  const rows = (data ?? []) as SlotRow[]
  const dates: Date[] = []
  for (const row of rows) {
    const d = rowToSlotDate(row)
    if (d) dates.push(d)
  }

  return dates
}
