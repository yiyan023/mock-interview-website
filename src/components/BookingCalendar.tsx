import { useEffect, useMemo, useState } from 'react'
import { fetchSlotsForCurrentMonth } from '../lib/bookingSlots'
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
  | { kind: 'day'; date: Date; dayNum: number }

function buildMonthCells(year: number, monthIndex: number): Cell[] {
  const first = new Date(year, monthIndex, 1)
  const pad = first.getDay()
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const cells: Cell[] = []
  for (let i = 0; i < pad; i++) cells.push({ kind: 'empty' })
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ kind: 'day', date: new Date(year, monthIndex, d), dayNum: d })
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

  const [cursor, setCursor] = useState(() => {
    const t = new Date()
    return { y: t.getFullYear(), m: t.getMonth() }
  })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [monthSlots, setMonthSlots] = useState<Date[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const today = new Date()
  const todayStart = createDate(today)
  const cells = useMemo(
    () => buildMonthCells(cursor.y, cursor.m),
    [cursor.y, cursor.m],
  )

  const selectedDate = useMemo(() => {
    if (!selectedKey) return null
    const [y, mo, d] = selectedKey.split('-').map(Number)
    return new Date(y, mo - 1, d)
  }, [selectedKey])

  useEffect(() => {
    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect */
    setSlotsLoading(true)
    setSlotsError(null)

    fetchSlotsForCurrentMonth(new Date(cursor.y, cursor.m, 1))
      .then((dates: Date[]) => {
        if (cancelled) return
        setMonthSlots(dates)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (import.meta.env.DEV) {
          console.error('[BookingCalendar] fetchSlotsForCurrentMonth failed', err)
        }
        const message =
          err instanceof Error ? err.message : 'Failed to load availability.'
        setMonthSlots([])
        setSlotsError(message)
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })

    const cleanup = () => {
      cancelled = true
      setSlotsLoading(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    return cleanup
  }, [cursor.y, cursor.m])

  const slotsForSelection = useMemo(() => {
    if (!selectedKey) return []
    return monthSlots
      .filter((s) => dateKey(s) === selectedKey)
      .filter((s) => createDate(s) >= todayStart)
  }, [monthSlots, selectedKey, todayStart.getTime()])

  const canPrevMonth = useMemo(() => {
    const firstOfView = new Date(cursor.y, cursor.m, 1)
    return firstOfView > new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
  }, [cursor.y, cursor.m, todayStart])

  function goPrevMonth() {
    setCursor(({ y, m }) => {
      if (m === 0) return { y: y - 1, m: 11 }
      return { y, m: m - 1 }
    })
    setSelectedKey(null)
  }

  function goNextMonth() {
    setCursor(({ y, m }) => {
      if (m === 11) return { y: y + 1, m: 0 }
      return { y, m: m + 1 }
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
            {formatMonthYear(cursor.y, cursor.m)}
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
            const { date, dayNum } = cell
            const key = dateKey(date)
            const isSelected = selectedKey === key
            const isToday = key === dateKey(todayStart)

            return (
              <button
                key={key}
                type="button"
                className={[
                  'booking-calendar__day',
                  isSelected && 'booking-calendar__day--selected',
                  isToday && 'booking-calendar__day--today',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedKey(key)}
                aria-pressed={isSelected}
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
            {!slotsLoading && !slotsError && slotsForSelection.length === 0 ? (
              <p className="booking-calendar__hint">
                No times left on this day. Try another date.
              </p>
            ) : null}
            {!slotsLoading && !slotsError && slotsForSelection.length > 0 ? (
              <ul className="booking-calendar__slots" role="list">
                {slotsForSelection.map((slot) => (
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
