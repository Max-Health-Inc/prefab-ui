/**
 * Layout components — Column, Row, Grid, Container, Div, Span, etc.
 */

import { ContainerComponent, type Component } from '../../core/component.js'
import type { ContainerProps } from '../../core/component.js'

// ── Column ───────────────────────────────────────────────────────────────────

export interface ColumnProps extends ContainerProps {
  gap?: number
  align?: string
}

export function Column(props: ColumnProps & { children?: Component[] }): ContainerComponent {
  // Compile gap into cssClass to match Python wire format
  const gapClass = props.gap !== undefined ? `gap-${props.gap}` : undefined
  const mergedCss = [props.cssClass, gapClass].filter(Boolean).join(' ') || undefined
  const c = new ContainerComponent('Column', { ...props, cssClass: mergedCss })
  Object.assign(c, { _gap: props.gap, _align: props.align })
  const origGetProps = c.getProps.bind(c)
  c.getProps = () => ({
    ...origGetProps(),
    ...(props.align && { align: props.align }),
  })
  return c
}

// ── Row ──────────────────────────────────────────────────────────────────────

export interface RowProps extends ContainerProps {
  gap?: number
  align?: string
}

export function Row(props: RowProps & { children?: Component[] }): ContainerComponent {
  // Compile gap into cssClass to match Python wire format
  const gapClass = props.gap !== undefined ? `gap-${props.gap}` : undefined
  const mergedCss = [props.cssClass, gapClass].filter(Boolean).join(' ') || undefined
  const c = new ContainerComponent('Row', { ...props, cssClass: mergedCss })
  c.getProps = () => ({
    ...(props.align && { align: props.align }),
  })
  return c
}

// ── Grid ─────────────────────────────────────────────────────────────────────

export interface GridProps extends ContainerProps {
  columns?: number | Record<string, number>
  gap?: number
  minColumnWidth?: string
  align?: string
}

export function Grid(props: GridProps & { children?: Component[] }): ContainerComponent {
  const c = new ContainerComponent('Grid', props)
  c.getProps = () => ({
    ...(props.columns !== undefined && { columns: props.columns }),
    ...(props.gap !== undefined && { gap: props.gap }),
    ...(props.minColumnWidth && { minColumnWidth: props.minColumnWidth }),
    ...(props.align && { align: props.align }),
  })
  return c
}

// ── GridItem ─────────────────────────────────────────────────────────────────

export interface GridItemProps extends ContainerProps {
  colSpan?: number
  rowSpan?: number
}

export function GridItem(props: GridItemProps & { children?: Component[] }): ContainerComponent {
  const c = new ContainerComponent('GridItem', props)
  c.getProps = () => ({
    ...(props.colSpan !== undefined && { colSpan: props.colSpan }),
    ...(props.rowSpan !== undefined && { rowSpan: props.rowSpan }),
  })
  return c
}

// ── Container ────────────────────────────────────────────────────────────────

export function Container(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Container', props)
}

// ── Div ──────────────────────────────────────────────────────────────────────

export function Div(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Div', props)
}

// ── Span ─────────────────────────────────────────────────────────────────────

export function Span(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Span', props)
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardProps extends ContainerProps {
  columns?: number
  rowHeight?: number
  gap?: number
}

export function Dashboard(props: DashboardProps & { children?: Component[] }): ContainerComponent {
  const c = new ContainerComponent('Dashboard', props)
  c.getProps = () => ({
    ...(props.columns !== undefined && { columns: props.columns }),
    ...(props.rowHeight !== undefined && { rowHeight: props.rowHeight }),
    ...(props.gap !== undefined && { gap: props.gap }),
  })
  return c
}

// ── DashboardItem ────────────────────────────────────────────────────────────

export interface DashboardItemProps extends ContainerProps {
  col?: number
  row?: number
  colSpan?: number
  rowSpan?: number
}

export function DashboardItem(props: DashboardItemProps & { children?: Component[] }): ContainerComponent {
  const c = new ContainerComponent('DashboardItem', props)
  c.getProps = () => ({
    ...(props.col !== undefined && { col: props.col }),
    ...(props.row !== undefined && { row: props.row }),
    ...(props.colSpan !== undefined && { colSpan: props.colSpan }),
    ...(props.rowSpan !== undefined && { rowSpan: props.rowSpan }),
  })
  return c
}

// ── Pages + Page ─────────────────────────────────────────────────────────────

export function Pages(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Pages', props)
}

export interface PageProps extends ContainerProps {
  name: string
}

export function Page(props: PageProps): ContainerComponent {
  const c = new ContainerComponent('Page', props)
  c.getProps = () => ({ name: props.name })
  return c
}
