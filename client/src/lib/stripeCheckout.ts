import type { IntakeFormState } from './fetchForm'

type CreateCheckoutPayload = {
  selectedTimeIso: string
  timezone: string
  form: IntakeFormState
}

export async function startCheckout(payload: CreateCheckoutPayload): Promise<void> {
  const res = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error('Unable to create Stripe checkout session.')
  }

  const data = (await res.json()) as { url?: string }
  if (!data.url) {
    throw new Error('Stripe checkout URL missing.')
  }

  window.location.assign(data.url)
}
