/**
 * Data display renderers — DataTable, Badge, Metric, Progress, Separator, etc.
 */

import { registerComponent, resolveStr, resolveValue, el } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerDataComponents(): void {
  registerComponent('DataTable', renderDataTable)
  registerComponent('Badge', renderBadge)
  registerComponent('Dot', renderDot)
  registerComponent('Metric', renderMetric)
  registerComponent('Ring', renderRing)
  registerComponent('Progress', renderProgress)
  registerComponent('Separator', renderSeparator)
  registerComponent('Loader', renderLoader)
  registerComponent('Icon', renderIcon)
  registerComponent('Sparkline', renderSparkline)
}

function renderDataTable(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-datatable-wrapper')
  const table = document.createElement('table')
  table.className = 'pf-datatable'
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'

  const cols = (node.columns as { key: string; header?: string }[] | undefined) ?? []
  const rows = resolveValue(node.rows, ctx)

  // Header
  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  for (const col of cols) {
    const th = document.createElement('th')
    th.className = 'pf-datatable-th'
    th.textContent = col.header ?? col.key
    th.style.padding = '8px 12px'
    th.style.textAlign = 'left'
    th.style.borderBottom = '2px solid var(--border, #e5e7eb)'
    headerRow.appendChild(th)
  }
  thead.appendChild(headerRow)
  table.appendChild(thead)

  // Body
  const tbody = document.createElement('tbody')
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const tr = document.createElement('tr')
      for (const col of cols) {
        const td = document.createElement('td')
        td.className = 'pf-datatable-td'
        const cellVal = (row as Record<string, unknown>)[col.key]
        td.textContent = cellVal == null ? '' : String(cellVal as string | number | boolean)
        td.style.padding = '8px 12px'
        td.style.borderBottom = '1px solid var(--border, #e5e7eb)'
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
  }
  table.appendChild(tbody)

  // Search
  if (node.search === true) {
    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Search...'
    input.className = 'pf-datatable-search'
    input.style.marginBottom = '8px'
    input.style.padding = '6px 12px'
    input.style.width = '100%'
    input.style.boxSizing = 'border-box'
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase()
      const trs = Array.from(tbody.querySelectorAll('tr'))
      for (const tr of trs) {
        const cellText = (tr as HTMLElement).textContent.toLowerCase()
        ;(tr as HTMLElement).style.display = cellText.includes(q) ? '' : 'none'
      }
    })
    wrapper.appendChild(input)
  }

  wrapper.appendChild(table)
  return wrapper
}

function renderBadge(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('span', 'pf-badge')
  const variant = (node.variant as string | undefined) ?? 'default'
  e.setAttribute('data-variant', variant)
  e.style.alignItems = 'center'
  e.style.padding = '2px 10px'
  e.style.borderRadius = '9999px'
  e.style.fontSize = '12px'
  e.style.fontWeight = '500'
  e.textContent = resolveStr(node.label ?? node.content, ctx)
  applyBadgeStyle(e, variant)
  return e
}

function renderDot(node: ComponentNode, _ctx: RenderContext): HTMLElement {
  const e = el('span', 'pf-dot')
  const color = (node.color as string | undefined) ?? 'gray'
  e.style.display = 'inline-block'
  e.style.width = '8px'
  e.style.height = '8px'
  e.style.borderRadius = '50%'
  e.style.backgroundColor = color
  return e
}

function renderMetric(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-metric')

  const label = el('div', 'pf-metric-label')
  label.textContent = resolveStr(node.label, ctx)
  label.style.fontSize = '14px'
  label.style.color = 'var(--muted-foreground, #6b7280)'
  e.appendChild(label)

  const value = el('div', 'pf-metric-value')
  value.textContent = resolveStr(node.value, ctx)
  value.style.fontSize = '28px'
  value.style.fontWeight = '700'
  e.appendChild(value)

  if (node.delta != null) {
    const delta = el('span', 'pf-metric-delta')
    delta.textContent = resolveStr(node.delta, ctx)
    const trend = (node.trend as string | undefined) ?? ''
    const sentiment = (node.trendSentiment as string | undefined) ?? 'neutral'
    delta.style.fontSize = '14px'
    delta.style.color = sentiment === 'positive' ? 'green' : sentiment === 'negative' ? 'red' : 'inherit'
    if (trend === 'up') delta.textContent = '↑ ' + delta.textContent
    else if (trend === 'down') delta.textContent = '↓ ' + delta.textContent
    e.appendChild(delta)
  }

  if (node.description != null) {
    const desc = el('div', 'pf-metric-desc')
    desc.textContent = resolveStr(node.description, ctx)
    desc.style.fontSize = '12px'
    desc.style.color = 'var(--muted-foreground, #6b7280)'
    e.appendChild(desc)
  }

  return e
}

