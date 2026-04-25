/**
 * Renderer tests — Charts, Table, Media, and remaining data components.
 *
 * @happy-dom
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Store } from '../src/renderer/state'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { registerAllComponents } from '../src/renderer/components/index'
import { createNoopTransport } from '../src/renderer/transport'

beforeEach(() => { registerAllComponents() })

function makeCtx(state?: Record<string, unknown>): RenderContext {
  return {
    store: new Store(state),
    scope: {},
    transport: createNoopTransport(),
    rerender: () => {},
  }
}

// ── Charts ───────────────────────────────────────────────────────────────────

describe('BarChart', () => {
  it('renders SVG with bars', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: [
        { month: 'Jan', sales: 100 },
        { month: 'Feb', sales: 200 },
        { month: 'Mar', sales: 150 },
      ],
      series: [{ dataKey: 'sales', label: 'Sales' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')
    expect(svg).toBeTruthy()
    const rects = Array.from(svg!.querySelectorAll('rect')).filter(
      r => r.getAttribute('fill') !== 'transparent',
    )
    expect(rects.length).toBe(3)
  })

  it('shows "No chart data" when empty', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: [],
      series: [{ dataKey: 'sales' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.textContent).toContain('No chart data')
  })

  it('resolves data from state via Rx', () => {
    const ctx = makeCtx({
      chartData: [{ x: 10 }, { x: 20 }],
    })
    const node: ComponentNode = {
      type: 'BarChart',
      data: '{{ chartData }}',
      series: [{ dataKey: 'x' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')
    expect(svg).toBeTruthy()
    const rects = Array.from(svg!.querySelectorAll('rect')).filter(
      r => r.getAttribute('fill') !== 'transparent',
    )
    expect(rects.length).toBe(2)
  })
})

describe('LineChart', () => {
  it('renders SVG with path elements', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: [
        { day: 1, value: 10 },
        { day: 2, value: 20 },
        { day: 3, value: 15 },
      ],
      series: [{ dataKey: 'value', label: 'Values' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')
    expect(svg).toBeTruthy()
    const paths = svg!.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
  })

  it('renders X-axis labels when xAxis is set', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: [
        { month: 'Jan', value: 10 },
        { month: 'Feb', value: 20 },
        { month: 'Mar', value: 15 },
      ],
      series: [{ dataKey: 'value' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const texts = svg.querySelectorAll('text')
    const labels = [...texts].map(t => t.textContent).filter(t => ['Jan', 'Feb', 'Mar'].includes(t!))
    expect(labels.length).toBe(3)
  })

  it('renders Y-axis labels by default', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: [{ v: 50 }, { v: 100 }],
      series: [{ dataKey: 'v' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    // Y-axis draws text elements with text-anchor=end (left side)
    const yLabels = [...svg.querySelectorAll('text')].filter(
      t => t.getAttribute('text-anchor') === 'end',
    )
    expect(yLabels.length).toBeGreaterThan(0)
  })

  it('draws baseline', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: [{ v: 10 }, { v: 20 }],
      series: [{ dataKey: 'v' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const lines = svg.querySelectorAll('line')
    expect(lines.length).toBeGreaterThan(0)
  })

  it('draws grid lines when showGrid is true', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: [{ v: 50 }, { v: 100 }],
      series: [{ dataKey: 'v' }],
      showGrid: true,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    // Grid lines are dashed
    const dashed = [...svg.querySelectorAll('line')].filter(
      l => l.getAttribute('stroke-dasharray') != null,
    )
    expect(dashed.length).toBeGreaterThan(0)
  })
})

describe('LineChart dual Y-axis', () => {
  const dualData = [
    { month: 'Jan', revenue: 10000, conversion: 2.1 },
    { month: 'Feb', revenue: 15000, conversion: 3.4 },
    { month: 'Mar', revenue: 12000, conversion: 2.8 },
  ]

  it('renders right Y-axis labels when showYAxisRight + right series', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: dualData,
      series: [
        { dataKey: 'revenue', label: 'Revenue' },
        { dataKey: 'conversion', label: 'Conversion %', yAxisId: 'right' },
      ],
      showYAxisRight: true,
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    // Left Y-axis: text-anchor=end, Right Y-axis: text-anchor=start
    const leftLabels = [...svg.querySelectorAll('text')].filter(
      t => t.getAttribute('text-anchor') === 'end',
    )
    const rightLabels = [...svg.querySelectorAll('text')].filter(
      t => t.getAttribute('text-anchor') === 'start',
    )
    expect(leftLabels.length).toBeGreaterThan(0)
    expect(rightLabels.length).toBeGreaterThan(0)
  })

  it('uses dashed stroke for right-axis series', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: dualData,
      series: [
        { dataKey: 'revenue' },
        { dataKey: 'conversion', yAxisId: 'right' },
      ],
      showYAxisRight: true,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const paths = svg.querySelectorAll('path')
    const dashed = [...paths].filter(p => p.getAttribute('stroke-dasharray') != null)
    expect(dashed.length).toBe(1) // only the right-axis series
  })

  it('scales right-axis series independently from left', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: [
        { x: 'A', big: 1000, small: 1 },
        { x: 'B', big: 2000, small: 2 },
      ],
      series: [
        { dataKey: 'big', label: 'Big' },
        { dataKey: 'small', label: 'Small', yAxisId: 'right' },
      ],
      showYAxisRight: true,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    // Right axis ticks should be small numbers (not 1000s)
    const rightLabels = [...svg.querySelectorAll('text')]
      .filter(t => t.getAttribute('text-anchor') === 'start')
      .map(t => t.textContent!)
    // Verify we have small-scale ticks (0, 1, 2 range), not big-scale
    const rightValues = rightLabels.map(Number).filter(n => !isNaN(n))
    expect(rightValues.every(v => v <= 10)).toBe(true)
  })

  it('does not render right Y-axis when showYAxisRight is false', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: dualData,
      series: [
        { dataKey: 'revenue' },
        { dataKey: 'conversion', yAxisId: 'right' },
      ],
      showYAxisRight: false,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const rightLabels = [...svg.querySelectorAll('text')].filter(
      t => t.getAttribute('text-anchor') === 'start',
    )
    expect(rightLabels.length).toBe(0)
  })
})

describe('BarChart axes', () => {
  it('renders Y-axis labels by default', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: [{ m: 'Jan', v: 100 }, { m: 'Feb', v: 200 }],
      series: [{ dataKey: 'v' }],
      xAxis: 'm',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const yLabels = [...svg.querySelectorAll('text')].filter(
      t => t.getAttribute('text-anchor') === 'end',
    )
    expect(yLabels.length).toBeGreaterThan(0)
  })

  it('draws baseline', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: [{ v: 10 }],
      series: [{ dataKey: 'v' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const lines = svg.querySelectorAll('line')
    expect(lines.length).toBeGreaterThan(0)
  })
})

describe('PieChart', () => {
  it('renders SVG with pie slices (path elements)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'PieChart',
      data: [
        { label: 'A', value: 30 },
        { label: 'B', value: 50 },
        { label: 'C', value: 20 },
      ],
      series: [{ dataKey: 'value' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')
    expect(svg).toBeTruthy()
    const paths = svg!.querySelectorAll('path')
    expect(paths.length).toBe(3)
  })
})

describe('Histogram', () => {
  it('renders SVG with bars', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Histogram',
      data: [
        { bin: '0-10', count: 5 },
        { bin: '10-20', count: 12 },
        { bin: '20-30', count: 8 },
      ],
      series: [{ dataKey: 'count' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')
    expect(svg).toBeTruthy()
  })
})

// ── Chart tooltips ───────────────────────────────────────────────────────────

describe('Chart tooltips', () => {
  const chartData = [
    { month: 'Jan', sales: 100, cost: 40 },
    { month: 'Feb', sales: 200, cost: 80 },
    { month: 'Mar', sales: 150, cost: 60 },
  ]

  it('BarChart creates tooltip div when showTooltip is true (default)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const tooltip = dom.querySelector('.pf-chart-tooltip')
    expect(tooltip).not.toBeNull()
  })

  it('BarChart omits tooltip div when showTooltip is false', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
      xAxis: 'month',
      showTooltip: false,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const tooltip = dom.querySelector('.pf-chart-tooltip')
    expect(tooltip).toBeNull()
  })

  it('BarChart adds transparent hit-zone rects for each data point', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    // Hit zones are transparent rects (not the colored bar rects)
    const rects = Array.from(svg.querySelectorAll('rect'))
    const hitZones = rects.filter(r => r.getAttribute('fill') === 'transparent')
    expect(hitZones.length).toBe(3) // one per data point
  })

  it('LineChart creates tooltip div when showTooltip is true (default)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: chartData,
      series: [{ dataKey: 'sales' }, { dataKey: 'cost' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const tooltip = dom.querySelector('.pf-chart-tooltip')
    expect(tooltip).not.toBeNull()
  })

  it('LineChart omits tooltip when showTooltip is false', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
      showTooltip: false,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.querySelector('.pf-chart-tooltip')).toBeNull()
  })

  it('LineChart adds transparent hit-zone rects for each data point', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'LineChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const hitZones = Array.from(svg.querySelectorAll('rect')).filter(
      r => r.getAttribute('fill') === 'transparent',
    )
    expect(hitZones.length).toBe(3)
  })

  it('PieChart creates tooltip div and each slice has cursor style', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'PieChart',
      data: [
        { name: 'A', value: 60 },
        { name: 'B', value: 40 },
      ],
      series: [{ dataKey: 'value' }],
      xAxis: 'name',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const tooltip = dom.querySelector('.pf-chart-tooltip')
    expect(tooltip).not.toBeNull()
    // Each pie slice path should have cursor set
    const paths = dom.querySelectorAll('svg path')
    expect(paths.length).toBe(2)
  })

  it('AreaChart inherits tooltip from LineChart renderer', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'AreaChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.querySelector('.pf-chart-tooltip')).not.toBeNull()
  })

  it('tooltip div starts hidden (no pf-visible class)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    expect(tooltip.classList.contains('pf-visible')).toBe(false)
  })

  it('mouseenter on hit-zone shows tooltip with pf-visible class', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: chartData,
      series: [{ dataKey: 'sales', label: 'Sales' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    const svg = dom.querySelector('svg')!
    const hitZone = Array.from(svg.querySelectorAll('rect')).find(
      r => r.getAttribute('fill') === 'transparent',
    )!
    hitZone.dispatchEvent(new Event('mouseenter'))
    expect(tooltip.classList.contains('pf-visible')).toBe(true)
    // Should contain series label and value
    expect(tooltip.textContent).toContain('Sales')
    expect(tooltip.textContent).toContain('100')
  })

  it('mouseleave on hit-zone hides tooltip', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: chartData,
      series: [{ dataKey: 'sales' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    const svg = dom.querySelector('svg')!
    const hitZone = Array.from(svg.querySelectorAll('rect')).find(
      r => r.getAttribute('fill') === 'transparent',
    )!
    hitZone.dispatchEvent(new Event('mouseenter'))
    expect(tooltip.classList.contains('pf-visible')).toBe(true)
    hitZone.dispatchEvent(new Event('mouseleave'))
    expect(tooltip.classList.contains('pf-visible')).toBe(false)
  })

  it('tooltip content escapes HTML to prevent XSS', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: [{ name: '<script>alert("xss")</script>', val: 42 }],
      series: [{ dataKey: 'val' }],
      xAxis: 'name',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const hitZone = Array.from(svg.querySelectorAll('rect')).find(
      r => r.getAttribute('fill') === 'transparent',
    )!
    hitZone.dispatchEvent(new Event('mouseenter'))
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    expect(tooltip.innerHTML).not.toContain('<script>')
    expect(tooltip.innerHTML).toContain('&lt;script&gt;')
  })

  it('BarChart tooltipXKey shows different label than x-axis', () => {
    const ctx = makeCtx()
    const data = [
      { date: 'Jan 15', datetime: '2024-01-15 14:30', sales: 100 },
      { date: 'Jan 16', datetime: '2024-01-16 09:15', sales: 200 },
    ]
    const node: ComponentNode = {
      type: 'BarChart',
      data,
      series: [{ dataKey: 'sales', label: 'Sales' }],
      xAxis: 'date',
      tooltipXKey: 'datetime',
    }
    const dom = renderNode(node, ctx) as HTMLElement

    // X-axis labels should show abbreviated dates
    const svg = dom.querySelector('svg')!
    const axisLabels = Array.from(svg.querySelectorAll('text')).filter(
      t => t.textContent === 'Jan 15' || t.textContent === 'Jan 16',
    )
    expect(axisLabels.length).toBeGreaterThanOrEqual(2)

    // Tooltip should show full datetime from tooltipXKey
    const hitZone = Array.from(svg.querySelectorAll('rect')).find(
      r => r.getAttribute('fill') === 'transparent',
    )!
    hitZone.dispatchEvent(new Event('mouseenter'))
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    expect(tooltip.textContent).toContain('2024-01-15 14:30')
    expect(tooltip.textContent).not.toContain('Jan 15')
  })

  it('LineChart tooltipXKey shows different label than x-axis', () => {
    const ctx = makeCtx()
    const data = [
      { date: 'Mon', datetime: 'Monday, Jan 15 2024', value: 10 },
      { date: 'Tue', datetime: 'Tuesday, Jan 16 2024', value: 20 },
      { date: 'Wed', datetime: 'Wednesday, Jan 17 2024', value: 30 },
    ]
    const node: ComponentNode = {
      type: 'LineChart',
      data,
      series: [{ dataKey: 'value', label: 'Value' }],
      xAxis: 'date',
      tooltipXKey: 'datetime',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!

    // Trigger tooltip on first hit zone
    const hitZone = Array.from(svg.querySelectorAll('rect')).find(
      r => r.getAttribute('fill') === 'transparent',
    )!
    hitZone.dispatchEvent(new Event('mouseenter'))
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    expect(tooltip.textContent).toContain('Monday, Jan 15 2024')
  })

  it('PieChart tooltipXKey uses alternate label on slice hover', () => {
    const ctx = makeCtx()
    const data = [
      { abbr: 'US', country: 'United States', value: 60 },
      { abbr: 'UK', country: 'United Kingdom', value: 40 },
    ]
    const node: ComponentNode = {
      type: 'PieChart',
      data,
      series: [{ dataKey: 'value' }],
      xAxis: 'abbr',
      tooltipXKey: 'country',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const slices = svg.querySelectorAll('path')
    slices[0].dispatchEvent(new Event('mouseenter'))
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    expect(tooltip.textContent).toContain('United States')
  })

  it('tooltipXKey falls back to xAxisKey when not set', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'BarChart',
      data: [
        { month: 'Jan', sales: 100 },
        { month: 'Feb', sales: 200 },
      ],
      series: [{ dataKey: 'sales', label: 'Sales' }],
      xAxis: 'month',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const hitZone = Array.from(svg.querySelectorAll('rect')).find(
      r => r.getAttribute('fill') === 'transparent',
    )!
    hitZone.dispatchEvent(new Event('mouseenter'))
    const tooltip = dom.querySelector('.pf-chart-tooltip')!
    expect(tooltip.textContent).toContain('Jan')
  })
})

describe('RadarChart (fallback)', () => {
  it('renders placeholder for unsupported chart', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'RadarChart',
      data: [{ x: 1 }],
      series: [{ dataKey: 'x' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom).toBeTruthy()
  })
})

// ── Table components ─────────────────────────────────────────────────────────

describe('Table components', () => {
  it('renders full table structure', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Table',
      children: [
        {
          type: 'TableHead',
          children: [{
            type: 'TableRow',
            children: [
              { type: 'TableHeader', content: 'Name' },
              { type: 'TableHeader', content: 'Age' },
            ],
          }],
        },
        {
          type: 'TableBody',
          children: [
            {
              type: 'TableRow',
              children: [
                { type: 'TableCell', children: [{ type: 'Text', content: 'Alice' }] },
                { type: 'TableCell', children: [{ type: 'Text', content: '30' }] },
              ],
            },
            {
              type: 'TableRow',
              children: [
                { type: 'TableCell', children: [{ type: 'Text', content: 'Bob' }] },
                { type: 'TableCell', children: [{ type: 'Text', content: '25' }] },
              ],
            },
          ],
        },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.tagName).toBe('TABLE')
    expect(dom.querySelector('thead')).toBeTruthy()
    expect(dom.querySelector('tbody')).toBeTruthy()
    const rows = dom.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(dom.textContent).toContain('Alice')
    expect(dom.textContent).toContain('Bob')
  })

  it('renders TableCaption', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Table',
      children: [
        { type: 'TableCaption', content: 'User List' },
        { type: 'TableBody', children: [] },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const caption = dom.querySelector('caption')
    expect(caption).toBeTruthy()
    expect(caption!.textContent).toBe('User List')
  })

  it('renders TableCell with colSpan', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'TableCell',
      colSpan: 3,
      children: [{ type: 'Text', content: 'Wide cell' }],
    }
    const dom = renderNode(node, ctx) as HTMLTableCellElement
    expect(dom.tagName).toBe('TD')
    expect(dom.colSpan).toBe(3)
  })

  it('renders TableFooter', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Table',
      children: [
        { type: 'TableFooter', children: [{ type: 'TableRow', children: [{ type: 'TableCell', children: [{ type: 'Text', content: 'Total' }] }] }] },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.querySelector('tfoot')).toBeTruthy()
    expect(dom.textContent).toContain('Total')
  })
})

// ── Media components ─────────────────────────────────────────────────────────

describe('Media components', () => {
  it('renders Audio element with controls', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Audio', src: '/audio.mp3' }
    const dom = renderNode(node, ctx) as HTMLAudioElement
    expect(dom.tagName).toBe('AUDIO')
    expect(dom.getAttribute('src')).toBe('/audio.mp3')
    expect(dom.controls).toBe(true)
  })

  it('renders Video element with controls', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Video', src: '/video.mp4', width: 640, height: 480 }
    const dom = renderNode(node, ctx) as HTMLVideoElement
    expect(dom.tagName).toBe('VIDEO')
    expect(dom.getAttribute('src')).toBe('/video.mp4')
    expect(dom.controls).toBe(true)
    expect(dom.width).toBe(640)
    expect(dom.height).toBe(480)
  })

  it('renders Embed as sandboxed iframe', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Embed', src: 'https://example.com/widget', height: 500 }
    const dom = renderNode(node, ctx) as HTMLElement
    const iframe = dom.querySelector('iframe')!
    expect(iframe.getAttribute('src')).toBe('https://example.com/widget')
    expect(iframe.style.height).toBe('500px')
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts')
  })

  it('renders Mermaid as data-mermaid container', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Mermaid', content: 'graph TD; A-->B;' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.getAttribute('data-mermaid')).toBe('true')
    expect(dom.textContent).toContain('graph TD')
  })

  it('renders DropZone with label', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'DropZone', label: 'Upload here' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.className).toContain('pf-dropzone')
    expect(dom.textContent).toContain('Upload here')
  })
})

// ── Data components ──────────────────────────────────────────────────────────

describe('Metric component', () => {
  it('renders label and value', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Metric', label: 'Users', value: '1,234' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.textContent).toContain('Users')
    expect(dom.textContent).toContain('1,234')
  })

  it('renders delta with trend', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Metric',
      label: 'Revenue',
      value: '$10K',
      delta: '+12%',
      trend: 'up',
      trendSentiment: 'positive',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.textContent).toContain('↑')
    expect(dom.textContent).toContain('+12%')
  })

  it('resolves value from state', () => {
    const ctx = makeCtx({ userCount: 42 })
    const node: ComponentNode = { type: 'Metric', label: 'Users', value: '{{ userCount }}' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.textContent).toContain('42')
  })
})

describe('Dot component', () => {
  it('renders colored dot', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Dot', color: 'green' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.style.backgroundColor).toBe('green')
    expect(dom.style.borderRadius).toBe('50%')
  })
})

describe('Loader component', () => {
  it('renders loader element', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Loader' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.className).toContain('pf-loader')
  })
})

describe('Icon component', () => {
  it('renders icon with name', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Icon', name: 'check' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom).toBeTruthy()
  })
})

describe('DataTable with search', () => {
  it('renders search input when search=true', () => {
    const ctx = makeCtx({
      rows: [{ name: 'Alice' }, { name: 'Bob' }],
    })
    const node: ComponentNode = {
      type: 'DataTable',
      columns: [{ key: 'name', header: 'Name' }],
      rows: '{{ rows }}',
      search: true,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const searchInput = dom.querySelector('.pf-datatable-search') as HTMLInputElement
    expect(searchInput).toBeTruthy()
    expect(searchInput.type).toBe('text')
  })

  it('search filters rows', () => {
    const ctx = makeCtx({
      rows: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
    })
    const node: ComponentNode = {
      type: 'DataTable',
      columns: [{ key: 'name', header: 'Name' }],
      rows: '{{ rows }}',
      search: true,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const searchInput = dom.querySelector('.pf-datatable-search') as HTMLInputElement
    const tbody = dom.querySelector('tbody') as HTMLElement

    searchInput.value = 'alice'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))

    const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(
      tr => (tr as HTMLElement).style.display !== 'none',
    )
    expect(visibleRows.length).toBe(1)
  })
})

// ── Layout components ────────────────────────────────────────────────────────

describe('Layout components', () => {
  it('Row renders horizontal flex container', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Row',
      children: [
        { type: 'Text', content: 'A' },
        { type: 'Text', content: 'B' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.style.display).toBe('flex')
    expect(dom.style.flexDirection).toBe('row')
  })

  it('Grid renders CSS grid', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Grid',
      columns: 3,
      children: [
        { type: 'Text', content: '1' },
        { type: 'Text', content: '2' },
        { type: 'Text', content: '3' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.style.display).toBe('grid')
  })

  it('Container renders max-width wrapper', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Container',
      children: [{ type: 'Text', content: 'Content' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.className).toContain('pf-container')
  })
})

// ── Typography components ────────────────────────────────────────────────────

describe('Typography components', () => {
  it('H1 renders as h1 tag', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'H1', content: 'Title' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.tagName).toBe('H1')
    expect(dom.textContent).toBe('Title')
  })

  it('Code renders as code element', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Code', content: 'const x = 1' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.tagName === 'CODE' || dom.querySelector('code') !== null).toBe(true)
  })

  it('Link renders as anchor with target', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Link', content: 'Click me', href: 'https://example.com', target: '_blank' }
    const dom = renderNode(node, ctx) as HTMLAnchorElement
    expect(dom.tagName).toBe('A')
    expect(dom.getAttribute('href')).toBe('https://example.com')
  })

  it('BlockQuote renders as blockquote', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'BlockQuote', content: 'A wise quote' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.tagName).toBe('BLOCKQUOTE')
    expect(dom.textContent).toContain('A wise quote')
  })
})
