import type { IntakeFormState } from './fetchForm'

type BookingEmailPayload = {
  selectedTimeIso: string
  timezone: string
  form: IntakeFormState
}

const apiBase = String(import.meta.env.VITE_API_URL).replace(/\/$/, '')

export async function sendBookingSummaryEmail(payload: BookingEmailPayload): Promise<void> {
  const res = await fetch(`${apiBase}/api/email/booking-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json().catch(() => ({}))) as { error?: string }

  if (!res.ok) {
    throw new Error(data.error || 'Could not send email.')
  }
}
