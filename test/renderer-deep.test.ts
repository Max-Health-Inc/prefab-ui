/**
 * TDD round 3 — deep bug surfacing in Rx evaluator, charts, validation, theme.
 *
 * Each test targets a specific suspected bug found during code audit.
 * @happy-dom
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Store } from '../src/renderer/state'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { registerAllComponents } from '../src/renderer/components/index'
import { createNoopTransport } from '../src/renderer/transport'
import { evaluateTemplate } from '../src/renderer/rx'
import { validateWireFormat } from '../src/core/validate'
import { applyTheme } from '../src/renderer/theme'

beforeEach(() => { registerAllComponents() })

function makeCtx(state?: Record<string, unknown>): RenderContext {
  return {
    store: new Store(state),
    scope: {},
    transport: createNoopTransport(),
    rerender: () => {},
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rx EXPRESSION EVALUATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Bug: comparison operators matched by indexOf — breaks when operator chars
// appear inside string literals. e.g. {{ msg === 'a > b' }} matches '>' first.

describe('Rx comparison with operators in string literals', () => {
  const store = new Store({ status: 'a > b' })

  it('strict equality with > in string literal', () => {
    const result = evaluateTemplate("{{ status === 'a > b' }}", store)
    expect(result).toBe(true)
  })

  it('strict equality with < in string literal', () => {
    const store2 = new Store({ msg: 'x < y' })
    const result = evaluateTemplate("{{ msg === 'x < y' }}", store2)
    expect(result).toBe(true)
  })

  it('inequality with >= in string literal', () => {
    const store2 = new Store({ expr: 'a >= b' })
    const result = evaluateTemplate("{{ expr === 'a >= b' }}", store2)
    expect(result).toBe(true)
  })
})

// Bug: || inside string literals could be misinterpreted by indexOf

describe('Rx logical operators in string literals', () => {
  const store = new Store({ op: 'a || b' })

  it('equality check with || inside quoted string', () => {
    const result = evaluateTemplate("{{ op === 'a || b' }}", store)
    expect(result).toBe(true)
  })
})

// Bug: pipe | inside quoted filter args could split incorrectly

describe('Rx pipe edge cases', () => {
  const store = new Store({ items: ['x', 'y', 'z'] })

  it('join pipe with custom separator', () => {
    const result = evaluateTemplate("{{ items | join:', ' }}", store)
    expect(result).toBe('x, y, z')
  })

  it('chained pipes: length after join', () => {
    const result = evaluateTemplate('{{ items | length }}', store)
    expect(result).toBe(3)
  })

  it('default pipe provides fallback for null', () => {
    const store2 = new Store({})
    const result = evaluateTemplate("{{ missing | default:'N/A' }}", store2)
    expect(result).toBe('N/A')
  })

  it('default pipe passes through existing value', () => {
    const store2 = new Store({ name: 'Alice' })
    const result = evaluateTemplate("{{ name | default:'N/A' }}", store2)
    expect(result).toBe('Alice')
  })
})

// Bug: division by zero returns 0, not NaN/Infinity

describe('Rx arithmetic edge cases', () => {
  const store = new Store({ a: 10, b: 0 })

  it('division by zero returns 0', () => {
    const result = evaluateTemplate('{{ a / b }}', store)
    expect(result).toBe(0)
  })

  it('modulo by zero', () => {
    const result = evaluateTemplate('{{ a % b }}', store)
    // JS % 0 = NaN, but we should handle gracefully
    expect(Number.isFinite(result as number)).toBe(true)
  })

  it('negative number arithmetic', () => {
    const store2 = new Store({ x: -5 })
    const result = evaluateTemplate('{{ x + 3 }}', store2)
    expect(result).toBe(-2)
  })
})

// Bug: nested ternary operator parsing

describe('Rx nested ternary', () => {
  it('simple ternary true branch', () => {
    const store = new Store({ x: 5 })
    expect(evaluateTemplate("{{ x > 3 ? 'big' : 'small' }}", store)).toBe('big')
  })

  it('simple ternary false branch', () => {
    const store = new Store({ x: 1 })
    expect(evaluateTemplate("{{ x > 3 ? 'big' : 'small' }}", store)).toBe('small')
  })

  it('ternary with state references in branches', () => {
    const store = new Store({ flag: true, a: 'yes', b: 'no' })
    expect(evaluateTemplate('{{ flag ? a : b }}', store)).toBe('yes')
  })
})

// Bug: $item.property access in ForEach scope

describe('Rx scope variable deep access', () => {
  it('accesses $item property', () => {
    const store = new Store({})
    const scope = { $item: { name: 'Alice', age: 30 } }
    expect(evaluateTemplate('{{ $item.name }}', store, scope)).toBe('Alice')
    expect(evaluateTemplate('{{ $item.age }}', store, scope)).toBe(30)
  })

  it('handles $item when null', () => {
    const store = new Store({})
    const scope = { $item: null }
    expect(evaluateTemplate('{{ $item.name }}', store, scope)).toBeUndefined()
  })

  it('scope overrides state with same key', () => {
    const store = new Store({ name: 'Store' })
    const scope = { name: 'Scope' }
    expect(evaluateTemplate('{{ name }}', store, scope)).toBe('Scope')
  })
})

// Bug: multiple {{ }} expressions in one string

describe('Rx mixed template interpolation', () => {
  it('interpolates multiple expressions', () => {
    const store = new Store({ first: 'John', last: 'Doe' })
    expect(evaluateTemplate('{{ first }} {{ last }}', store)).toBe('John Doe')
  })

  it('handles expression returning null in mixed template', () => {
    const store = new Store({ first: 'John' })
    expect(evaluateTemplate('Hello {{ first }}, age: {{ age }}', store)).toBe('Hello John, age: ')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHARTS — edge cases
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Bug: LineChart with single data point → division by zero (data.length - 1 = 0)

describe('LineChart edge cases', () => {
  it('renders with single data point without NaN', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'LineChart',
      data: [{ month: 'Jan', sales: 100 }],
      series: [{ dataKey: 'sales' }],
    } as ComponentNode, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const path = svg.querySelector('path')!
    // Path d attribute should not contain NaN
    expect(path.getAttribute('d')).not.toContain('NaN')
  })

  it('renders empty state when no data', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'LineChart',
      data: [],
      series: [{ dataKey: 'sales' }],
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.textContent).toContain('No chart data')
  })
})

// Bug: PieChart with all-zero values → division by zero (total = 0)

describe('PieChart edge cases', () => {
  it('renders with all-zero values gracefully', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'PieChart',
      data: [{ cat: 'A', val: 0 }, { cat: 'B', val: 0 }],
      series: [{ dataKey: 'val' }],
    } as ComponentNode, ctx) as HTMLElement
    // With all zeros, total=0, should show fallback text instead of NaN paths
    expect(dom.textContent).toContain('No chart data')
  })

  it('renders with missing series dataKey gracefully', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'PieChart',
      data: [{ a: 10 }, { a: 20 }],
      series: [{ dataKey: 'nonexistent' }],
    } as ComponentNode, ctx) as HTMLElement
    // Should not throw
    expect(dom).toBeTruthy()
  })
})

// Bug: BarChart with negative values

describe('BarChart edge cases', () => {
  it('handles negative values without rendering outside SVG', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'BarChart',
      data: [{ x: 'A', y: -10 }, { x: 'B', y: 20 }],
      series: [{ dataKey: 'y' }],
    } as ComponentNode, ctx) as HTMLElement
    const svg = dom.querySelector('svg')!
    const rects = svg.querySelectorAll('rect')
    // Heights should not be negative
    for (const rect of Array.from(rects)) {
      const h = Number(rect.getAttribute('height'))
      expect(h).toBeGreaterThanOrEqual(0)
    }
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALIDATION — action format mismatch
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Bug: validateAction checks act.type but runtime actions use act.action.
// Actions like { action: 'setState', key: 'x', value: 1 } should be valid.

describe('Validation accepts runtime action format', () => {
  it('accepts action with "action" field (runtime format)', () => {
    const result = validateWireFormat({
      $prefab: { version: '0.2' },
      view: {
        type: 'Button',
        onClick: { action: 'setState', key: 'count', value: 1 },
      },
    })
    expect(result.valid).toBe(true)
  })

  it('accepts action with "type" field (legacy format)', () => {
    const result = validateWireFormat({
      $prefab: { version: '0.2' },
      view: {
        type: 'Button',
        onClick: { type: 'setState', key: 'count', value: 1 },
      },
    })
    expect(result.valid).toBe(true)
  })

  it('rejects action with neither type nor action field', () => {
    const result = validateWireFormat({
      $prefab: { version: '0.2' },
      view: {
        type: 'Button',
        onClick: { key: 'count', value: 1 },
      },
    })
    expect(result.valid).toBe(false)
  })

  it('accepts array of runtime-format actions', () => {
    const result = validateWireFormat({
      $prefab: { version: '0.2' },
      view: {
        type: 'Button',
        onClick: [
          { action: 'setState', key: 'x', value: 1 },
          { action: 'showToast', message: 'done' },
        ],
      },
    })
    expect(result.valid).toBe(true)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEME — CSS injection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Theme CSS sanitization', () => {
  it('strips dangerous characters from keys', () => {
    const root = document.createElement('div')
    applyTheme(root, { light: { 'primary;color:red': '#fff' } })
    // Semicolons should be stripped from property name
    const prop = root.style.getPropertyValue('--primarycolorred')
    // Should have set the sanitized name, value should be clean
    expect(prop).toBe('#fff')
  })

  it('strips url() from values', () => {
    const root = document.createElement('div')
    applyTheme(root, { light: { bg: 'url(javascript:alert(1))' } })
    const value = root.style.getPropertyValue('--bg')
    expect(value).not.toContain('url(')
  })

  it('strips expression() from values', () => {
    const root = document.createElement('div')
    applyTheme(root, { light: { bg: 'expression(alert(1))' } })
    const value = root.style.getPropertyValue('--bg')
    expect(value).not.toContain('expression(')
  })

  it('allows normal CSS values', () => {
    const root = document.createElement('div')
    applyTheme(root, { light: { primary: '#3b82f6', radius: '8px' } })
    expect(root.style.getPropertyValue('--primary')).toBe('#3b82f6')
    expect(root.style.getPropertyValue('--radius')).toBe('8px')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORE — dot-path access edge cases
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Store dot-path operations', () => {
  it('gets deeply nested value', () => {
    const store = new Store({ user: { profile: { name: 'Alice' } } })
    expect(store.get('user.profile.name')).toBe('Alice')
  })

  it('sets deeply nested value, creating intermediate objects', () => {
    const store = new Store({})
    store.set('user.profile.name', 'Bob')
    expect(store.get('user.profile.name')).toBe('Bob')
  })

  it('returns undefined for missing nested path', () => {
    const store = new Store({ user: {} })
    expect(store.get('user.profile.name')).toBeUndefined()
  })

  it('subscribe notifies on nested path change', () => {
    const store = new Store({ user: { name: 'Alice' } })
    let called = false
    store.subscribe('user', () => { called = true })
    store.set('user.name', 'Bob')
    expect(called).toBe(true)
  })

  it('subscribe notifies on exact path', () => {
    const store = new Store({ count: 0 })
    let called = false
    store.subscribe('count', () => { called = true })
    store.set('count', 1)
    expect(called).toBe(true)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEDIA — iframe sandboxing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Embed iframe sandboxing', () => {
  it('sets sandbox attribute', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Embed', src: 'https://example.com' } as ComponentNode, ctx) as HTMLElement
    const iframe = dom.querySelector('iframe')!
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts')
  })

  it('does not allow same-origin by default', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Embed', src: 'https://example.com' } as ComponentNode, ctx) as HTMLElement
    const iframe = dom.querySelector('iframe')!
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IMAGE — alt attribute and accessibility
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Image rendering', () => {
  it('sets src and alt attributes', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Image', src: '/photo.jpg', alt: 'A photo' } as ComponentNode, ctx) as HTMLImageElement
    expect(dom.src).toContain('/photo.jpg')
    expect(dom.alt).toBe('A photo')
  })

  it('sets width and height when provided', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Image', src: '/photo.jpg', width: 200, height: 150 } as ComponentNode, ctx) as HTMLImageElement
    expect(dom.width).toBe(200)
    expect(dom.height).toBe(150)
  })

  it('renders without alt (still produces img tag)', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Image', src: '/photo.jpg' } as ComponentNode, ctx) as HTMLImageElement
    expect(dom.tagName).toBe('IMG')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KEYBOARD SHORTCUTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { applyKeyBindings } from '../src/renderer/theme'

describe('Key bindings', () => {
  it('dispatches action on matching combo', () => {
    let dispatched = false
    const cleanup = applyKeyBindings(
      { 'ctrl+s': { action: 'setState', key: 'saved', value: true } },
      () => { dispatched = true; return Promise.resolve() },
    )
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's', ctrlKey: true, bubbles: true,
    }))
    expect(dispatched).toBe(true)
    cleanup?.()
  })

  it('does not dispatch on non-matching combo', () => {
    let dispatched = false
    const cleanup = applyKeyBindings(
      { 'ctrl+s': { action: 'setState' } },
      () => { dispatched = true; return Promise.resolve() },
    )
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a', ctrlKey: true, bubbles: true,
    }))
    expect(dispatched).toBe(false)
    cleanup?.()
  })

  it('handles shift modifier', () => {
    let dispatched = false
    const cleanup = applyKeyBindings(
      { 'shift+enter': { action: 'setState' } },
      () => { dispatched = true; return Promise.resolve() },
    )
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', shiftKey: true, bubbles: true,
    }))
    expect(dispatched).toBe(true)
    cleanup?.()
  })

  it('cleanup removes listener', () => {
    let count = 0
    const cleanup = applyKeyBindings(
      { 'ctrl+z': { action: 'setState' } },
      () => { count++; return Promise.resolve() },
    )
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    expect(count).toBe(1)
    cleanup?.()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    expect(count).toBe(1) // should not increment after cleanup
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rx FILTER EDGE CASES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Rx filters', () => {
  it('truncate with limit', () => {
    const store = new Store({ text: 'Hello World' })
    expect(evaluateTemplate('{{ text | truncate:5 }}', store)).toBe('Hello')
  })

  it('first element of array', () => {
    const store = new Store({ items: ['a', 'b', 'c'] })
    expect(evaluateTemplate('{{ items | first }}', store)).toBe('a')
  })

  it('last element of array', () => {
    const store = new Store({ items: ['a', 'b', 'c'] })
    expect(evaluateTemplate('{{ items | last }}', store)).toBe('c')
  })

  it('abs of negative number', () => {
    const store = new Store({ val: -42 })
    expect(evaluateTemplate('{{ val | abs }}', store)).toBe(42)
  })

  it('round to decimal places', () => {
    const store = new Store({ val: 3.14159 })
    expect(evaluateTemplate('{{ val | round:2 }}', store)).toBe(3.14)
  })

  it('percent filter', () => {
    const store = new Store({ ratio: 0.75 })
    expect(evaluateTemplate('{{ ratio | percent }}', store)).toBe('75%')
  })

  it('pluralize singular', () => {
    const store = new Store({ n: 1 })
    expect(evaluateTemplate("{{ n | pluralize:'item' }}", store)).toBe('item')
  })

  it('pluralize plural', () => {
    const store = new Store({ n: 5 })
    expect(evaluateTemplate("{{ n | pluralize:'item' }}", store)).toBe('items')
  })

  it('selectattr filters objects by truthy attribute', () => {
    const store = new Store({ items: [{ name: 'a', active: true }, { name: 'b', active: false }, { name: 'c', active: true }] })
    const result = evaluateTemplate("{{ items | selectattr:'active' }}", store)
    expect(Array.isArray(result)).toBe(true)
    expect((result as { name: string }[]).length).toBe(2)
  })

  it('rejectattr filters objects by falsy attribute', () => {
    const store = new Store({ items: [{ name: 'a', active: true }, { name: 'b', active: false }] })
    const result = evaluateTemplate("{{ items | rejectattr:'active' }}", store)
    expect(Array.isArray(result)).toBe(true)
    expect((result as { name: string }[]).length).toBe(1)
  })

  it('unknown filter returns value unchanged', () => {
    const store = new Store({ val: 42 })
    expect(evaluateTemplate('{{ val | nonexistentFilter }}', store)).toBe(42)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPARKLINE — SVG rendering
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Sparkline rendering', () => {
  it('renders SVG polyline from data', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'Sparkline', data: [10, 20, 15, 30, 25],
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.querySelector('svg')).toBeTruthy()
  })

  it('handles empty data', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'Sparkline', data: [],
    } as ComponentNode, ctx) as HTMLElement
    expect(dom).toBeTruthy()
  })

  it('handles single data point', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'Sparkline', data: [42],
    } as ComponentNode, ctx) as HTMLElement
    expect(dom).toBeTruthy()
  })
})
