/**
 * Source: Robin Kelmen — https://llmtuts.kelmen.space
 * Pattern: Stripe Integration
 * Docs:    https://llmtuts.kelmen.space/saas/stripe-setup/
 * Repo:    https://github.com/robinkelmen/llm-saas-patterns
 */

import Stripe from 'stripe'

/**
 * Stripe Server Client — Lazy Singleton
 *
 * Defers initialization until first use.
 * Prevents build-time errors when STRIPE_SECRET_KEY isn't set.
 */
let _stripe: Stripe | null = null

export const getStripe = (): Stripe => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined. ' +
        'Add it to .env.local for development or your deployment environment for production.'
      )
    }

    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-18.acacia', // pin to a stable version
      maxNetworkRetries: 2,
      timeout: 80000,
    })
  }

  return _stripe
}

/** Reset the singleton (useful in tests) */
export const resetStripeInstance = (): void => {
  _stripe = null
}
