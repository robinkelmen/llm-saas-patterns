# Optimistic CRUD Hooks

React hooks that wrap async CRUD operations with loading state and optimistic UI support.

## Hooks

### `useOptimisticCRUD`

Wraps any async function with `isPending` and `error` state. The simplest upgrade from raw async calls.

```typescript
const { execute, isPending, error } = useOptimisticCRUD(contactsAPI.create)

// In your component
<button disabled={isPending} onClick={() => execute(formData)}>
  {isPending ? 'Saving...' : 'Save'}
</button>

{error && <p className="text-red-500">{error.message}</p>}
```

### `useOptimisticCRUDWithData`

Same as above, plus immediate UI feedback via `optimisticData`. Show the new item in the list before the server confirms.

```typescript
const { execute, isPending, optimisticData } = useOptimisticCRUDWithData(
  contactsAPI.create,
  {
    getOptimisticData: (data) => ({
      ...data,
      id: 'temp-' + Date.now(),
      created_at: new Date().toISOString(),
    }),
    onSuccess: () => router.refresh(),
  }
)

// Merge optimistic item into list
const displayList = optimisticData
  ? [...contacts, optimisticData]
  : contacts
```

## Requirements

- React 18+ (uses `useState`, `useCallback`)

Full documentation: [Stop Writing CRUD →](https://llmtuts.kelmen.space/architecture/crud-factory/)
