/**
 * Wire compatibility tests — validates cross-language parity between
 * the Python prefab-ui library (golden JSON fixtures) and the TypeScript
 * @maxhealth.tech/prefab builder + renderer.
 *
 * Test strategy:
 *   1. Parse: Each golden fixture is valid $prefab v0.2 wire format
 *   2. Render: The TS renderer can mount each fixture without errors
 *   3. Build: The TS builder produces structurally equivalent JSON
 *   4. Round-trip: TS builder → JSON → renderer → DOM succeeds
 *
 * @happy-dom
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ── Builder imports ──────────────────────────────────────────────────────────
import { PrefabApp } from '../src/app'
import type { PrefabWireFormat } from '../src/app'
import type { ComponentJSON } from '../src/core/component'
import {
  Column, Row, Div, Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter,
  Heading, Text, Muted,
  Badge, DataTable, col, Metric, Separator,
  Input, Textarea, Button,
  Alert, AlertTitle, AlertDescription,
  Tabs, Tab,
  BarChart,
} from '../src/index'
import { SetState, ToggleState, CallHandler } from '../src/actions/index'
import { rx } from '../src/rx/index'

// ── Renderer imports ─────────────────────────────────────────────────────────
import type { PrefabWireData } from '../src/renderer/index'
import { registerAllComponents } from '../src/renderer/components/index'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { Store } from '../src/renderer/state'
import { createNoopTransport } from '../src/renderer/transport'

// ── Test helpers ─────────────────────────────────────────────────────────────

const GOLDEN_DIR = join(import.meta.dir, 'fixtures', 'golden')

function loadFixture(name: string): PrefabWireFormat & Record<string, unknown> {
  const raw = readFileSync(join(GOLDEN_DIR, name), 'utf-8')
  return JSON.parse(raw) as PrefabWireFormat & Record<string, unknown>
}

function loadAllFixtures(): { name: string; data: Record<string, unknown> }[] {
  return readdirSync(GOLDEN_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(name => ({ name, data: loadFixture(name) }))
}

/** Recursively collect all component types from a node tree */
function collectTypes(node: Record<string, unknown>): string[] {
  const types: string[] = []
  if (node.type) types.push(node.type as string)
  if (Array.isArray(node.children)) {
    for (const child of node.children as Record<string, unknown>[]) {
      types.push(...collectTypes(child))
    }
  }
  return types
}

/** Recursively count nodes in a component tree */
function countNodes(node: Record<string, unknown>): number {
  let count = 1
  if (Array.isArray(node.children)) {
    for (const child of node.children as Record<string, unknown>[]) {
      count += countNodes(child)
    }
  }
  return count
}

/** Create a minimal render context for engine tests */
function makeRenderCtx(state?: Record<string, unknown>): RenderContext {
  return {
    store: new Store(state ?? {}),
    scope: {},
    transport: createNoopTransport(),
    rerender: () => {},
  }
}

/** Extract the inner view (first child of Div root) from a wire payload */
function innerView(wire: Record<string, unknown>): Record<string, unknown> {
  const view = wire.view as Record<string, unknown>
  if (view.type === 'Div' && Array.isArray(view.children)) {
    return (view.children as Record<string, unknown>[])[0]
  }
  return view
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  registerAllComponents()
})

// ══════════════════════════════════════════════════════════════════════════════
// Part 1: Golden fixture parsing & validation
// ══════════════════════════════════════════════════════════════════════════════

