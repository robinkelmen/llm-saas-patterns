/**
 * Source: Robin Kelmen — https://llmtuts.kelmen.space
 * Pattern: CRUD Factory — Types
 * Docs:    https://llmtuts.kelmen.space/architecture/crud-factory/
 * Repo:    https://github.com/robinkelmen/llm-saas-patterns
 */

import { z } from 'zod'

/**
 * Operation Context - Metadata for Event Sourcing
 *
 * Tracks who, what, when for every CRUD operation.
 * Ready for transactional outbox pattern implementation.
 */
export interface OperationContext {
  /** Type of operation performed */
  operation: 'create' | 'read' | 'update' | 'delete'
  /** Table/entity type (e.g., 'contacts', 'invoices') */
  entityType: string
  /** ID of affected record */
  entityId: string
  /** Authenticated user who performed operation */
  userId: string
  /** Timestamp when operation occurred */
  timestamp: string
  /** Optional additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * CRUD Lifecycle Hooks
 *
 * Hook points for event emission (transactional outbox pattern).
 *
 * Example — emit to an events table after create:
 * ```typescript
 * afterCreate: async (data, context) => {
 *   await emitEvent({
 *     eventType: `${context.entityType}.created`,
 *     payload: data,
 *     metadata: context
 *   })
 * }
 * ```
 */
export interface CRUDHooks<TRow> {
  /** Called before create (validation, authorization) */
  beforeCreate?: (data: unknown, context: Omit<OperationContext, 'entityId'>) => Promise<void> | void
  /** Called after successful create (event emission point) */
  afterCreate?: (data: TRow, context: OperationContext) => Promise<void> | void

  /** Called before update (validation, authorization) */
  beforeUpdate?: (id: string, data: unknown, context: OperationContext) => Promise<void> | void
  /** Called after successful update — includes previousData for diffing */
  afterUpdate?: (data: TRow, previousData: TRow | null, context: OperationContext) => Promise<void> | void

  /** Called before delete (authorization, cascade checks) */
  beforeDelete?: (id: string, context: OperationContext) => Promise<void> | void
  /** Called after successful delete */
  afterDelete?: (deletedData: TRow, context: OperationContext) => Promise<void> | void

  /** Called before read operations (authorization) */
  beforeRead?: (id: string | null, context: Omit<OperationContext, 'entityId'>) => Promise<void> | void
}

/**
 * Query options for filtering and pagination
 */
export interface QueryOptions {
  /** Maximum number of records to return */
  limit?: number
  /** Number of records to skip (for pagination) */
  offset?: number
  /** Column name to sort by */
  sortBy?: string
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
  /** Column equality filters (e.g., { status: 'active' }) */
  filters?: Record<string, any>
}

/**
 * Configuration options for the CRUD factory
 */
export interface CRUDOptions<TRow = any> {
  /**
   * Name of the column used for ownership filtering
   * Default: 'owner_id'
   */
  ownerIdColumn?: string

  /**
   * Whether to include archived records in getAll
   * Default: false (excludes records with archived_at !== null)
   */
  includeArchived?: boolean

  /**
   * Custom paths to revalidate after mutations (Next.js)
   * Default: ['/${tableName}']
   */
  revalidatePaths?: string[]

  /**
   * Custom select query for getAll/getOne
   * Default: '*'
   * Example: '*, tags(*), assignee:profiles!assignee_id(id, name)'
   */
  selectQuery?: string

  /**
   * Whether to use profile lookup (profiles table via auth_user_id)
   * vs direct user.id from auth
   * Default: false
   */
  useProfileLookup?: boolean

  /**
   * Whether the table has soft delete columns (archived_at, status)
   * Default: true
   */
  hasSoftDelete?: boolean

  /**
   * Default sort for getAll
   * Default: { column: 'created_at', ascending: false }
   */
  defaultSort?: {
    column: string
    ascending: boolean
  }

  /**
   * Lifecycle hooks for event sourcing
   */
  hooks?: CRUDHooks<TRow>
}

/**
 * The complete set of CRUD operations returned by the factory
 */
export interface CRUDOperations<T, TInsert, TUpdate> {
  /** Get all records for authenticated user */
  getAll: (options?: QueryOptions) => Promise<T[]>

  /** Get single record by ID (throws if not found or not owned) */
  getOne: (id: string) => Promise<T>

  /**
   * Create new record with Zod validation
   * @param idempotencyKey Optional — prevents duplicate creates on retry (5 min TTL)
   */
  create: (formData: unknown, idempotencyKey?: string) => Promise<T>

  /**
   * Update existing record with Zod validation
   * @param idempotencyKey Optional — prevents duplicate updates on retry (5 min TTL)
   */
  update: (id: string, formData: unknown, idempotencyKey?: string) => Promise<T>

  /** Delete (soft delete if table supports it, hard delete otherwise) */
  delete: (id: string) => Promise<void>

  /** Archive (soft delete — sets archived_at, status → 'archived') */
  archive?: (id: string) => Promise<void>

  /** Restore from archive (clears archived_at, status → 'active') */
  unarchive?: (id: string) => Promise<void>
}

/**
 * Internal profile lookup result
 * @internal
 */
export interface ProfileLookupResult {
  profileId: string
  userId: string
}

/** Extract the inferred type from a Zod schema */
export type InferSchemaType<T> = T extends z.ZodType<infer U> ? U : never
