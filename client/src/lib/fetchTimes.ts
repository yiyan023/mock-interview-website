import { supabase } from './supabase'

const TIMES_TABLE = 'times-table'

type TimeRow = Record<string, unknown>

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/** Local calendar day as `YYYY-MM-DD` for Postgres `date` filters. */
export function toPostgresDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Build an absolute `Date` from row `date` + `time`.
 * Supports:
 * - `time` as full ISO / timestamptz string (e.g. `2026-03-27T15:00:00.000Z`)
 * - `time` as time-of-day with zone: `15:00:00`, `15:00:00Z`, `15:00:00+00`, `15:00:00+00:00` (combined with `date`)
 */
function rowDateTimeToInstant(dateStr: string, timeVal: unknown): Date | null {
  if (!isString(timeVal)) return null
  const time = timeVal.trim()

  // Whole instant already encoded in `time`
  if (/^\d{4}-\d{2}-\d{2}T/.test(time)) {
    const d = new Date(time)
    return Number.isNaN(d.getTime()) ? null : d
  }

  let combined = `${dateStr}T${time}`
  // Normalise short numeric offsets (+00 → +00:00) for broader JS parsing
  if (/[+-]\d{2}$/.test(combined) && !/[+-]\d{2}:\d{2}$/.test(combined)) {
    combined = combined.replace(/([+-]\d{2})$/, '$1:00')
  }
  // No zone: treat as UTC (prefer storing timetz in Supabase)
  if (!/[zZ]$/.test(combined) && !/[+-]\d{2}:\d{2}$/.test(combined)) {
    combined += 'Z'
  }

  const d = new Date(combined)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Load all time rows for the given **local calendar day**, sorted earliest-first.
 * Each value is a single instant (`Date`); format in the viewer’s zone with `Intl`, e.g.:
 * `new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit' }).format(d)`
 */
export async function fetchAvailableTimesForDate(selectedDate: Date): Promise<Date[]> {
  const dateKey = toPostgresDateKey(createDateOnly(selectedDate))

  const { data, error } = await supabase
    .from(TIMES_TABLE)
    .select('id, date, time')
    .eq('date', dateKey)

  if (error) throw error

  const rows = (data ?? []) as TimeRow[]
  const instants: Date[] = []

  for (const row of rows) {
    if (!isString(row.date)) continue
    const instant = rowDateTimeToInstant(row.date, row.time)
    if (instant) instants.push(instant)
  }

  instants.sort((a, b) => a.getTime() - b.getTime())
  return instants
}

function createDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Format an instant in a specific IANA zone (defaults to the browser’s current zone). */
export function formatInstantInTimeZone(
  instant: Date,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(instant)
}
