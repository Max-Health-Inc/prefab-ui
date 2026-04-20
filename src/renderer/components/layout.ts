/**
 * Layout component renderers — Column, Row, Grid, Container, Div, Span, etc.
 */

import { registerComponent, renderChildren, el } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerLayoutComponents(): void {
  registerComponent('Column', renderColumn)
  registerComponent('Row', renderRow)
  registerComponent('Grid', renderGrid)
  registerComponent('GridItem', renderGridItem)
  registerComponent('Container', renderContainer)
  registerComponent('Div', renderDiv)
  registerComponent('Span', renderSpan)
  registerComponent('Dashboard', renderGrid)
  registerComponent('DashboardItem', renderGridItem)
  registerComponent('Pages', renderPages)
  registerComponent('Page', renderDiv)
}

function renderColumn(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-column')
  e.style.display = 'flex'
  e.style.flexDirection = 'column'
  const gap = extractGap(node)
  if (gap != null) e.style.gap = `${gap * 4}px`
  if (node.align != null) e.style.alignItems = mapAlign(node.align as string)
  if (node.justify != null) e.style.justifyContent = mapJustify(node.justify as string)
  renderChildren(node, e, ctx)
  return e
}

function renderRow(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-row')
  e.style.display = 'flex'
  e.style.flexDirection = 'row'
  const gap = extractGap(node)
  if (gap != null) e.style.gap = `${gap * 4}px`
  if (node.align != null) e.style.alignItems = mapAlign(node.align as string)
  if (node.justify != null) e.style.justifyContent = mapJustify(node.justify as string)
  if (node.wrap != null) e.style.flexWrap = 'wrap'
  renderChildren(node, e, ctx)
  return e
}

function renderGrid(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-grid')
  e.style.display = 'grid'
  const cols = (node.columns as number | undefined) ?? 3
  e.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
  const gap = extractGap(node)
  if (gap != null) e.style.gap = `${gap * 4}px`
  renderChildren(node, e, ctx)
  return e
}

function renderGridItem(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-grid-item')
  if (node.colSpan != null) e.style.gridColumn = `span ${node.colSpan as number}`
  if (node.rowSpan != null) e.style.gridRow = `span ${node.rowSpan as number}`
  renderChildren(node, e, ctx)
  return e
}

function renderContainer(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-container')
  e.style.maxWidth = (node.maxWidth as string | undefined) ?? '1200px'
  e.style.margin = '0 auto'
  if (node.padding != null) e.style.padding = `${(node.padding as number) * 4}px`
  renderChildren(node, e, ctx)
  return e
}

function renderDiv(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-div')
  renderChildren(node, e, ctx)
  return e
}

function renderSpan(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('span', 'pf-span')
  renderChildren(node, e, ctx)
  return e
}

function renderPages(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-pages')
  renderChildren(node, e, ctx)
  return e
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const GAP_CLASS_RE = /\bgap-(\d+)\b/

/** Extract gap value from node.gap prop or cssClass "gap-N" pattern */
function extractGap(node: ComponentNode): number | null {
  if (node.gap != null) return node.gap as number
  if (typeof node.cssClass === 'string') {
    const match = GAP_CLASS_RE.exec(node.cssClass)
    if (match) return Number(match[1])
  }
  return null
}

function mapAlign(value: string): string {
  const m: Record<string, string> = { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch', baseline: 'baseline' }
  return m[value] ?? value
}

function mapJustify(value: string): string {
  const m: Record<string, string> = { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', around: 'space-around', evenly: 'space-evenly' }
  return m[value] ?? value
}