function renderRing(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-ring')
  const size = (node.size as number | undefined) ?? 80
  const thickness = (node.thickness as number | undefined) ?? 8
  const rawValue = Number(resolveValue(node.value, ctx) ?? 0)
  const value = Math.max(0, Math.min(100, rawValue))
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - value / 100)

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)

  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  bgCircle.setAttribute('cx', String(size / 2))
  bgCircle.setAttribute('cy', String(size / 2))
  bgCircle.setAttribute('r', String(radius))
  bgCircle.setAttribute('fill', 'none')
  bgCircle.setAttribute('stroke', 'var(--muted, #e5e7eb)')
  bgCircle.setAttribute('stroke-width', String(thickness))

  const fgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  fgCircle.setAttribute('cx', String(size / 2))
  fgCircle.setAttribute('cy', String(size / 2))
  fgCircle.setAttribute('r', String(radius))
  fgCircle.setAttribute('fill', 'none')
  fgCircle.setAttribute('stroke', 'var(--primary, #3b82f6)')
  fgCircle.setAttribute('stroke-width', String(thickness))
  fgCircle.setAttribute('stroke-dasharray', String(circumference))
  fgCircle.setAttribute('stroke-dashoffset', String(offset))
  fgCircle.setAttribute('stroke-linecap', 'round')
  fgCircle.style.transform = 'rotate(-90deg)'
  fgCircle.style.transformOrigin = 'center'

  svg.appendChild(bgCircle)
  svg.appendChild(fgCircle)
  e.appendChild(svg)

  if (node.label != null) {
    const label = el('div', 'pf-ring-label')
    label.textContent = resolveStr(node.label, ctx)
    label.style.textAlign = 'center'
    label.style.fontSize = '12px'
    e.appendChild(label)
  }
  return e
}

function renderProgress(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-progress')
  e.setAttribute('role', 'progressbar')
  const value = Number(resolveValue(node.value, ctx) ?? 0)
  const max = (node.max as number | undefined) ?? 100
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  e.setAttribute('aria-valuenow', String(value))
  e.setAttribute('aria-valuemin', '0')
  e.setAttribute('aria-valuemax', String(max))

  e.style.height = '8px'
  e.style.backgroundColor = 'var(--muted, #e5e7eb)'
  e.style.borderRadius = '4px'
  e.style.overflow = 'hidden'

  const fill = el('div', 'pf-progress-fill')
  fill.style.height = '100%'
  fill.style.width = `${pct}%`
  fill.style.backgroundColor = 'var(--primary, #3b82f6)'
  fill.style.borderRadius = '4px'
  fill.style.transition = 'width 0.3s ease'
  e.appendChild(fill)

  return e
}

function renderSeparator(_node: ComponentNode, _ctx: RenderContext): HTMLElement {
  const e = document.createElement('hr')
  e.className = 'pf-separator'
  e.style.border = 'none'
  e.style.borderTop = '1px solid var(--border, #e5e7eb)'
  e.style.margin = '8px 0'
  return e
}

function renderLoader(_node: ComponentNode, _ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-loader')
  e.textContent = '⏳'
  e.style.display = 'flex'
  e.style.justifyContent = 'center'
  e.style.padding = '16px'
  return e
}

function renderIcon(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('span', 'pf-icon')
  e.setAttribute('data-icon', resolveStr(node.name ?? node.content, ctx))
  return e
}

function renderSparkline(node: ComponentNode, _ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-sparkline')
  const data = (node.data as number[] | undefined) ?? []
  if (data.length === 0) return e

  const w = 120
  const h = 32
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(h))
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)

  const divisor = data.length > 1 ? data.length - 1 : 1
  const points = data.map((v, i) => {
    const x = (i / divisor) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', points)
  polyline.setAttribute('fill', 'none')
  polyline.setAttribute('stroke', 'var(--primary, #3b82f6)')
  polyline.setAttribute('stroke-width', '1.5')
  svg.appendChild(polyline)
  e.appendChild(svg)

  return e
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyBadgeStyle(e: HTMLElement, variant: string): void {
  const styles: Record<string, { bg: string; fg: string }> = {
    default: { bg: 'var(--primary, #3b82f6)', fg: '#fff' },
    secondary: { bg: 'var(--secondary, #f3f4f6)', fg: 'var(--secondary-foreground, #1f2937)' },
    destructive: { bg: 'var(--destructive, #ef4444)', fg: '#fff' },
    success: { bg: '#10b981', fg: '#fff' },
    warning: { bg: '#f59e0b', fg: '#fff' },
    info: { bg: '#3b82f6', fg: '#fff' },
    outline: { bg: 'transparent', fg: 'inherit' },
  }
  const s = styles[variant] ?? styles.default
  e.style.backgroundColor = s.bg
  e.style.color = s.fg
  if (variant === 'outline') e.style.border = '1px solid var(--border, #e5e7eb)'
}
