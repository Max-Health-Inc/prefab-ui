/**
 * Auto-rendering utilities — smart component generation from raw data.
 *
 * Ported from mcp-generator-3.x display_renderers.py.
 * These helpers let you render API responses as rich UIs without
 * manually building component trees.
 */

import { Component, ContainerComponent } from '../core/component.js'
import { Column, Row } from '../components/layout/index.js'
import { Heading, Text, Muted } from '../components/typography/index.js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/card/index.js'
import { DataTable, col, Badge, Separator } from '../components/data/index.js'
import type { DataTableColumnDef, BadgeVariant } from '../components/data/index.js'

// ── Status → Badge variant mapping ──────────────────────────────────────────

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  // Success
  available: 'success',
  active: 'success',
  enabled: 'success',
  approved: 'success',
  delivered: 'success',
  complete: 'success',
  completed: 'success',
  resolved: 'success',
  verified: 'success',
  published: 'success',
  open: 'success',
  healthy: 'success',
  connected: 'success',
  // Warning
  pending: 'warning',
  processing: 'warning',
  in_progress: 'warning',
  in_review: 'warning',
  placed: 'warning',
  waiting: 'warning',
  queued: 'warning',
  draft: 'warning',
  partial: 'warning',
  // Destructive / Error
  sold: 'destructive',
  inactive: 'destructive',
  disabled: 'destructive',
  deleted: 'destructive',
  cancelled: 'destructive',
  rejected: 'destructive',
  failed: 'destructive',
  error: 'destructive',
  expired: 'destructive',
  blocked: 'destructive',
  closed: 'destructive',
  revoked: 'destructive',
  suspended: 'destructive',
  disconnected: 'destructive',
}

/**
 * Get a Badge variant for a status string.
 * Falls back to 'outline' for unknown statuses.
 */
export function statusVariant(status: string): BadgeVariant {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_')
  return STATUS_VARIANTS[normalized] ?? 'outline'
}

/**
 * Register additional status→variant mappings.
 */
export function registerStatusVariants(mappings: Record<string, BadgeVariant>): void {
  for (const [key, variant] of Object.entries(mappings)) {
    STATUS_VARIANTS[key.toLowerCase().replace(/[\s-]/g, '_')] = variant
  }
}

// ── Type detection helpers ──────────────────────────────────────────────────

function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(value)
}

function isBooleanLike(value: unknown): boolean {
  return typeof value === 'boolean'
}

function isStatusLike(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false
  const statusKeys = ['status', 'state', 'phase', 'condition', 'mode']
  return statusKeys.some(sk => key.toLowerCase().includes(sk))
    || STATUS_VARIANTS[value.toLowerCase().replace(/[\s-]/g, '_')] !== undefined
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\bid\b/gi, 'ID')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}

// ── autoDetail ──────────────────────────────────────────────────────────────

export interface AutoDetailOptions {
  /** Title shown at the top of the card. Defaults to auto-detect from data. */
  title?: string
  /** Fields to exclude from the detail view. */
  exclude?: string[]
  /** Fields to include (if set, only these are shown). */
  include?: string[]
  /** Max nested depth to render (default 1). */
  maxDepth?: number
}

/**
 * Auto-generate a detail Card from a data object.
 *
 * Inspects value types and renders:
 * - Booleans → Badge (Yes/No)
 * - Status-like strings → Badge with variant
 * - Dates → Text with tabular-nums class
 * - Nested objects → sub-section
 * - Everything else → Text
 *
 * @example
 * ```ts
 * autoDetail({ name: 'John', status: 'active', createdAt: '2024-01-01' })
 * ```
 */
export function autoDetail(data: Record<string, unknown>, options?: AutoDetailOptions): ContainerComponent {
  const title = options?.title ?? detectTitle(data)
  const exclude = new Set(options?.exclude ?? [])
  const include = options?.include ? new Set(options.include) : null
  const maxDepth = options?.maxDepth ?? 1

  const fieldRows = buildDetailFields(data, exclude, include, 0, maxDepth)

  return Column({ gap: 5, cssClass: 'p-6 max-w-2xl', children: [
    ...(title ? [Heading(title)] : []),
    Card({ children: [
      CardContent({ cssClass: 'py-4', children: fieldRows }),
    ] }),
  ] })
}

