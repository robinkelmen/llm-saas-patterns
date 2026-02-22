# CRUD Factory

Generate a complete set of type-safe CRUD operations for any Supabase table in one line.

## The Problem

Without this pattern, adding a new table means writing the same boilerplate 7 times:

```typescript
// contacts-api.ts
export async function getContacts() { /* auth, filter by owner, query */ }
export async function getContact(id: string) { /* auth, filter by owner, query single */ }
export async function createContact(data: unknown) { /* validate, auth, insert */ }
export async function updateContact(id: string, data: unknown) { /* validate, auth, update */ }
export async function deleteContact(id: string) { /* auth, soft delete */ }
export async function archiveContact(id: string) { /* auth, set archived_at */ }
export async function unarchiveContact(id: string) { /* auth, clear archived_at */ }

// projects-api.ts — same thing again
// invoices-api.ts — same thing again
// tasks-api.ts — same thing again
```

## The Solution

```typescript
// api/index.ts
export const contactsAPI = createCRUDOperations('contacts', contactsInsertSchema, contactsUpdateSchema)
export const projectsAPI  = createCRUDOperations('projects',  projectsInsertSchema,  projectsUpdateSchema)
export const invoicesAPI  = createCRUDOperations('invoices',  invoicesInsertSchema,  invoicesUpdateSchema)
```

Each `createCRUDOperations` call generates:
- `getAll(options?)` — filtered by owner, excludes archived, sortable, paginated
- `getOne(id)` — filtered by owner
- `create(data, idempotencyKey?)` — validates with Zod, injects owner ID
- `update(id, data, idempotencyKey?)` — validates with Zod, checks ownership
- `delete(id)` — soft or hard delete based on config
- `archive(id)` — sets `archived_at`, updates status
- `unarchive(id)` — clears `archived_at`, restores status

## What It Handles Automatically

**Multi-tenancy:** Every query filters by `owner_id` (or your custom column). Users never see each other's data, even without RLS — though you should have RLS too (defense in depth).

**Idempotency:** Pass an idempotency key to prevent duplicate creates on retry. Results cached for 5 minutes.

**Soft delete:** Tables with `archived_at` and `status` columns get archive/unarchive. Tables without get hard delete.

**Lifecycle hooks:** Hook into `beforeCreate`, `afterCreate`, `afterUpdate`, `afterDelete` for event sourcing, audit logs, or notifications.

**Cache revalidation:** Calls Next.js `revalidatePath` after every mutation. No stale UI.

## Setup

### 1. Your table needs these columns (for soft delete)

```sql
CREATE TABLE contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id),
  -- your columns...
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  archived_at timestamptz,       -- enables soft delete
  status      text DEFAULT 'active'
);

-- RLS (required)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own contacts"
  ON contacts FOR ALL USING (owner_id = auth.uid());
```

### 2. Create your Zod schemas

```typescript
// lib/db/validation.ts
// (Or use the schema-as-truth generation pipeline to auto-generate these)

export const contactsInsertSchema = z.object({
  owner_id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

export const contactsUpdateSchema = contactsInsertSchema.partial().omit({ owner_id: true })
```

### 3. Wire up the factory

```typescript
// lib/api/contacts.ts
import { createCRUDOperations } from './crud-factory'
import { contactsInsertSchema, contactsUpdateSchema } from '../db/validation'

export const contactsAPI = createCRUDOperations(
  'contacts',
  contactsInsertSchema,
  contactsUpdateSchema,
)
```

### 4. Use it

```typescript
// In your Server Actions or API routes
import { contactsAPI } from '@/lib/api/contacts'

// Get all (auto-filtered by owner, archived excluded)
const contacts = await contactsAPI.getAll()

// Get with filters and pagination
const activeContacts = await contactsAPI.getAll({
  filters: { status: 'active' },
  sortBy: 'name',
  sortOrder: 'asc',
  limit: 20,
  offset: 0,
})

// Create (validates with Zod, injects owner_id)
const newContact = await contactsAPI.create({ name: 'Jane Doe', email: 'jane@example.com' })

// Idempotent create (safe to retry)
const contact = await contactsAPI.create(formData, `create-${formKey}`)

// Update
const updated = await contactsAPI.update(id, { name: 'Jane Smith' })

// Archive (soft delete)
await contactsAPI.archive(id)

// Restore
await contactsAPI.unarchive(id)
```

## Options Reference

```typescript
createCRUDOperations(tableName, insertSchema, updateSchema, {
  ownerIdColumn: 'provider_id',     // default: 'owner_id'
  includeArchived: false,            // default: false
  revalidatePaths: ['/contacts'],    // default: ['/${tableName}']
  selectQuery: '*, tags(*)',         // default: '*'
  hasSoftDelete: true,               // default: true
  defaultSort: {
    column: 'name',
    ascending: true,
  },
  hooks: {
    afterCreate: async (data, context) => {
      // Emit event, send notification, update audit log
    },
    afterUpdate: async (data, previousData, context) => {
      // Delta is: previousData vs data
    },
    afterDelete: async (deletedData, context) => {
      // Cleanup related records
    },
  },
})
```

## Files

- `crud-factory.ts` — The factory function
- `crud.types.ts` — TypeScript interfaces

## Adapting This Pattern

The factory imports from:
- `@/lib/supabase/server` — your Supabase client factory
- `next/cache` — for `revalidatePath`

Swap these for your equivalents if you're not on Next.js + Supabase.

Full documentation: [Stop Writing CRUD →](https://llmtuts.kelmen.space/architecture/crud-factory/)