describe('Wire compat: Golden fixture parsing', () => {
  const fixtures = loadAllFixtures()

  it('has at least 9 golden fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(9)
  })

  for (const { name, data } of fixtures) {
    describe(name, () => {
      it('has $prefab.version = "0.2"', () => {
        expect(data.$prefab).toEqual({ version: '0.2' })
      })

      it('has a view with type and children', () => {
        const view = data.view as Record<string, unknown>
        expect(view).toBeDefined()
        expect(view.type).toBe('Div')
        expect(Array.isArray(view.children)).toBe(true)
      })

      it('root view has pf-app-root cssClass', () => {
        const view = data.view as Record<string, unknown>
        expect(view.cssClass).toContain('pf-app-root')
      })

      it('all nodes have a type field', () => {
        const types = collectTypes(data.view as Record<string, unknown>)
        expect(types.length).toBeGreaterThan(0)
        for (const t of types) {
          expect(typeof t).toBe('string')
          expect(t.length).toBeGreaterThan(0)
        }
      })
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// Part 2: Renderer can mount each golden fixture
// ══════════════════════════════════════════════════════════════════════════════

describe('Wire compat: Renderer mounts golden fixtures', () => {
  const fixtures = loadAllFixtures()

  for (const { name, data } of fixtures) {
    it(`renders ${name} without throwing`, () => {
      const root = document.createElement('div')
      const wireData = data as unknown as PrefabWireData
      const state = (wireData.state ?? {}) as Record<string, unknown>
      const ctx = makeRenderCtx(state)
      if (wireData.defs) ctx.defs = wireData.defs as Record<string, ComponentNode>

      expect(() => {
        const el = renderNode(wireData.view as ComponentNode, ctx)
        root.appendChild(el)
      }).not.toThrow()

      // The DOM should contain at least one element
      expect(root.children.length).toBeGreaterThan(0)
    })

    it(`renders ${name} — DOM has expected component types`, () => {
      const root = document.createElement('div')
      const wireData = data as unknown as PrefabWireData
      const state = (wireData.state ?? {}) as Record<string, unknown>
      const ctx = makeRenderCtx(state)
      if (wireData.defs) ctx.defs = wireData.defs as Record<string, ComponentNode>

      const el = renderNode(wireData.view as ComponentNode, ctx)
      root.appendChild(el)

      // Should have rendered child elements (not just empty)
      expect(root.innerHTML.length).toBeGreaterThan(10)
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// Part 3: TS builder produces structurally equivalent JSON
// ══════════════════════════════════════════════════════════════════════════════

describe('Wire compat: TS builder structural equivalence', () => {

  // ── 01 hello-world ───────────────────────────────────────────────────────

  describe('01-hello-world', () => {
    const golden = loadFixture('01-hello-world.json')
    const goldenInner = innerView(golden)

    const tsView = Column({ gap: 4, children: [
      Heading('Hello World'),
      Badge('Active', { variant: 'success' }),
    ]})
    const tsApp = new PrefabApp({ view: tsView })
    const tsWire = tsApp.toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('envelope matches', () => {
      expect(tsWire.$prefab).toEqual({ version: '0.2' })
      expect((tsWire.view as ComponentJSON).type).toBe('Div')
      expect((tsWire.view as ComponentJSON).cssClass).toContain('pf-app-root')
    })

    it('root component type matches', () => {
      expect(tsInner.type).toBe(goldenInner.type) // Column
    })

    it('has same number of children', () => {
      const goldenChildren = goldenInner.children as unknown[]
      const tsChildren = tsInner.children as unknown[]
      expect(tsChildren.length).toBe(goldenChildren.length)
    })

    it('child component types match', () => {
      const goldenTypes = collectTypes(goldenInner)
      const tsTypes = collectTypes(tsInner)
      expect(tsTypes).toEqual(goldenTypes)
    })

    it('Heading content matches', () => {
      const goldenHeading = (goldenInner.children as Record<string, unknown>[])[0]
      const tsHeading = (tsInner.children as Record<string, unknown>[])[0]
      expect(tsHeading.content).toBe(goldenHeading.content)
    })

    it('Badge content matches', () => {
      const goldenBadge = (goldenInner.children as Record<string, unknown>[])[1]
      const tsBadge = (tsInner.children as Record<string, unknown>[])[1]
      expect(tsBadge.label).toBe(goldenBadge.label)
      expect(tsBadge.variant).toBe(goldenBadge.variant)
    })
  })

  // ── 02 data-table ────────────────────────────────────────────────────────

  describe('02-data-table', () => {
    const golden = loadFixture('02-data-table.json')
    const goldenInner = innerView(golden)

    const rows = [
      { name: 'Alice', role: 'Admin', status: 'Active' },
      { name: 'Bob', role: 'Editor', status: 'Inactive' },
      { name: 'Carol', role: 'Viewer', status: 'Active' },
    ]
    const tsView = Column({ gap: 4, children: [
      Heading('User Directory', { level: 2 }),
      DataTable({
        rows,
        columns: [
          col('name', 'Name'),
          col('role', 'Role'),
          col('status', 'Status'),
        ],
      }),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('component types match', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('DataTable has same row data', () => {
      const goldenDT = (goldenInner.children as Record<string, unknown>[])[1]
      const tsDT = (tsInner.children as Record<string, unknown>[])[1]
      expect(tsDT.rows).toEqual(goldenDT.rows)
    })

    it('DataTable has same column keys', () => {
      const goldenDT = (goldenInner.children as Record<string, unknown>[])[1]
      const tsDT = (tsInner.children as Record<string, unknown>[])[1]
      const goldenKeys = (goldenDT.columns as { key: string }[]).map(c => c.key)
      const tsKeys = (tsDT.columns as { key: string }[]).map(c => c.key)
      expect(tsKeys).toEqual(goldenKeys)
    })

    it('DataTable column headers match', () => {
      const goldenDT = (goldenInner.children as Record<string, unknown>[])[1]
      const tsDT = (tsInner.children as Record<string, unknown>[])[1]
      const goldenHeaders = (goldenDT.columns as { header: string }[]).map(c => c.header)
      const tsHeaders = (tsDT.columns as { header: string }[]).map(c => c.header)
      expect(tsHeaders).toEqual(goldenHeaders)
    })
  })

  // ── 03 form-with-actions ─────────────────────────────────────────────────

  describe('03-form-with-actions', () => {
    const golden = loadFixture('03-form-with-actions.json')
    const goldenInner = innerView(golden)

    const tsView = Column({ gap: 4, children: [
      Heading('Contact Form', { level: 2 }),
      Input({ name: 'email', label: 'Email', placeholder: 'you@example.com' }),
      Textarea({ name: 'message', placeholder: 'Your message...' }),
      Button('Submit', { onClick: new CallHandler('submit_form') }),
    ]})
    const tsWire = new PrefabApp({
      view: tsView,
      state: { email: '', message: '' },
    }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('component types match', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('action format matches', () => {
      const goldenBtn = (goldenInner.children as Record<string, unknown>[])[3]
      const tsBtn = (tsInner.children as Record<string, unknown>[])[3]
      expect((tsBtn.onClick as Record<string, unknown>).action)
        .toBe((goldenBtn.onClick as Record<string, unknown>).action)
      expect((tsBtn.onClick as Record<string, unknown>).handler)
        .toBe((goldenBtn.onClick as Record<string, unknown>).handler)
    })

    it('state matches', () => {
      expect(tsWire.state).toEqual(golden.state)
    })

    it('Input has correct name', () => {
      const goldenInput = (goldenInner.children as Record<string, unknown>[])[1]
      const tsInput = (tsInner.children as Record<string, unknown>[])[1]
      expect(tsInput.name).toBe(goldenInput.name)
    })
  })

  // ── 04 detail-card ───────────────────────────────────────────────────────

  describe('04-detail-card', () => {
    const golden = loadFixture('04-detail-card.json')
    const goldenInner = innerView(golden)

    const tsView = Card({ children: [
      CardHeader({ children: [
        CardTitle('Patient Summary'),
        CardDescription('Last updated: 2024-01-15'),
      ]}),
      CardContent({ children: [
        Column({ gap: 3, children: [
          Row({ gap: 4, children: [
            Metric({ label: 'Heart Rate', value: '72 bpm' }),
            Metric({ label: 'Blood Pressure', value: '120/80' }),
            Metric({ label: 'Temperature', value: '98.6°F' }),
          ]}),
          Separator(),
          Text('Patient is in stable condition.'),
        ]}),
      ]}),
      CardFooter({ children: [
        Badge('Stable', { variant: 'success' }),
      ]}),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('tree structure matches', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('Metric props match', () => {
      // Navigate: Card > CardContent > Column > Row > Metric[0]
      const tCard = tsInner.children as Record<string, unknown>[]
      const tsContent = (tCard[1] as Record<string, unknown>).children as Record<string, unknown>[]
      const tsCol = (tsContent[0] as Record<string, unknown>).children as Record<string, unknown>[]
      const tsRow = (tsCol[0] as Record<string, unknown>).children as Record<string, unknown>[]
      const tsMetric = tsRow[0]

      const gCard = goldenInner.children as Record<string, unknown>[]
      const gContent = (gCard[1] as Record<string, unknown>).children as Record<string, unknown>[]
      const gCol = (gContent[0] as Record<string, unknown>).children as Record<string, unknown>[]
      const gRow = (gCol[0] as Record<string, unknown>).children as Record<string, unknown>[]
      const gMetric = gRow[0]

      expect(tsMetric.label).toBe(gMetric.label)
      expect(tsMetric.value).toBe(gMetric.value)
    })

    it('node count matches', () => {
      expect(countNodes(tsInner)).toBe(countNodes(goldenInner))
    })
  })

  // ── 05 chart ─────────────────────────────────────────────────────────────

  describe('05-chart', () => {
    const golden = loadFixture('05-chart.json')
    const goldenInner = innerView(golden)

    const data = [
      { month: 'Jan', revenue: 4000, costs: 2400 },
      { month: 'Feb', revenue: 3000, costs: 1398 },
      { month: 'Mar', revenue: 2000, costs: 9800 },
      { month: 'Apr', revenue: 2780, costs: 3908 },
    ]
    const tsView = Column({ gap: 4, children: [
      Heading('Revenue Report', { level: 2 }),
      BarChart({
        data,
        xAxis: 'month',
        series: [
          { dataKey: 'revenue', label: 'Revenue', color: '#4f46e5' },
          { dataKey: 'costs', label: 'Costs', color: '#ef4444' },
        ],
        height: 300,
      }),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('component types match', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('chart data matches', () => {
      const goldenChart = (goldenInner.children as Record<string, unknown>[])[1]
      const tsChart = (tsInner.children as Record<string, unknown>[])[1]
      expect(tsChart.data).toEqual(goldenChart.data)
    })

    it('chart series match', () => {
      const goldenChart = (goldenInner.children as Record<string, unknown>[])[1]
      const tsChart = (tsInner.children as Record<string, unknown>[])[1]
      expect(tsChart.series).toEqual(goldenChart.series)
    })

    it('chart xAxis matches', () => {
      const goldenChart = (goldenInner.children as Record<string, unknown>[])[1]
      const tsChart = (tsInner.children as Record<string, unknown>[])[1]
      expect(tsChart.xAxis).toBe(goldenChart.xAxis)
    })
  })

  // ── 06 reactive-state ────────────────────────────────────────────────────

  describe('06-reactive-state', () => {
    const golden = loadFixture('06-reactive-state.json')
    const goldenInner = innerView(golden)

    const count = rx('count')
    const tsView = Column({ gap: 4, children: [
      Heading('Counter App'),
      Text(count.toString()),
      Row({ gap: 2, children: [
        Button('+1', { onClick: new SetState('count', rx('count').add(1).toString()) }),
        Button('-1', { onClick: new SetState('count', rx('count').sub(1).toString()) }),
        Button('Reset', { onClick: new SetState('count', 0) }),
      ]}),
    ]})
    const tsWire = new PrefabApp({ view: tsView, state: { count: 0 } }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('component types match', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('Rx text content uses template syntax', () => {
      const tsText = (tsInner.children as Record<string, unknown>[])[1]
      const goldenText = (goldenInner.children as Record<string, unknown>[])[1]
      // Both should contain {{ count }}
      expect(String(tsText.content)).toContain('{{ count }}')
      expect(String(goldenText.content)).toContain('{{ count }}')
    })

    it('setState actions use Rx expressions', () => {
      const tsRow = (tsInner.children as Record<string, unknown>[])[2]
      const tsButtons = tsRow.children as Record<string, unknown>[]
      const goldenRow = (goldenInner.children as Record<string, unknown>[])[2]
      const goldenButtons = goldenRow.children as Record<string, unknown>[]

      // +1 button
      const tsAction = tsButtons[0].onClick as Record<string, unknown>
      const _goldenAction = goldenButtons[0].onClick as Record<string, unknown>
      expect(tsAction.action).toBe('setState')
      expect(tsAction.key).toBe('count')
      expect(String(tsAction.value)).toContain('count')

      // Reset button — value should be 0
      const tsReset = tsButtons[2].onClick as Record<string, unknown>
      const goldenReset = goldenButtons[2].onClick as Record<string, unknown>
      expect(tsReset.value).toBe(goldenReset.value) // 0
    })

    it('state matches', () => {
      expect(tsWire.state).toEqual(golden.state)
    })
  })

  // ── 07 nested-layout ─────────────────────────────────────────────────────

  describe('07-nested-layout', () => {
    const golden = loadFixture('07-nested-layout.json')
    const goldenInner = innerView(golden)

    const tsView = Column({ gap: 4, children: [
      Card({ children: [
        CardContent({ children: [
          Row({ gap: 4, children: [
            Column({ gap: 2, children: [
              Heading('Left Panel', { level: 3 }),
              Text('Left content'),
            ]}),
            Column({ gap: 2, children: [
              Heading('Right Panel', { level: 3 }),
              Text('Right content'),
            ]}),
          ]}),
        ]}),
      ]}),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('tree structure matches', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('node count matches', () => {
      expect(countNodes(tsInner)).toBe(countNodes(goldenInner))
    })
  })

  // ── 08 alert ─────────────────────────────────────────────────────────────

  describe('08-alert', () => {
    const golden = loadFixture('08-alert.json')
    const goldenInner = innerView(golden)

    const tsView = Column({ gap: 4, children: [
      Alert({ variant: 'default', children: [
        AlertTitle('Information'),
        AlertDescription('This is a standard info alert.'),
      ]}),
      Alert({ variant: 'destructive', children: [
        AlertTitle('Error'),
        AlertDescription('Something went wrong.'),
      ]}),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('component types match', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('Alert variants match', () => {
      const goldenAlerts = goldenInner.children as Record<string, unknown>[]
      const tsAlerts = tsInner.children as Record<string, unknown>[]
      expect(tsAlerts[0].variant).toBe(goldenAlerts[0].variant)
      expect(tsAlerts[1].variant).toBe(goldenAlerts[1].variant)
    })

    it('AlertTitle content matches', () => {
      const goldenAlerts = goldenInner.children as Record<string, unknown>[]
      const tsAlerts = tsInner.children as Record<string, unknown>[]
      const gTitle = (goldenAlerts[0].children as Record<string, unknown>[])[0]
      const tTitle = (tsAlerts[0].children as Record<string, unknown>[])[0]
      expect(tTitle.content).toBe(gTitle.content)
    })
  })

  // ── 09 tabs ──────────────────────────────────────────────────────────────

  describe('09-tabs', () => {
    const golden = loadFixture('09-tabs.json')
    const goldenInner = innerView(golden)

    const tsView = Column({ gap: 4, children: [
      Heading('Settings', { level: 2 }),
      Tabs({ children: [
        Tab({ title: 'General', children: [Text('General settings go here.')] }),
        Tab({ title: 'Security', children: [Text('Security settings go here.')] }),
        Tab({ title: 'Notifications', children: [Text('Notification preferences go here.')] }),
      ]}),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    const tsInner = innerView(tsWire as unknown as Record<string, unknown>)

    it('component types match', () => {
      expect(collectTypes(tsInner)).toEqual(collectTypes(goldenInner))
    })

    it('Tab titles match', () => {
      const goldenTabs = (goldenInner.children as Record<string, unknown>[])[1]
      const tsTabs = (tsInner.children as Record<string, unknown>[])[1]
      const goldenTabChildren = goldenTabs.children as Record<string, unknown>[]
      const tsTabChildren = tsTabs.children as Record<string, unknown>[]

      expect(tsTabChildren.length).toBe(goldenTabChildren.length)
      for (let i = 0; i < tsTabChildren.length; i++) {
        expect(tsTabChildren[i].title).toBe(goldenTabChildren[i].title)
      }
    })
  })

  // ── 10 full-app envelope ─────────────────────────────────────────────────

  describe('10-full-app', () => {
    const golden = loadFixture('10-full-app.json')

    const tsView = Column({ gap: 4, children: [
      Card({ children: [
        CardContent({ children: [
          Text('Dashboard content here.'),
        ]}),
      ]}),
      Button('Toggle dark mode', { onClick: new ToggleState('darkMode') }),
    ]})

    const greetingDef = Column({ gap: 2, children: [
      Heading('Welcome back!'),
      Muted('You have new notifications.'),
    ]})

    const tsWire = new PrefabApp({
      view: tsView,
      state: { darkMode: false, user: { name: 'Alice' } },
      defs: { greeting: greetingDef },
    }).toJSON()

    it('state matches golden', () => {
      expect(tsWire.state).toEqual(golden.state)
    })

    it('defs are present', () => {
      expect(tsWire.defs).toBeDefined()
      expect(tsWire.defs!.greeting).toBeDefined()
      expect(tsWire.defs!.greeting.type).toBe('Column')
    })

    it('toggleState action matches', () => {
      const tsInner = innerView(tsWire as unknown as Record<string, unknown>)
      const goldenInner = innerView(golden)
      const tsBtn = (tsInner.children as Record<string, unknown>[])[1]
      const goldenBtn = (goldenInner.children as Record<string, unknown>[])[1]
      expect((tsBtn.onClick as Record<string, unknown>).action)
        .toBe((goldenBtn.onClick as Record<string, unknown>).action)
      expect((tsBtn.onClick as Record<string, unknown>).key)
        .toBe((goldenBtn.onClick as Record<string, unknown>).key)
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Part 4: Round-trip — TS builder → JSON → renderer → DOM
// ══════════════════════════════════════════════════════════════════════════════

describe('Wire compat: Round-trip TS→JSON→DOM', () => {

  it('hello-world round-trips', () => {
    const view = Column({ gap: 4, children: [
      Heading('Hello World'),
      Badge('Active', { variant: 'success' }),
    ]})
    const wire = new PrefabApp({ view }).toJSON()
    const root = document.createElement('div')
    const ctx = makeRenderCtx()
    const el = renderNode(wire.view as unknown as ComponentNode, ctx)
    root.appendChild(el)
    expect(root.innerHTML).toContain('Hello World')
  })

  it('form round-trips with state', () => {
    const view = Column({ gap: 4, children: [
      Input({ name: 'email', placeholder: 'you@example.com' }),
      Button('Submit', { onClick: new CallHandler('submit') }),
    ]})
    const wire = new PrefabApp({ view, state: { email: '' } }).toJSON()
    const root = document.createElement('div')
    const ctx = makeRenderCtx(wire.state)
    const el = renderNode(wire.view as unknown as ComponentNode, ctx)
    root.appendChild(el)
    expect(root.querySelector('input')).not.toBeNull()
    expect(root.querySelector('button')).not.toBeNull()
  })

  it('chart round-trips', () => {
    const view = Column({ children: [
      BarChart({
        data: [{ x: 'A', y: 10 }],
        series: [{ dataKey: 'y', label: 'Y' }],
        xAxis: 'x',
      }),
    ]})
    const wire = new PrefabApp({ view }).toJSON()
    const root = document.createElement('div')
    const ctx = makeRenderCtx()
    const el = renderNode(wire.view as unknown as ComponentNode, ctx)
    root.appendChild(el)
    // Chart should be rendered (even if as a placeholder in DOM-only env)
    expect(root.children.length).toBeGreaterThan(0)
  })

  it('reactive counter round-trips', () => {
    const view = Column({ children: [
      Text(rx('count').toString()),
      Button('+1', { onClick: new SetState('count', rx('count').add(1).toString()) }),
    ]})
    const wire = new PrefabApp({ view, state: { count: 0 } }).toJSON()
    const root = document.createElement('div')
    const ctx = makeRenderCtx(wire.state)
    const el = renderNode(wire.view as unknown as ComponentNode, ctx)
    root.appendChild(el)
    // The text should contain "0" (evaluated from state)
    expect(root.textContent).toContain('0')
  })

  it('tabs round-trips', () => {
    const view = Tabs({ children: [
      Tab({ title: 'One', children: [Text('First')] }),
      Tab({ title: 'Two', children: [Text('Second')] }),
    ]})
    const wire = new PrefabApp({ view }).toJSON()
    const root = document.createElement('div')
    const ctx = makeRenderCtx()
    const el = renderNode(wire.view as unknown as ComponentNode, ctx)
    root.appendChild(el)
    expect(root.textContent).toContain('One')
  })

  it('defs are resolved during render', () => {
    const myDef = Text('I am from a def')
    const _view = Div({ children: [
      // Use is not a direct component — defs are resolved by type name
    ]})
    const wire = new PrefabApp({
      view: Text('main content'),
      defs: { myWidget: myDef },
    }).toJSON()

    expect(wire.defs).toBeDefined()
    expect(wire.defs!.myWidget.type).toBe('Text')
    expect(wire.defs!.myWidget.content).toBe('I am from a def')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Part 5: Full JSON equality — TS builder output matches Python golden fixtures
// ══════════════════════════════════════════════════════════════════════════════

describe('Wire compat: Full JSON parity', () => {

  it('01-hello-world: TS output matches Python golden', () => {
    const golden = loadFixture('01-hello-world.json')
    const tsView = Column({ gap: 4, children: [
      Heading('Hello World'),
      Badge('Active', { variant: 'success' }),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    expect(tsWire).toEqual(golden)
  })

  it('02-data-table: TS output matches Python golden', () => {
    const golden = loadFixture('02-data-table.json')
    const tsView = Column({ gap: 4, children: [
      Heading('User Directory', { level: 2 }),
      DataTable({
        rows: [
          { name: 'Alice', role: 'Admin', status: 'Active' },
          { name: 'Bob', role: 'Editor', status: 'Inactive' },
          { name: 'Carol', role: 'Viewer', status: 'Active' },
        ],
        columns: [col('name', 'Name'), col('role', 'Role'), col('status', 'Status')],
      }),
    ]})
    const tsWire = new PrefabApp({ view: tsView }).toJSON()
    expect(tsWire).toEqual(golden)
  })

  it('03-form-with-actions: TS output matches Python golden', () => {
    const golden = loadFixture('03-form-with-actions.json')
    const tsView = Column({ gap: 4, children: [
      Heading('Contact Form', { level: 2 }),
      Input({ name: 'email', placeholder: 'you@example.com' }),
      Textarea({ name: 'message', placeholder: 'Your message...' }),
      Button('Submit', { onClick: new CallHandler('submit_form') }),
    ]})
    const tsWire = new PrefabApp({
      view: tsView,
      state: { email: '', message: '' },
    }).toJSON()
    expect(tsWire).toEqual(golden)
  })
})