function detectTitle(data: Record<string, unknown>): string | undefined {
  const titleFields = ['name', 'title', 'username', 'displayName', 'display_name', 'label', 'email']
  for (const field of titleFields) {
    if (typeof data[field] === 'string' && data[field]) {
      return String(data[field])
    }
  }
  return undefined
}

function buildDetailFields(
  data: Record<string, unknown>,
  exclude: Set<string>,
  include: Set<string> | null,
  depth: number,
  maxDepth: number,
): Component[] {
  const entries = Object.entries(data).filter(([key]) => {
    if (exclude.has(key)) return false
    if (include && !include.has(key)) return false
    return true
  })

  const components: Component[] = []
  let shown = 0

  for (const [key, value] of entries) {
    // Skip nested objects/arrays at top level (handle below)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) continue
    if (Array.isArray(value)) continue

    if (shown > 0) components.push(Separator())

    const label = humanizeKey(key)
    const valueComponent = renderFieldValue(key, value)

    components.push(Row({ gap: 4, align: 'center', cssClass: 'py-2', children: [
      Text(label, { cssClass: 'font-medium text-muted-foreground w-40 shrink-0' }),
      valueComponent,
    ] }))
    shown++
  }

  // Nested objects as sub-sections
  if (depth < maxDepth) {
    for (const [key, value] of entries) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) continue

      if (shown > 0) components.push(Separator())
      const label = humanizeKey(key)
      const nestedFields = buildDetailFields(
        value as Record<string, unknown>, exclude, null, depth + 1, maxDepth,
      )

      components.push(
        Column({ gap: 2, cssClass: 'py-2', children: [
          Text(label, { bold: true, cssClass: 'text-muted-foreground' }),
          ...nestedFields,
        ] }),
      )
      shown++
    }
  }

  return components
}

function renderFieldValue(key: string, value: unknown): Component {
  if (value === null || value === undefined) {
    return Muted('—')
  }
  if (isBooleanLike(value)) {
    return Badge(value ? 'Yes' : 'No', { variant: value ? 'success' : 'outline' })
  }
  if (isStatusLike(key, value)) {
    return Badge(String(value), { variant: statusVariant(String(value)) })
  }
  if (isDateString(value)) {
    return Text(String(value), { cssClass: 'font-medium tabular-nums' })
  }
  return Text(String(value), { cssClass: 'font-medium' })
}

// ── autoTable ───────────────────────────────────────────────────────────────

export interface AutoTableOptions {
  /** Title shown above the table. */
  title?: string
  /** Override column definitions. If not set, auto-inferred from first row. */
  columns?: DataTableColumnDef[]
  /** Fields to exclude from auto-generated columns. */
  exclude?: string[]
  /** Enable search. Default true. */
  search?: boolean
  /** Make all columns sortable. Default true. */
  sortable?: boolean
}

/**
 * Auto-generate a DataTable from an array of objects.
 *
 * Infers columns from the first row's keys, skipping nested objects/arrays.
 * Wraps in a Column with a title and record count badge.
 *
 * @example
 * ```ts
 * autoTable([
 *   { name: 'John', email: 'john@example.com', age: 30 },
 *   { name: 'Jane', email: 'jane@example.com', age: 25 },
 * ], { title: 'Users' })
 * ```
 */
export function autoTable(rows: Record<string, unknown>[], options?: AutoTableOptions): ContainerComponent {
  const title = options?.title
  const search = options?.search ?? true
  const sortable = options?.sortable ?? true
  const exclude = new Set(options?.exclude ?? [])

  const columns = options?.columns ?? inferColumns(rows, exclude, sortable)

  const children: Component[] = []

  if (title) {
    children.push(Heading(title))
    children.push(Row({ gap: 2, align: 'center', children: [
      Badge(`${rows.length} records`, { variant: 'outline' }),
    ] }))
  }

  children.push(DataTable({ rows, columns, search }))

  return Column({ gap: 5, cssClass: 'p-6 max-w-4xl', children })
}

function inferColumns(
  rows: Record<string, unknown>[],
  exclude: Set<string>,
  sortable: boolean,
): DataTableColumnDef[] {
  if (rows.length === 0) return []

  const firstRow = rows[0]
  const columns: DataTableColumnDef[] = []

  for (const [key, value] of Object.entries(firstRow)) {
    if (exclude.has(key)) continue
    // Skip nested objects and arrays — they don't render well in tables
    if (typeof value === 'object' && value !== null) continue

    columns.push(col(key, humanizeKey(key), sortable ? { sortable: true } : undefined))
  }

  return columns
}
