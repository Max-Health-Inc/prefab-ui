/**
 * Chart tooltip — hit-zone overlays, crosshair, data dots, and tooltip popup.
 *
 * Extracted from charts.ts to keep each file under 700 LOC.
 */

import type { ChartLayout, SeriesEntry } from './charts.js'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export interface TooltipEntry {
  label: string
  value: string | number
  color: string
}

export interface TooltipCtx {
  wrapper: HTMLElement
  tooltip: HTMLElement
  svgEl: SVGSVGElement
}

/** Create and attach a tooltip div to the chart wrapper. */
export function createTooltip(wrapper: HTMLElement, svg: SVGSVGElement): TooltipCtx {
  const tooltip = document.createElement('div')
  tooltip.className = 'pf-chart-tooltip'
  wrapper.appendChild(tooltip)

  wrapper.addEventListener('mouseleave', () => {
    tooltip.classList.remove('pf-visible')
  })

  return { wrapper, tooltip, svgEl: svg }
}

/** Show the tooltip at a position relative to the SVG. */
export function showTooltipAt(
  ctx: TooltipCtx,
  svgX: number,
  _svgY: number,
  categoryLabel: string | undefined,
  entries: TooltipEntry[],
): void {
  const { tooltip, svgEl, wrapper } = ctx
  if (entries.length === 0) return

  let html = ''
  if (categoryLabel) {
    html += `<div class="pf-chart-tooltip-label">${esc(categoryLabel)}</div>`
  }
  for (const e of entries) {
    html += `<div class="pf-chart-tooltip-row">`
    html += `<span class="pf-chart-tooltip-dot" style="background:${esc(e.color)}"></span>`
    html += `<span>${esc(e.label)}:</span> <strong>${esc(String(e.value))}</strong>`
    html += `</div>`
  }
  tooltip.innerHTML = html

  const svgRect = svgEl.getBoundingClientRect()
  const wrapRect = wrapper.getBoundingClientRect()
  const viewBox = svgEl.viewBox.baseVal
  const scaleX = svgRect.width / (viewBox.width || 1)
  const pixelX = svgRect.left - wrapRect.left + svgX * scaleX
  const tooltipW = tooltip.offsetWidth || 100

  let left = pixelX + 12
  if (left + tooltipW > wrapRect.width) {
    left = pixelX - tooltipW - 12
  }
  tooltip.style.left = `${Math.max(0, left)}px`
  tooltip.style.top = '4px'
  tooltip.classList.add('pf-visible')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Attach hover hit-zones for bar chart columns. */
export function addBarTooltipZones(
  ctx: TooltipCtx,
  svg: SVGSVGElement,
  data: Record<string, unknown>[],
  series: SeriesEntry[],
  layout: ChartLayout,
  xAxisKey: string | undefined,
  formatValue: (raw: unknown, s: SeriesEntry, si: number) => string,
  formatLabel?: (raw: unknown) => string,
): void {
  const groupW = layout.plotWidth / data.length
  for (let di = 0; di < data.length; di++) {
    const x = layout.plotLeft + di * groupW
    const zone = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    zone.setAttribute('x', String(x))
    zone.setAttribute('y', String(layout.plotTop))
    zone.setAttribute('width', String(groupW))
    zone.setAttribute('height', String(layout.plotHeight))
    zone.setAttribute('fill', 'transparent')
    zone.style.cursor = 'default'

    const rawLabel = xAxisKey ? data[di][xAxisKey] : undefined
    const label = rawLabel != null
      ? (formatLabel ? formatLabel(rawLabel) : String(rawLabel as string | number))
      : undefined
    const entries: TooltipEntry[] = series.map((s, si) => ({
      label: s.label ?? s.dataKey,
      value: formatValue(data[di][s.dataKey], s, si),
      color: s.color ?? COLORS[si % COLORS.length],
    }))
    const centerX = x + groupW / 2

    const show = (): void => showTooltipAt(ctx, centerX, layout.plotTop, label, entries)
    const hide = (): void => ctx.tooltip.classList.remove('pf-visible')
    zone.addEventListener('mouseenter', show)
    zone.addEventListener('mouseleave', hide)
    zone.addEventListener('touchstart', show, { passive: true })
    zone.addEventListener('touchend', hide, { passive: true })
    svg.appendChild(zone)
  }
}

/** Attach hover hit-zones for line/area chart data points. */
export function addLineTooltipZones(
  ctx: TooltipCtx,
  svg: SVGSVGElement,
  data: Record<string, unknown>[],
  allSeries: SeriesEntry[],
  layout: ChartLayout,
  xAxisKey: string | undefined,
  formatValue: (raw: unknown, s: SeriesEntry, si: number) => string,
  crosshair?: SVGLineElement,
  dotGroups?: SVGCircleElement[][],
  formatLabel?: (raw: unknown) => string,
): void {
  const step = data.length === 1 ? layout.plotWidth : layout.plotWidth / (data.length - 1)
  for (let di = 0; di < data.length; di++) {
    const centerX = data.length === 1
      ? (layout.plotLeft + layout.plotRight) / 2
      : layout.plotLeft + (di / (data.length - 1)) * layout.plotWidth
    const zoneX = data.length === 1 ? layout.plotLeft : centerX - step / 2
    const zoneW = data.length === 1 ? layout.plotWidth : step

    const zone = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    zone.setAttribute('x', String(Math.max(layout.plotLeft, zoneX)))
    zone.setAttribute('y', String(layout.plotTop))
    zone.setAttribute('width', String(Math.min(zoneW, layout.plotRight - Math.max(layout.plotLeft, zoneX))))
    zone.setAttribute('height', String(layout.plotHeight))
    zone.setAttribute('fill', 'transparent')
    zone.style.cursor = 'default'

    const rawLabel = xAxisKey ? data[di][xAxisKey] : undefined
    const label = rawLabel != null
      ? (formatLabel ? formatLabel(rawLabel) : String(rawLabel as string | number))
      : undefined
    const entries: TooltipEntry[] = allSeries.map((s, si) => ({
      label: s.label ?? s.dataKey,
      value: formatValue(data[di][s.dataKey], s, si),
      color: s.color ?? COLORS[si % COLORS.length],
    }))

    const showHover = (): void => {
      showTooltipAt(ctx, centerX, layout.plotTop, label, entries)
      if (crosshair) {
        crosshair.setAttribute('x1', String(centerX))
        crosshair.setAttribute('x2', String(centerX))
        crosshair.setAttribute('opacity', '1')
      }
      if (dotGroups) {
        for (const dots of dotGroups) {
          for (const dot of dots) dot.setAttribute('data-visible', 'false')
          dots[di]?.setAttribute('data-visible', 'true')
        }
      }
    }
    const hideHover = (): void => {
      ctx.tooltip.classList.remove('pf-visible')
      if (crosshair) crosshair.setAttribute('opacity', '0')
      if (dotGroups) {
        for (const dots of dotGroups) {
          for (const dot of dots) dot.setAttribute('data-visible', 'false')
        }
      }
    }

    zone.addEventListener('mouseenter', showHover)
    zone.addEventListener('mouseleave', hideHover)
    zone.addEventListener('touchstart', showHover, { passive: true })
    zone.addEventListener('touchend', hideHover, { passive: true })
    svg.appendChild(zone)
  }
}
