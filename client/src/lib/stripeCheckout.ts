import { loadStripe } from '@stripe/stripe-js'
import type { IntakeFormState } from './fetchForm'

type CreateCheckoutPayload = {
  selectedTimeIso: string
  timezone: string
  form: IntakeFormState
}

const apiBase = String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''

export const stripePromise = loadStripe(publishableKey)

export async function createEmbeddedCheckoutSession(
  payload: CreateCheckoutPayload,
): Promise<string> {
  const res = await fetch(`${apiBase}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error('Unable to create Stripe checkout session.')
  }

  const data = (await res.json()) as { clientSecret?: string; error?: string }
  if (data.error) {
    throw new Error(data.error)
  }
  if (!data.clientSecret) {
    throw new Error('Stripe client secret missing.')
  }

  return data.clientSecret
}
