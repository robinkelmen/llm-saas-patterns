/**
 * CRUD Factory
 *
 * Generates a complete set of type-safe CRUD operations for any Supabase table.
 *
 * Usage:
 *   export const contactsAPI = createCRUDOperations('contacts', insertSchema, updateSchema)
 *   export const projectsAPI  = createCRUDOperations('projects',  insertSchema, updateSchema)
 *
 * Each call gives you: getAll, getOne, create, update, delete, archive, unarchive
 *
 * See README.md for full documentation.
 */
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import type {
  CRUDOperations,
  CRUDOptions,
  QueryOptions,
  ProfileLookupResult,
  OperationContext,
} from './crud.types'

// ---------------------------------------------------------------------------
// Idempotency cache
// ---------------------------------------------------------------------------

const idempotencyCache = new Map<string, { result: any; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function cleanupExpiredCache(): void {
  const now = Date.now()
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      idempotencyCache.delete(key)
    }
  }
}

function getCachedResult(key: string): any | null {
  cleanupExpiredCache()
  const entry = idempotencyCache.get(key)
  if (entry && Date.now() - entry.timestamp <= CACHE_TTL_MS) {
    return entry.result
  }
  return null
}

function setCachedResult(key: string, result: any): void {
  idempotencyCache.set(key, { result, timestamp: Date.now() })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Get authenticated user's profile ID.
 * Handles the standard auth flow: auth.user → profiles table.
 * @internal
 */
async function getProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ProfileLookupResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ No authenticated user found, using DEV_USER_ID fallback')
      const DEV_ID = '00000000-0000-0000-0000-000000000000'
      return { profileId: DEV_ID, userId: DEV_ID }
    }
    throw new Error('Not authenticated')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    console.warn('Profile not found for user:', user.id)
    return { profileId: user.id, userId: user.id }
  }

  return { profileId: profile.id, userId: user.id }
}

/**
 * Get Supabase client and owner ID.
 * In development without auth, escalates to admin client to bypass RLS.
 * @internal
 */
async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      const adminClient = await createAdminClient()
      const { data: { user: devUser } } = await adminClient.auth.getUser()
      const ownerId = devUser?.id ?? '00000000-0000-0000-0000-000000000000'
      return { supabase: adminClient, ownerId }
    }
    throw new Error('Not authenticated')
  }

  return { supabase, ownerId: user.id }
}

/**
 * Build operation context for lifecycle hooks.
 * @internal
 */
