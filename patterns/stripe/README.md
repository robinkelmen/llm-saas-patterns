# Stripe Integration

Production-safe Stripe setup: lazy client, guard clauses, idempotent webhooks.

## Files

- `server.ts` — lazy singleton Stripe client
- `config.ts` — environment checks, guard clauses, env var reference

## The Problems This Solves

**Build-time crashes:** Importing `new Stripe(process.env.STRIPE_SECRET_KEY)` at module load crashes your build if the key isn't set. Lazy initialization defers this until first call.

**Unconfigured environments:** Staging servers or developer machines without Stripe configured should return 503, not crash. `requireStripe()` guard handles this.

**Webhook replays:** Stripe retries webhooks on failure. Without idempotency, you'll charge users twice or create duplicate subscriptions. Deduplicate with a `stripe_webhook_events` table.

**Unclear setup:** Which env vars do I need? What do they do? `STRIPE_ENV_VARS` documents all of them.

## Setup

### 1. Environment variables

```bash
# .env.local (development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Webhook idempotency table

```sql
CREATE TABLE stripe_webhook_events (
  stripe_event_id text PRIMARY KEY,
  processed_at    timestamptz DEFAULT now()
);
```

### 3. Use in API routes

```typescript
// app/api/webhooks/stripe/route.ts
import { getStripe } from '@/lib/stripe/server'
import { requireStripe } from '@/lib/stripe/config'

export async function POST(request: Request) {
  const guard = requireStripe()
  if (guard) return guard    // Returns 503 if not configured

  const stripe = getStripe()
  const sig = request.headers.get('stripe-signature')!
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature invalid', { status: 400 })
  }

  // Idempotency guard — skip already-processed events
  const { error: insertError } = await db
    .from('stripe_webhook_events')
    .insert({ stripe_event_id: event.id })
  if (insertError?.code === '23505') {
    return Response.json({ received: true }) // Already processed
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
      break
  }

  return Response.json({ received: true })
}
```

Full documentation: [Stripe Setup Walkthrough →](https://llmtuts.kelmen.space/saas/stripe-setup/)
