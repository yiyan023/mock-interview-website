import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import {
  EXPERIENCE_LEVEL_OPTIONS,
  INITIAL_INTAKE_FORM,
  INTERVIEW_SOON_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  type IntakeFormState,
} from '../lib/fetchForm'
import { fetchSlotsForCurrentMonth } from '../lib/fetchSlots'
import {
  createEmbeddedCheckoutSession,
  stripePromise,
} from '../lib/stripeCheckout'
import { sendBookingSummaryEmail } from '../lib/sendBookingEmail'
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
  const [availableSlots, setAvailableSlots] = useState<Date[]>([])
  const [isIntakeFormOpen, setIsIntakeFormOpen] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null)
  const [intakeForm, setIntakeForm] = useState<IntakeFormState>(INITIAL_INTAKE_FORM)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [embeddedClientSecret, setEmbeddedClientSecret] = useState<string | null>(null)
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState<string | null>(
    null,
  )
  const [scheduleEmailInfo, setScheduleEmailInfo] = useState<string | null>(null)
  const [scheduleEmailBusy, setScheduleEmailBusy] = useState(false)

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
    let cancelled = false
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

  useEffect(() => {
    const u = new URL(window.location.href)
    if (u.searchParams.get('stripe_checkout') !== 'return') return

    setScheduleSuccessMessage('Your payment went through. Thanks!')
    setIsIntakeFormOpen(false)
    setSelectedTimeSlot(null)
    setEmbeddedClientSecret(null)
    setCheckoutError(null)
    setIsCheckoutLoading(false)

    u.searchParams.delete('stripe_checkout')
    u.searchParams.delete('session_id')
    const next = u.pathname + (u.search ? u.search : '') + u.hash
    window.history.replaceState({}, '', next)
  }, [])

  const onEmbeddedCheckoutComplete = useCallback(() => {
    setEmbeddedClientSecret(null)
    setScheduleSuccessMessage('Your payment went through. Thanks!')
    setIsIntakeFormOpen(false)
    setSelectedTimeSlot(null)
    setCheckoutError(null)
    setIsCheckoutLoading(false)
  }, [])

  async function onScheduleEmailClick() {
    if (!selectedTimeSlot) return
    setScheduleEmailInfo(null)
    const email = intakeForm.email.trim()
    if (!email) {
      setScheduleEmailInfo('Use “Back to details” and enter your email, then return here.')
      return
    }
    setScheduleEmailBusy(true)
    try {
      await sendBookingSummaryEmail({
        selectedTimeIso: selectedTimeSlot.toISOString(),
        timezone: tz,
        form: intakeForm,
      })
      setScheduleEmailInfo('Email sent — check your inbox.')
    } catch (err: unknown) {
      setScheduleEmailInfo(
        err instanceof Error ? err.message : 'Could not send email. Try again.',
      )
    } finally {
      setScheduleEmailBusy(false)
    }
  }

  async function getSlotsForSelection(key: string) {
    if (!key) return []
    if (!availableDayKeys.has(key)) return []

    const slotDate = new Date(key)
    const slots = await fetchAvailableTimesForDate(slotDate)

    setShowSlots(true)
    setAvailableSlots(slots)
  }

  function openIntakeForm(slot: Date) {
    setSelectedTimeSlot(slot)
    setIsIntakeFormOpen(true)
    setScheduleSuccessMessage(null)
    setEmbeddedClientSecret(null)
    setScheduleEmailInfo(null)
  }

  function closeIntakeForm() {
    setIsIntakeFormOpen(false)
    setSelectedTimeSlot(null)
    setCheckoutError(null)
    setIsCheckoutLoading(false)
    setEmbeddedClientSecret(null)
    setScheduleEmailInfo(null)
  }

  function updateIntakeField<K extends keyof IntakeFormState>(
    field: K,
    value: IntakeFormState[K],
  ) {
    setIntakeForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submitIntakeForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedTimeSlot) return

    setCheckoutError(null)
    setIsCheckoutLoading(true)

    try {
      const clientSecret = await createEmbeddedCheckoutSession({
        selectedTimeIso: selectedTimeSlot.toISOString(),
        timezone: tz,
        form: intakeForm,
      })
      setEmbeddedClientSecret(clientSecret)
      setIsCheckoutLoading(false)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to start checkout. Please try again.'
      setCheckoutError(message)
      setIsCheckoutLoading(false)
      return
    }
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
      {scheduleSuccessMessage && (
        <div className="booking-calendar__success-banner" role="status">
          {scheduleSuccessMessage}
        </div>
      )}
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

      {showSlots && (
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
            {!slotsLoading && !slotsError ? (
              <ul className="booking-calendar__slots" role="list">
                {availableSlots?.map((slot) => (
                  <li key={slot.getTime()}>
                    <button
                      type="button"
                      className="booking-calendar__slot-btn"
                      onClick={() => openIntakeForm(slot)}
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
      )}
      {isIntakeFormOpen && selectedTimeSlot && (
        <div className="booking-calendar__modal-overlay" role="presentation">
          <div
            className="booking-calendar__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intake-form-title"
          >
            <div className="booking-calendar__modal-header">
              <h3 id="intake-form-title">
                {embeddedClientSecret ? 'Complete payment' : 'Book Your Session'}
              </h3>
              <button
                type="button"
                className="booking-calendar__modal-close"
                onClick={closeIntakeForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>
            <p className="booking-calendar__hint">
              Selected time: <strong>{formatSlotTime(selectedTimeSlot, tz)}</strong> (
              {tzLabel || tz})
            </p>

            {embeddedClientSecret ? (
              <div className="booking-calendar__embedded-wrap">
                <p className="booking-calendar__hint">
                  Pay securely below. Your card details stay with Stripe.
                </p>
                <div className="booking-calendar__embedded-checkout">
                  <EmbeddedCheckoutProvider
                    key={embeddedClientSecret}
                    stripe={stripePromise}
                    options={{
                      clientSecret: embeddedClientSecret,
                      onComplete: onEmbeddedCheckoutComplete,
                    }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
                <div className="booking-calendar__form-actions booking-calendar__form-actions--embedded">
                  <button
                    type="button"
                    className="booking-calendar__slot-btn"
                    onClick={() => {
                      setEmbeddedClientSecret(null)
                      setScheduleEmailInfo(null)
                    }}
                  >
                    Back to details
                  </button>
                  <button
                    type="button"
                    className="booking-calendar__slot-btn"
                    onClick={onScheduleEmailClick}
                    disabled={scheduleEmailBusy}
                  >
                    {scheduleEmailBusy ? 'Sending…' : 'Schedule'}
                  </button>
                </div>
                {scheduleEmailInfo && (
                  <p className="booking-calendar__hint" role="status">
                    {scheduleEmailInfo}
                  </p>
                )}
              </div>
            ) : (
            <form className="booking-calendar__form" onSubmit={submitIntakeForm}>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={intakeForm.email}
                  onChange={(e) => updateIntakeField('email', e.target.value)}
                />
              </label>

              <div className="booking-calendar__form-row">
                <label>
                  First name
                  <input
                    type="text"
                    required
                    value={intakeForm.firstName}
                    onChange={(e) => updateIntakeField('firstName', e.target.value)}
                  />
                </label>
                <label>
                  Last name
                  <input
                    type="text"
                    required
                    value={intakeForm.lastName}
                    onChange={(e) => updateIntakeField('lastName', e.target.value)}
                  />
                </label>
              </div>

              <fieldset>
                <legend>Do you have an interview coming up?</legend>
                {INTERVIEW_SOON_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="interview-soon"
                      checked={intakeForm.hasInterviewSoon === option.value}
                      onChange={() =>
                        updateIntakeField('hasInterviewSoon', option.value)
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>

              {intakeForm.hasInterviewSoon === 'Yes' && (
                <label>
                  If so, what company?
                  <input
                    type="text"
                    value={intakeForm.company}
                    onChange={(e) => updateIntakeField('company', e.target.value)}
                  />
                </label>
              )}

              <fieldset>
                <legend>
                  What level of experience do you have with solving Leetcode problems and
                  conducting technical interviews?
                </legend>
                {EXPERIENCE_LEVEL_OPTIONS.map((option, idx) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="experience-level"
                      required={idx === 0}
                      checked={intakeForm.experienceLevel === option.value}
                      onChange={() =>
                        updateIntakeField('experienceLevel', option.value)
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>What type of question would you like to be asked?</legend>
                {QUESTION_TYPE_OPTIONS.map((option, idx) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="question-type"
                      required={idx === 0}
                      checked={intakeForm.questionType === option.value}
                      onChange={() => updateIntakeField('questionType', option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>

              <label>
                Is there anything else I should know before our upcoming session?
                <textarea
                  rows={4}
                  value={intakeForm.notes}
                  onChange={(e) => updateIntakeField('notes', e.target.value)}
                />
              </label>

              <label>
                Who did you hear about this from?
                <input
                  type="text"
                  value={intakeForm.referral}
                  onChange={(e) => updateIntakeField('referral', e.target.value)}
                />
              </label>

              {checkoutError && (
                <p className="booking-calendar__hint" role="alert">
                  {checkoutError}
                </p>
              )}

              <div className="booking-calendar__form-actions">
                <button
                  type="button"
                  className="booking-calendar__slot-btn"
                  onClick={closeIntakeForm}
                  disabled={isCheckoutLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="booking-calendar__slot-btn"
                  disabled={isCheckoutLoading}
                >
                  {isCheckoutLoading ? 'Starting checkout...' : 'Proceed to Payment'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
