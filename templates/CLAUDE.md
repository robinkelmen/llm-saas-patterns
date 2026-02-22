# Project Constitution

This file is read by Claude Code at the start of every session.
It defines how to work in this project: stack, conventions, rules, and patterns.

---

## Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (Postgres + RLS)
- **Auth:** Supabase Auth
- **Validation:** Zod
- **Styling:** Tailwind CSS
- **Package manager:** npm

---

## Architecture Patterns

### CRUD Factory
All database operations go through `createCRUDOperations`. Do not write manual CRUD.

```typescript
// ✅ Correct
export const contactsAPI = createCRUDOperations('contacts', insertSchema, updateSchema)

// ❌ Wrong — don't write manual queries
export async function getContacts() {
  const { data } = await supabase.from('contacts').select('*')
  return data
}
```

### Schema as Truth
TypeScript types and Zod validators are generated from the database. Do not hand-write them.

Run `npm run generate` after schema changes.

### Multi-tenancy
Every table has `owner_id`. Every query must filter by it.

RLS policies enforce this at the database level. The CRUD factory enforces it at the application level. Both must be in place.

---

## File Structure

```
app/                    Next.js app router pages and API routes
  api/                  API routes (webhooks, etc.)
components/             React components
  ui/                   Shared UI components
lib/
  api/                  CRUD factory instances per table
  db/                   Generated types and validators
  stripe/               Stripe client and config
  supabase/             Supabase client factories
scripts/                Code generation and test scripts
```

---

## Commit Conventions

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Keep messages specific: what changed and why
- Never mention AI tools in commit messages

---

## Rules

### Always
- Use `npm` (not yarn or bun)
- Validate with Zod before any database write
- Filter by `owner_id` on every query
- Use the CRUD factory — not raw Supabase queries
- Run `npm run generate` after schema changes

### Never
- Hard-code user IDs or test data in source files
- Skip RLS policies on new tables
- Expose `STRIPE_SECRET_KEY` or other server secrets to the client
- Force push to main

---

## Environment Variables

See `lib/stripe/config.ts` for the full list of required Stripe env vars.

Required for local development:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing

After `supabase db push`, the airbag hook automatically runs CRUD tests.

To run manually:
```bash
npm run test:crud
```

---

## Useful Resources

- [Build Faster with LLMs](https://llmtuts.kelmen.space) — Full documentation for all patterns in this project
- [Claude Code Hooks Documentation](https://docs.anthropic.com/claude-code/hooks)
- [taches-cc-resources](https://github.com/glittercowboy/taches-cc-resources) — Claude Code skills, subagents, slash commands, and prompt patterns
