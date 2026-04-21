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
    const rects = svg!.querySelectorAll('rect')
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
    const rects = svg!.querySelectorAll('rect')
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
