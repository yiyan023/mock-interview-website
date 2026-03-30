import { useEffect, useMemo, useState } from 'react'
import { fetchSlotsForCurrentMonth } from '../lib/fetchSlots'
import { fetchAvailableTimesForDate } from '../lib/fetchTimes'
import './BookingCalendar.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function createDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatSlotTime(slot: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(slot)
}

function formatMonthYear(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1))
}

type Cell =
  | { kind: 'empty' }
  | { kind: 'day'; date: Date; dayNum: number; available: boolean }

function buildMonthCells(
  year: number,
  monthIndex: number,
  availableKeys: Set<string>,
  todayStart: Date,
): Cell[] {
  const firstDate = new Date(year, monthIndex, 1)
  const emptyDays = firstDate.getDay()
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const cells: Cell[] = []

  for (let i = 0; i < emptyDays; i++) cells.push({ kind: 'empty' })

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, monthIndex, d)
    const key = dateKey(date)

    const available = availableKeys.has(key) && createDate(date) >= todayStart
    cells.push({ kind: 'day', date, dayNum: d, available })
  }
  return cells
}

function useUserTimeZone(): string {
  return useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  )
}

export function BookingCalendar() {
  const tz = useUserTimeZone()
  const tzLabel = useMemo(() => {
    try {
      const labels = new Intl.DisplayNames(
        undefined,
        { type: 'timeZone' } as unknown as Intl.DisplayNamesOptions,
      )
      return labels.of(tz)
    } catch {
      return undefined
    }
  }, [tz])

  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [availableDayKeys, setAvailableDayKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [showSlots, setShowSlots] = useState(false)
  const [avaliableSlots, setAvaliableSlots] = useState<Date[]>([])

  const today = new Date()
  const todayDate = createDate(today)
  const viewYear = viewMonth.getFullYear()
  const viewMonthIndex = viewMonth.getMonth()

  const cells = useMemo(
    () =>
      buildMonthCells(
        viewYear,
        viewMonthIndex,
        availableDayKeys,
        todayDate,
      ),
    [viewYear, viewMonthIndex, availableDayKeys, todayDate.getTime()],
  )

  const selectedDate = useMemo(() => {
    if (!selectedKey) return null
    const [y, mo, d] = selectedKey.split('-').map(Number)
    return new Date(y, mo - 1, d)
  }, [selectedKey])

  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true)
    setSlotsError(null)
    setAvailableDayKeys(new Set())

    fetchSlotsForCurrentMonth(viewMonth)
      .then((keys: Set<string>) => {
        if (cancelled) return
        setAvailableDayKeys(keys)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (import.meta.env.DEV) {
          console.error('[BookingCalendar] fetchSlotsForCurrentMonth failed', err)
        }
        const message =
          err instanceof Error ? err.message : 'Failed to load availability.'
        setAvailableDayKeys(new Set())
        setSlotsError(message)
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })

    const cleanup = () => {
      cancelled = true
      setSlotsLoading(false)
    }
    return cleanup
  }, [viewMonth])

  async function getSlotsForSelection(key: string) {
    if (!key) return []
    if (!availableDayKeys.has(key)) return []

    const slotDate = new Date(key)
    const slots = await fetchAvailableTimesForDate(slotDate)

    setShowSlots(true)
    setAvaliableSlots(slots)
  }

  const canPrevMonth = useMemo(() => {
    return viewMonth > today
  }, [viewMonth, today])

  function goPrevMonth() {
    setViewMonth((prev) => {
      const year = prev.getFullYear()
      const month = prev.getMonth()
      return new Date(year, month - 1, 1)
    })
    setSelectedKey(null)
  }

  function goNextMonth() {
    setViewMonth((prev) => {
      const year = prev.getFullYear()
      const month = prev.getMonth()
      return new Date(year, month + 1, 1)
    })
    setSelectedKey(null)
  }

  const longDateLabel = selectedDate
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(selectedDate)
    : null

  return (
    <div className="booking-calendar" role="region" aria-label="Schedule">
      <div className="booking-calendar__panel booking-calendar__panel--month">
        <div className="booking-calendar__nav">
          <button
            type="button"
            className="booking-calendar__nav-btn"
            onClick={goPrevMonth}
            disabled={!canPrevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="booking-calendar__month-title">
            {formatMonthYear(viewYear, viewMonthIndex)}
          </h2>
          <button
            type="button"
            className="booking-calendar__nav-btn"
            onClick={goNextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="booking-calendar__dow" aria-hidden>
          {WEEKDAYS.map((d) => (
            <span key={d} className="booking-calendar__dow-cell">
              {d}
            </span>
          ))}
        </div>

        <div className="booking-calendar__grid">
          {cells.map((cell, i) => {
            if (cell.kind === 'empty') {
              return <span key={`e-${i}`} className="booking-calendar__cell" />
            }
            const { date, dayNum, available } = cell
            const key = dateKey(date)
            const isSelected = selectedKey === key
            const isToday = key === dateKey(todayDate)

            return (
              <button
                key={key}
                type="button"
                className={[
                  'booking-calendar__day',
                  isSelected && 'booking-calendar__day--selected',
                  isToday && 'booking-calendar__day--today',
                  !available && 'booking-calendar__day--muted',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!available}
                onClick={() => {
                    console.log('key', key)
                  setSelectedKey(key)
                  getSlotsForSelection(key)
                }}
                aria-pressed={isSelected}
                aria-disabled={!available}
                aria-label={`${dayNum}, ${formatMonthYear(date.getFullYear(), date.getMonth())}`}
              >
                {dayNum}
              </button>
            )
          })}
        </div>
      </div>

      <div className="booking-calendar__panel booking-calendar__panel--times">
        <p className="booking-calendar__tz-note">
          Times shown in <strong>{tzLabel || tz}</strong>
        </p>

        {!selectedDate && (
          <p className="booking-calendar__hint">
            Select a date on the calendar to see open times.
          </p>
        )}

        {selectedDate && longDateLabel && (
          <>
            <h3 className="booking-calendar__times-heading">{longDateLabel}</h3>
            {slotsLoading && (
              <p className="booking-calendar__hint">Loading times…</p>
            )}
            {slotsError && (
              <p className="booking-calendar__hint" role="alert">
                {slotsError}
              </p>
            )}
            {!slotsLoading && !slotsError && showSlots ? (
              <ul className="booking-calendar__slots" role="list">
                {avaliableSlots?.map((slot) => (
                  <li key={slot.getTime()}>
                    <button
                      type="button"
                      className="booking-calendar__slot-btn"
                      onClick={() => {
                        /* hook for booking flow */
                      }}
                    >
                      {formatSlotTime(slot, tz)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
