/**
 * Data display components — DataTable, Badge, Metric, Separator, Progress, etc.
 */

import { Component } from '../../core/component.js'
import type { ComponentProps, RxStr } from '../../core/component.js'

// ── DataTable ────────────────────────────────────────────────────────────────

export interface DataTableColumnDef {
  key: string
  header?: string
  sortable?: boolean
}

/** Convenience factory for DataTableColumn definitions */
export function col(key: string, header?: string, opts?: { sortable?: boolean }): DataTableColumnDef {
  return { key, header: header ?? key, ...opts }
}

export interface DataTableProps extends ComponentProps {
  rows: unknown[] | RxStr
  columns: DataTableColumnDef[]
  search?: boolean
}

export function DataTable(props: DataTableProps): Component {
  const c = new Component('DataTable', props)
  c['getProps'] = () => ({
    rows: typeof props.rows === 'string' || (typeof props.rows === 'object' && props.rows !== null && 'toJSON' in props.rows)
      ? String(props.rows)
      : props.rows,
    columns: props.columns.map(col => ({
      key: col.key,
      header: col.header ?? col.key,
      ...(col.sortable && { sortable: true }),
    })),
    ...(props.search && { search: true }),
  })
  return c
}

// ── Badge ────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline'

export interface BadgeProps extends ComponentProps {
  variant?: BadgeVariant
}

export function Badge(content: RxStr, props?: BadgeProps): Component {
  const c = new Component('Badge', props)
  c['getProps'] = () => ({
    content: String(content),
    ...(props?.variant && { variant: props.variant }),
  })
  return c
}

// ── Dot ──────────────────────────────────────────────────────────────────────

export function Dot(color: string, props?: ComponentProps): Component {
  const c = new Component('Dot', props)
  c['getProps'] = () => ({ color })
  return c
}

// ── Metric ───────────────────────────────────────────────────────────────────

export interface MetricProps extends ComponentProps {
  label: RxStr
  value: RxStr
  delta?: RxStr
  trend?: 'up' | 'down' | 'flat'
  trendSentiment?: 'positive' | 'negative' | 'neutral'
  description?: RxStr
}

export function Metric(props: MetricProps): Component {
  const c = new Component('Metric', props)
  c['getProps'] = () => ({
    label: String(props.label),
    value: String(props.value),
    ...(props.delta !== undefined && { delta: String(props.delta) }),
    ...(props.trend && { trend: props.trend }),
    ...(props.trendSentiment && { trendSentiment: props.trendSentiment }),
    ...(props.description && { description: String(props.description) }),
  })
  return c
}

// ── Ring ─────────────────────────────────────────────────────────────────────

export interface RingProps extends ComponentProps {
  value: number | RxStr
  label?: RxStr
  variant?: string
  size?: number
  thickness?: number
}

export function Ring(props: RingProps): Component {
  const c = new Component('Ring', props)
  c['getProps'] = () => ({
    value: typeof props.value === 'number' ? props.value : String(props.value),
    ...(props.label && { label: String(props.label) }),
    ...(props.variant && { variant: props.variant }),
    ...(props.size !== undefined && { size: props.size }),
    ...(props.thickness !== undefined && { thickness: props.thickness }),
  })
  return c
}

// ── Progress ─────────────────────────────────────────────────────────────────

export interface ProgressProps extends ComponentProps {
  value: number | RxStr
  max?: number
  variant?: string
}

export function Progress(props: ProgressProps): Component {
  const c = new Component('Progress', props)
  c['getProps'] = () => ({
    value: typeof props.value === 'number' ? props.value : String(props.value),
    ...(props.max !== undefined && { max: props.max }),
    ...(props.variant && { variant: props.variant }),
  })
  return c
}

// ── Separator ────────────────────────────────────────────────────────────────

export function Separator(props?: ComponentProps): Component {
  return new Component('Separator', props)
}

// ── Loader ───────────────────────────────────────────────────────────────────

export function Loader(props?: ComponentProps): Component {
  return new Component('Loader', props)
}

// ── Icon ─────────────────────────────────────────────────────────────────────

export function Icon(name: string, props?: ComponentProps): Component {
  const c = new Component('Icon', props)
  c['getProps'] = () => ({ name })
  return c
}
