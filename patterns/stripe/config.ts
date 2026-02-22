/**
 * Source: Robin Kelmen — https://llmtuts.kelmen.space
 * Pattern: Stripe Integration — Config Helpers
 * Docs:    https://llmtuts.kelmen.space/saas/stripe-setup/
 * Repo:    https://github.com/robinkelmen/llm-saas-patterns
 */

import { NextResponse } from 'next/server'

/**
 * Stripe Configuration Helpers
 *
 * Use requireStripe() at the top of any API route that touches Stripe.
 * Returns a 503 response when Stripe isn't configured — prevents crashes
 * on staging environments or dev machines without payment keys.
 *
 * Usage:
 *   const guard = requireStripe()
 *   if (guard) return guard
 *   const stripe = getStripe()
 */

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

/** Returns 503 NextResponse when Stripe is not configured, null otherwise */
export function requireStripe(): NextResponse | null {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: 'Payment system not configured.',
        hint: 'Add STRIPE_SECRET_KEY to your environment variables.',
      },
      { status: 503 }
    )
  }
  return null
}

/**
 * All environment variables required for full Stripe functionality.
 *
 * Log missing vars on startup in development:
 *   import { logMissingStripeVars } from '@/lib/stripe/config'
 *   logMissingStripeVars() // in app/layout.tsx or instrumentation.ts
 */
export const STRIPE_ENV_VARS = {
  // Server-side — never expose to the client
  STRIPE_SECRET_KEY:       'Secret key → https://dashboard.stripe.com/apikeys',
  STRIPE_WEBHOOK_SECRET:   'From: stripe listen --forward-to localhost:3000/api/webhooks/stripe',
  STRIPE_PRICE_ID_MONTHLY: 'Price ID for monthly plan (price_xxxxx)',
  STRIPE_PRICE_ID_ANNUAL:  'Price ID for annual plan (price_xxxxx)',

  // Public — safe to expose to the browser
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'Publishable key → https://dashboard.stripe.com/apikeys',
  NEXT_PUBLIC_APP_URL:                'Your app URL, e.g. https://yourdomain.com',
} as const

export function logMissingStripeVars(): void {
  if (process.env.NODE_ENV !== 'development') return
  const missing = Object.keys(STRIPE_ENV_VARS).filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.warn('[Stripe] Missing environment variables:', missing.join(', '))
  }
}
