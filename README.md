# LLM SaaS Patterns

Production patterns for solo developers building SaaS applications with LLMs as first-class collaborators.

These patterns were extracted from a real, working SaaS project. Each one solves a specific problem that will otherwise slow you down.

---

## Patterns

### [CRUD Factory](./patterns/crud-factory/)
**Problem:** Writing the same CRUD logic 7 times, once per table.
**Solution:** A factory function that generates type-safe, authenticated CRUD operations for any Supabase table in one line.

- Automatic owner filtering (multi-tenant ready from day one)
- Idempotency cache (5-minute TTL)
- Lifecycle hooks for event sourcing
- Soft delete with archive/unarchive
- Zod validation on every insert and update

→ Documented in: [Stop Writing CRUD](https://llmtuts.kelmen.space/architecture/crud-factory/)

---

### [Stripe Integration](./patterns/stripe/)
**Problem:** Stripe initialization errors at build time, unhandled webhook replays, unclear env var requirements.
**Solution:** Lazy singleton client, guard-clause config helpers, and idempotent webhook handler.

- Lazy initialization prevents build-time crashes
- `requireStripe()` guard for unconfigured environments
- Full env var reference with Stripe dashboard links
- Webhook idempotency via `stripe_webhook_events` table

→ Documented in: [Stripe Setup Walkthrough](https://llmtuts.kelmen.space/saas/stripe-setup/)

---

### [Spring Animation System](./patterns/animations/)
**Problem:** Animation values scattered across components, inconsistent motion, no accessibility support.
**Solution:** A single configuration object with physics-tuned spring configs for every motion type.

- Four spring profiles: vertical, horizontal, modal, drawer
- Physics parameters documented with reasoning
- `none` config for `prefers-reduced-motion`
- Works with Framer Motion's spring physics

→ Documented in: [The Premium Feel](https://llmtuts.kelmen.space/architecture/premium-feel/)

---

### [Optimistic CRUD Hooks](./patterns/hooks/)
**Problem:** UI feels sluggish waiting for server responses on every action.
**Solution:** React hooks that wrap any CRUD function with pending state and optimistic updates.

- `useOptimisticCRUD` — wraps any async function with loading/error state
- `useOptimisticCRUDWithData` — adds optimistic data for instant UI feedback
- Generic, works with any async operation

→ Documented in: [Stop Writing CRUD](https://llmtuts.kelmen.space/architecture/crud-factory/)

---

### [Claude Code Hooks (Airbag Pattern)](./patterns/claude-code-hooks/)
**Problem:** LLMs make mistakes after migrations, break TypeScript, write unsafe commits.
**Solution:** Event-driven hooks that automatically validate, test, and enforce standards after every tool use.

- `PostToolUse` on `supabase db push` → runs CRUD tests automatically
- `PostToolUse` on file edits → type-checks TypeScript
- `PreToolUse` on Bash → blocks unsafe git patterns
- `SessionStart` → injects project context

→ Documented in: [The Airbag Pattern](https://llmtuts.kelmen.space/llm/airbag-pattern/)

---

### [CLAUDE.md Template](./templates/)
**Problem:** Every LLM session starts cold — no context about your stack, constraints, or conventions.
**Solution:** A project constitution that LLMs read at session start.

→ Documented in: [The Project Constitution](https://llmtuts.kelmen.space/llm/claude-md/)

---

## Usage

Copy the patterns you need into your project. Each pattern is self-contained with its own README.

These patterns are designed for:
- **Next.js** (App Router)
- **Supabase** (auth + database)
- **TypeScript** + Zod
- **React** (for hooks and animations)
- **Claude Code** (for hooks pattern)

Adjust imports and client initialization to match your project structure.

---

## Full Documentation

Everything here is documented in depth at:

**[Build Faster with LLMs →](https://llmtuts.kelmen.space)**

---

## License

MIT — use freely, adapt as needed.