async function buildOperationContext(
  operation: 'create' | 'read' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<OperationContext> {
  return {
    operation,
    entityType,
    entityId,
    userId,
    timestamp: new Date().toISOString(),
    metadata,
  }
}

/**
 * Determine the owner ID column for this table.
 * Override via options.ownerIdColumn if your table uses a different name.
 * @internal
 */
function determineOwnerColumn(tableName: string, options?: CRUDOptions): string {
  if (options?.ownerIdColumn) return options.ownerIdColumn

  // Add your project's column mappings here
  const ownerColumnMap: Record<string, string> = {
    // example: messages: 'sender_id',
  }

  return ownerColumnMap[tableName] ?? 'owner_id'
}

/**
 * Revalidate Next.js cache paths after mutations.
 * Silently fails outside request context (e.g., during tests).
 * @internal
 */
function revalidateAllPaths(paths: string[]): void {
  try {
    paths.forEach((path) => revalidatePath(path))
  } catch {
    // Silent fail outside Next.js request context
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a complete set of CRUD operations for a Supabase table.
 *
 * @param tableName - Name of the Supabase table
 * @param insertSchema - Zod schema for insert validation
 * @param updateSchema - Zod schema for update validation
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * export const contactsAPI = createCRUDOperations(
 *   'contacts',
 *   contactsInsertSchema,
 *   contactsUpdateSchema,
 *   {
 *     selectQuery: '*, tags(*)',
 *     hooks: {
 *       afterCreate: async (data, context) => {
 *         await sendWelcomeEmail(data.email)
 *       },
 *     },
 *   }
 * )
 *
 * const contacts = await contactsAPI.getAll()
 * const contact  = await contactsAPI.create({ name: 'Jane Doe' })
 * await contactsAPI.archive(contact.id)
 * ```
 */
export function createCRUDOperations<T = any, TInsert = any, TUpdate = any>(
  tableName: string,
  insertSchema: z.ZodType<TInsert>,
  updateSchema: z.ZodType<TUpdate>,
  options?: CRUDOptions
): CRUDOperations<T, TInsert, TUpdate> {
  const config = {
    ownerIdColumn: determineOwnerColumn(tableName, options),
    includeArchived: options?.includeArchived ?? false,
    revalidatePaths: options?.revalidatePaths ?? [`/${tableName}`],
    selectQuery: options?.selectQuery ?? '*',
    useProfileLookup: options?.useProfileLookup ?? false,
    hasSoftDelete: options?.hasSoftDelete ?? true,
    defaultSort: options?.defaultSort ?? { column: 'created_at', ascending: false },
  }

  // -------------------------------------------------------------------------
  // getAll
  // -------------------------------------------------------------------------
  async function getAll(queryOptions?: QueryOptions): Promise<T[]> {
    const { supabase, ownerId } = await getContext()

    let finalOwnerId = ownerId
    if (config.useProfileLookup) {
      const { profileId } = await getProfileId(supabase)
      finalOwnerId = profileId
    }

    if (options?.hooks?.beforeRead) {
      await options.hooks.beforeRead(null, {
        operation: 'read',
        entityType: tableName,
        userId: finalOwnerId,
        timestamp: new Date().toISOString(),
      })
    }

    let query = supabase
      .from(tableName as any)
      .select(config.selectQuery)
      .eq(config.ownerIdColumn, finalOwnerId)

    if (config.hasSoftDelete && !config.includeArchived) {
      query = query.is('archived_at', null)
    }

    if (queryOptions?.filters) {
      Object.entries(queryOptions.filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const sortBy = queryOptions?.sortBy ?? config.defaultSort.column
    const ascending = (queryOptions?.sortOrder ?? (config.defaultSort.ascending ? 'asc' : 'desc')) === 'asc'
    query = query.order(sortBy, { ascending })

    if (queryOptions?.limit) query = query.limit(queryOptions.limit)
    if (queryOptions?.offset && queryOptions?.limit) {
      query = query.range(queryOptions.offset, queryOptions.offset + queryOptions.limit - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data as T[]
  }

  // -------------------------------------------------------------------------
  // getOne
  // -------------------------------------------------------------------------
  async function getOne(id: string): Promise<T> {
    const { supabase, ownerId } = await getContext()

    let finalOwnerId = ownerId
    if (config.useProfileLookup) {
      const { profileId } = await getProfileId(supabase)
      finalOwnerId = profileId
    }

    const { data, error } = await supabase
      .from(tableName as any)
      .select(config.selectQuery)
      .eq('id', id)
      .eq(config.ownerIdColumn, finalOwnerId)
      .single()

    if (error) throw error
    return data as T
  }

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  async function create(formData: unknown, idempotencyKey?: string): Promise<T> {
    if (idempotencyKey) {
      const cached = getCachedResult(idempotencyKey)
      if (cached) return cached
    }

    const { supabase, ownerId } = await getContext()

    let finalOwnerId = ownerId
    if (config.useProfileLookup) {
      const { profileId } = await getProfileId(supabase)
      finalOwnerId = profileId
    }

    // Convert empty strings in UUID fields to null
    const processedData = { ...(formData as Record<string, any>) }
    Object.keys(processedData).forEach((key) => {
      if ((key === 'id' || key.endsWith('_id')) && processedData[key] === '') {
        processedData[key] = null
      }
    })

    const validated = insertSchema.parse({
      ...processedData,
      [config.ownerIdColumn]: finalOwnerId,
    })

    if (options?.hooks?.beforeCreate) {
      await options.hooks.beforeCreate(validated, {
        operation: 'create',
        entityType: tableName,
        userId: finalOwnerId,
        timestamp: new Date().toISOString(),
      })
    }

    const { data, error } = await supabase
      .from(tableName as any)
      .insert(validated as any)
      .select()
      .single()

    if (error) {
      console.error(`CRUD Create Error (${tableName}):`, error)
      throw error
    }

    if (options?.hooks?.afterCreate) {
      const context = await buildOperationContext('create', tableName, (data as any).id, finalOwnerId)
      await options.hooks.afterCreate(data as T, context)
    }

    revalidateAllPaths(config.revalidatePaths)

    if (idempotencyKey) setCachedResult(idempotencyKey, data as T)

    return data as T
  }

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  async function update(id: string, formData: unknown, idempotencyKey?: string): Promise<T> {
    if (idempotencyKey) {
      const cached = getCachedResult(idempotencyKey)
      if (cached) return cached
    }

    const { supabase, ownerId } = await getContext()

    let finalOwnerId = ownerId
    if (config.useProfileLookup) {
      const { profileId } = await getProfileId(supabase)
      finalOwnerId = profileId
    }

    const processedData = { ...(formData as Record<string, any>) }
    Object.keys(processedData).forEach((key) => {
      if ((key === 'id' || key.endsWith('_id')) && processedData[key] === '') {
        processedData[key] = null
      }
    })

    const validated = updateSchema.parse(processedData)

    // Fetch previous data for afterUpdate delta
    let previousData: T | null = null
    if (options?.hooks?.afterUpdate) {
      const { data: prev } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', id)
        .eq(config.ownerIdColumn, finalOwnerId)
        .single()
      previousData = prev as T | null
    }

    if (options?.hooks?.beforeUpdate) {
      const context = await buildOperationContext('update', tableName, id, finalOwnerId)
      await options.hooks.beforeUpdate(id, validated, context)
    }

    const { data, error } = await supabase
      .from(tableName as any)
      .update(validated as any)
      .eq('id', id)
      .eq(config.ownerIdColumn, finalOwnerId)
      .select()
      .single()

    if (error) throw error

    if (options?.hooks?.afterUpdate) {
      const context = await buildOperationContext('update', tableName, id, finalOwnerId)
      await options.hooks.afterUpdate(data as T, previousData, context)
    }

    revalidateAllPaths(config.revalidatePaths)

    if (idempotencyKey) setCachedResult(idempotencyKey, data as T)

    return data as T
  }

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  async function deleteRecord(id: string): Promise<void> {
    const { supabase, ownerId } = await getContext()

    let finalOwnerId = ownerId
    if (config.useProfileLookup) {
      const { profileId } = await getProfileId(supabase)
      finalOwnerId = profileId
    }

    let deletedData: T | null = null
    if (options?.hooks?.afterDelete) {
      const { data } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', id)
        .eq(config.ownerIdColumn, finalOwnerId)
        .single()
      deletedData = data as T | null
    }

    if (options?.hooks?.beforeDelete) {
      const context = await buildOperationContext('delete', tableName, id, finalOwnerId)
      await options.hooks.beforeDelete(id, context)
    }

    if (config.hasSoftDelete) {
      const { error } = await supabase
        .from(tableName as any)
        .update({ archived_at: new Date().toISOString(), status: 'archived' } as any)
        .eq('id', id)
        .eq(config.ownerIdColumn, finalOwnerId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', id)
        .eq(config.ownerIdColumn, finalOwnerId)
      if (error) throw error
    }

    if (options?.hooks?.afterDelete && deletedData) {
      const context = await buildOperationContext('delete', tableName, id, finalOwnerId)
      await options.hooks.afterDelete(deletedData, context)
    }

    revalidateAllPaths(config.revalidatePaths)
  }

  // -------------------------------------------------------------------------
  // archive / unarchive
  // -------------------------------------------------------------------------
  async function archive(id: string): Promise<void> {
    if (!config.hasSoftDelete) throw new Error(`Table ${tableName} does not support soft delete`)
    return deleteRecord(id)
  }

  async function unarchive(id: string): Promise<void> {
    if (!config.hasSoftDelete) throw new Error(`Table ${tableName} does not support soft delete`)

    const { supabase, ownerId } = await getContext()

    let finalOwnerId = ownerId
    if (config.useProfileLookup) {
      const { profileId } = await getProfileId(supabase)
      finalOwnerId = profileId
    }

    const { error } = await supabase
      .from(tableName as any)
      .update({ archived_at: null, status: 'active' } as any)
      .eq('id', id)
      .eq(config.ownerIdColumn, finalOwnerId)

    if (error) throw error

    revalidateAllPaths(config.revalidatePaths)
  }

  // -------------------------------------------------------------------------
  // Assemble and return
  // -------------------------------------------------------------------------
  const operations: CRUDOperations<T, TInsert, TUpdate> = {
    getAll,
    getOne,
    create,
    update,
    delete: deleteRecord,
  }

  if (config.hasSoftDelete) {
    operations.archive = archive
    operations.unarchive = unarchive
  }

  return operations
}
