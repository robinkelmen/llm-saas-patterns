import { useState, useCallback } from 'react'

/**
 * Wraps any async CRUD function with loading and error state.
 *
 * @example
 * ```typescript
 * const { execute, isPending, error } = useOptimisticCRUD(contactsAPI.create)
 *
 * async function handleSubmit(data: ContactInsert) {
 *   await execute(data)
 *   router.push('/contacts')
 * }
 *
 * return (
 *   <button disabled={isPending} onClick={handleSubmit}>
 *     {isPending ? 'Saving...' : 'Save Contact'}
 *   </button>
 * )
 * ```
 */
export function useOptimisticCRUD<TArgs extends any[], TResult>(
  crudFunction: (...args: TArgs) => Promise<TResult>
) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setIsPending(true)
      setError(null)

      try {
        const result = await crudFunction(...args)
        setIsPending(false)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred')
        setError(error)
        setIsPending(false)
        throw error
      }
    },
    [crudFunction]
  )

  const reset = useCallback(() => {
    setIsPending(false)
    setError(null)
  }, [])

  return { execute, isPending, error, reset }
}

/**
 * Wraps any async CRUD function with optimistic data support.
 *
 * Use when you want to show an immediate UI update before the server responds.
 *
 * @example
 * ```typescript
 * const { execute, isPending, optimisticData } = useOptimisticCRUDWithData(
 *   contactsAPI.create,
 *   {
 *     getOptimisticData: (data) => ({ ...data, id: 'temp', created_at: new Date().toISOString() }),
 *     onSuccess: () => router.refresh(),
 *   }
 * )
 *
 * // Show optimisticData in the list immediately, replace when server responds
 * const displayContacts = optimisticData ? [...contacts, optimisticData] : contacts
 * ```
 */
export function useOptimisticCRUDWithData<TArgs extends any[], TResult, TOptimistic = TResult>(
  crudFunction: (...args: TArgs) => Promise<TResult>,
  options?: {
    /** Return optimistic data to show immediately in the UI */
    getOptimisticData?: (...args: TArgs) => TOptimistic
    onSuccess?: (result: TResult) => void
    onError?: (error: Error) => void
  }
) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [optimisticData, setOptimisticData] = useState<TOptimistic | null>(null)

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      setIsPending(true)
      setError(null)

      if (options?.getOptimisticData) {
        setOptimisticData(options.getOptimisticData(...args))
      }

      try {
        const result = await crudFunction(...args)
        setIsPending(false)
        setOptimisticData(null)
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An unknown error occurred')
        setError(error)
        setIsPending(false)
        setOptimisticData(null)
        options?.onError?.(error)
        throw error
      }
    },
    [crudFunction, options]
  )

  const reset = useCallback(() => {
    setIsPending(false)
    setError(null)
    setOptimisticData(null)
  }, [])

  return { execute, isPending, error, reset, optimisticData }
}
