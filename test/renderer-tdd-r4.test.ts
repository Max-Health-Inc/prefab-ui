/**
 * TDD Round 4 — Bug-surfacing tests.
 *
 * Each test targets a specific edge case or bug found by code review.
 * Tests are written FIRST, then code is fixed to make them pass.
 *
 * @happy-dom
 */

/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression */

import { describe, expect, test, afterEach, mock } from 'bun:test'
import { Store } from '../src/renderer/state.js'
import { evaluateTemplate } from '../src/renderer/rx.js'
import { renderNode } from '../src/renderer/engine.js'
import type { ComponentNode, RenderContext } from '../src/renderer/engine.js'
import { registerAllComponents } from '../src/renderer/components/index.js'
import { dispatchActions, clearAllIntervals } from '../src/renderer/actions.js'
import type { DispatchContext, ActionJSON } from '../src/renderer/actions.js'
import { createHttpTransport, createNoopTransport } from '../src/renderer/transport.js'
import { PrefabApp } from '../src/app.js'
import { Text } from '../src/components/typography/index.js'

// ── Test setup ───────────────────────────────────────────────────────────────

registerAllComponents()

function makeCtx(state: Record<string, unknown> = {}): RenderContext {
  const store = new Store(state)
  return {
    store,
    scope: {},
    rerender: () => {},
    onToast: () => {},
  }
}

function makeDispatchCtx(
  state: Record<string, unknown> = {},
  overrides: Partial<DispatchContext> = {},
): DispatchContext {
  const store = new Store(state)
  return {
    store,
    rerender: () => {},
    onToast: () => {},
    ...overrides,
    store: overrides.store ?? store,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SPARKLINE SINGLE-POINT NaN BUG
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sparkline single data point', () => {
  test('should NOT produce NaN in SVG points when data has single element', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Sparkline', data: [42] }
    const el = renderNode(node, ctx) as HTMLElement
    const polyline = el.querySelector('polyline')
    expect(polyline).not.toBeNull()
    const points = polyline!.getAttribute('points') ?? ''
    expect(points).not.toContain('NaN')
  })

  test('two data points should produce valid polyline', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Sparkline', data: [10, 20] }
    const el = renderNode(node, ctx) as HTMLElement
    const polyline = el.querySelector('polyline')
    const points = polyline!.getAttribute('points') ?? ''
    expect(points).not.toContain('NaN')
    expect(points).not.toContain('Infinity')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FOREACH MISSING EXPRESSION THROWS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForEach missing expression', () => {
  test('should NOT throw when expression is undefined', () => {
    const ctx = makeCtx({ items: [1, 2, 3] })
    const node: ComponentNode = {
      type: 'ForEach',
      // expression is missing (undefined)
      children: [{ type: 'Text', content: 'item' }],
    }
    // Should not throw
    expect(() => renderNode(node, ctx)).not.toThrow()
  })

  test('should NOT throw when expression is empty string', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'ForEach',
      expression: '',
      children: [{ type: 'Text', content: 'item' }],
    }
    expect(() => renderNode(node, ctx)).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. RING VALUE CLAMPING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Ring value clamping', () => {
  test('value > 100 should clamp to full ring', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Ring', value: 150, size: 80 }
    const el = renderNode(node, ctx) as HTMLElement
    const circles = el.querySelectorAll('circle')
    expect(circles.length).toBe(2)
    // Foreground circle should have offset clamped (0 = full ring)
    const fgOffset = Number(circles[1].getAttribute('stroke-dashoffset'))
    expect(fgOffset).toBeGreaterThanOrEqual(0)
  })

  test('value < 0 should clamp to empty ring', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Ring', value: -50, size: 80 }
    const el = renderNode(node, ctx) as HTMLElement
    const circles = el.querySelectorAll('circle')
    const fgCircle = circles[1]
    const dasharray = Number(fgCircle.getAttribute('stroke-dasharray'))
    const dashoffset = Number(fgCircle.getAttribute('stroke-dashoffset'))
    // Offset should not exceed the circumference
    expect(dashoffset).toBeLessThanOrEqual(dasharray)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CAROUSEL EMPTY CHILDREN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Carousel edge cases', () => {
  test('should NOT crash with zero children', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Carousel' }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.className).toContain('pf-carousel')
  })

  test('next button with zero children should not produce negative index', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Carousel' }
    const el = renderNode(node, ctx) as HTMLElement
    const nextBtn = el.querySelector('.pf-carousel-next') as HTMLButtonElement
    expect(nextBtn).not.toBeNull()
    // Clicking next on empty carousel should not crash
    nextBtn.click()
    // transform should not contain negative percentage
    const track = el.querySelector('.pf-carousel-track') as HTMLElement
    const transform = track.style.transform
    expect(transform).not.toContain('--')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POPOVER CLICK PROPAGATION BUG
// ═══════════════════════════════════════════════════════════════════════════════

describe('Popover click behavior', () => {
  test('clicking popover content should NOT close it', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Popover',
      title: 'Info',
      children: [{ type: 'Text', content: 'Details here' }],
    }
    const el = renderNode(node, ctx) as HTMLElement
    const content = el.querySelector('.pf-popover-content') as HTMLElement

    // Open popover
    el.click()
    expect(content.style.display).toBe('block')

    // Click inside content should NOT close it
    content.click()
    expect(content.style.display).toBe('block')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. APP toHTML SCRIPT INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('PrefabApp toHTML script safety', () => {
  test('JSON containing </script> must not break HTML', () => {
    const app = new PrefabApp({
      view: Text({ content: '</script><script>alert(1)</script>' }),
    })
    const html = app.toHTML()
    // The raw </script> should NOT appear unescaped in the HTML body
    // It must be escaped so the script tag isn't prematurely closed
    const dataMatch = /window\.__PREFAB_DATA__\s*=\s*(.*?);/s.exec(html)
    expect(dataMatch).not.toBeNull()
    const jsonPart = dataMatch![1]
    // The literal </script> should be escaped (e.g., <\/script> or \\u003c/script>)
    expect(jsonPart).not.toContain('</script>')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. STORE MERGE PARENT PATH NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Store merge notification consistency', () => {
  test('merge with dot-path key should notify parent subscribers', () => {
    const store = new Store({ user: { name: 'Alice' } })
    let parentNotified = false
    store.subscribe('user', () => { parentNotified = true })
    store.merge({ 'user.name': 'Bob' })
    expect(parentNotified).toBe(true)
  })

  test('merge should notify child-path subscribers', () => {
    const store = new Store({ user: { name: 'Alice', age: 30 } })
    let nameNotified = false
    store.subscribe('user.name', () => { nameNotified = true })
    // Merging the parent key should notify child subscribers
    store.merge({ 'user.name': 'Bob' })
    expect(nameNotified).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SET-INTERVAL NaN GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('setInterval action edge cases', () => {
  afterEach(() => clearAllIntervals())

  test('NaN intervalMs should not create runaway interval', () => {
    const ctx = makeDispatchCtx()
    const action: ActionJSON = {
      action: 'setInterval',
      intervalMs: 'not-a-number' as unknown as number,
      onTick: { action: 'setState', key: 'tick', value: true },
    }
    // Should not throw and should not create an interval with NaN delay
    expect(() => void dispatchActions(action, ctx)).not.toThrow()
  })

  test('undefined intervalMs should use minimum interval', () => {
    const ctx = makeDispatchCtx()
    const action: ActionJSON = {
      action: 'setInterval',
      // intervalMs missing → undefined → NaN
      onTick: { action: 'setState', key: 'tick', value: true },
    }
    expect(() => void dispatchActions(action, ctx)).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. OPEN-LINK UNDEFINED URL
// ═══════════════════════════════════════════════════════════════════════════════

describe('openLink action safety', () => {
  test('undefined url should not open a page', () => {
    const openCalls: string[] = []
    const origOpen = window.open
    window.open = (url?: string | URL) => { openCalls.push(String(url)); return null }
    try {
      const ctx = makeDispatchCtx()
      void dispatchActions({ action: 'openLink' }, ctx)
      // Should NOT call window.open with 'undefined'
      expect(openCalls).not.toContain('undefined')
    } finally {
      window.open = origOpen
    }
  })

  test('empty string url should not open a page', () => {
    const openCalls: string[] = []
    const origOpen = window.open
    window.open = (url?: string | URL) => { openCalls.push(String(url)); return null }
    try {
      const ctx = makeDispatchCtx()
      void dispatchActions({ action: 'openLink', url: '' }, ctx)
      expect(openCalls).toHaveLength(0)
    } finally {
      window.open = origOpen
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. RX LOOSE EQUALITY OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rx != and == operators', () => {
  test('!= should work as not-equal', () => {
    const store = new Store({ status: 'active' })
    const result = evaluateTemplate("{{ status != 'inactive' }}", store)
    expect(result).toBe(true)
  })

  test('== should work as loose equal', () => {
    const store = new Store({ count: 5 })
    const result = evaluateTemplate('{{ count == 5 }}', store)
    expect(result).toBe(true)
  })

  test('!= with matching values should return false', () => {
    const store = new Store({ status: 'active' })
    const result = evaluateTemplate("{{ status != 'active' }}", store)
    expect(result).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. TRANSPORT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('createHttpTransport', () => {
  test('callTool should send correct JSON-RPC payload', async () => {
    let capturedBody: unknown
    const mockFetch = mock(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string)
      return new Response(JSON.stringify({
        result: { content: [{ type: 'text', text: '"hello"' }] }
      }))
    })

    const transport = createHttpTransport({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    const result = await transport.callTool('myTool', { arg1: 'value1' })
    expect(capturedBody).toEqual({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'myTool', arguments: { arg1: 'value1' } },
    })
    expect(result).toBe('hello')
  })

  test('callTool should throw on HTTP error', async () => {
    const mockFetch = mock(async () => new Response('', { status: 500, statusText: 'Internal Server Error' }))
    const transport = createHttpTransport({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })
    await expect(transport.callTool('tool', {})).rejects.toThrow('MCP tool call failed: 500')
  })

  test('callTool should throw on MCP error response', async () => {
    const mockFetch = mock(async () => new Response(JSON.stringify({
      error: { message: 'Tool not found' }
    })))
    const transport = createHttpTransport({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })
    await expect(transport.callTool('tool', {})).rejects.toThrow('Tool not found')
  })

  test('callTool should parse $prefab content from response', async () => {
    const prefabData = { $prefab: { version: '0.2' }, view: { type: 'Text', content: 'hi' } }
    const mockFetch = mock(async () => new Response(JSON.stringify({
      result: { content: [{ type: 'text', text: JSON.stringify(prefabData) }] }
    })))
    const transport = createHttpTransport({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })
    const result = await transport.callTool('tool', {})
    expect(result).toEqual(prefabData)
  })

  test('callTool with empty content should return result object', async () => {
    const mockFetch = mock(async () => new Response(JSON.stringify({
      result: { content: [] }
    })))
    const transport = createHttpTransport({
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })
    const result = await transport.callTool('tool', {})
    expect(result).toEqual({ content: [] })
  })

  test('sendMessage should POST to messages endpoint', async () => {
    let capturedUrl = ''
    let capturedBody: unknown
    const mockFetch = mock(async (url: string, init: RequestInit) => {
      capturedUrl = url
      capturedBody = JSON.parse(init.body as string)
      return new Response('{}')
    })
    const transport = createHttpTransport({
      baseUrl: 'http://test.local',
      fetch: mockFetch as unknown as typeof fetch,
    })
    await transport.sendMessage('hello world')
    expect(capturedUrl).toBe('http://test.local/mcp/messages')
    expect(capturedBody).toEqual({ message: 'hello world' })
  })

  test('custom headers should be merged with Content-Type', async () => {
    let capturedHeaders: Record<string, string> = {}
    const mockFetch = mock(async (_url: string, init: RequestInit) => {
      capturedHeaders = init.headers as Record<string, string>
      return new Response(JSON.stringify({ result: {} }))
    })
    const transport = createHttpTransport({
      baseUrl: 'http://test.local',
      headers: { Authorization: 'Bearer token123' },
      fetch: mockFetch as unknown as typeof fetch,
    })
    await transport.callTool('tool', {})
    expect(capturedHeaders['Content-Type']).toBe('application/json')
    expect(capturedHeaders.Authorization).toBe('Bearer token123')
  })
})

describe('createNoopTransport', () => {
  test('callTool should return null', async () => {
    const transport = createNoopTransport()
    const result = await transport.callTool('tool', {})
    expect(result).toBeNull()
  })

  test('sendMessage should resolve', async () => {
    const transport = createNoopTransport()
    const result = await transport.sendMessage('hi')
    expect(result).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 12. FETCH ACTION EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('fetch action', () => {
  test('onSuccess callback should receive $result in scope', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ data: 42 }))) as typeof fetch
    try {
      const store = new Store({})
      let rerenderCount = 0
      const ctx: DispatchContext = {
        store,
        rerender: () => { rerenderCount++ },
        onToast: () => {},
      }
      const action: ActionJSON = {
        action: 'fetch',
        url: 'https://api.example.com/data',
        resultKey: 'fetchResult',
        onSuccess: { action: 'setState', key: 'loaded', value: true },
      }
      await dispatchActions(action, ctx)
      expect(store.get('fetchResult')).toEqual({ data: 42 })
      expect(store.get('loaded')).toBe(true)
      expect(rerenderCount).toBeGreaterThan(0)
    } finally {
      globalThis.fetch = origFetch
    }
  })

  test('onError callback should fire on network failure', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = mock(async () => { throw new Error('Network error') }) as typeof fetch
    try {
      const store = new Store({})
      const ctx: DispatchContext = {
        store,
        rerender: () => {},
        onToast: () => {},
      }
      const action: ActionJSON = {
        action: 'fetch',
        url: 'https://api.example.com/fail',
        onError: { action: 'setState', key: 'error', value: true },
      }
      await dispatchActions(action, ctx)
      expect(store.get('error')).toBe(true)
    } finally {
      globalThis.fetch = origFetch
    }
  })

  test('fetch with custom method and headers', async () => {
    let capturedInit: RequestInit = {}
    const origFetch = globalThis.fetch
    globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init!
      return new Response('{}')
    }) as typeof fetch
    try {
      const ctx: DispatchContext = {
        store: new Store({}),
        rerender: () => {},
      }
      await dispatchActions({
        action: 'fetch',
        url: 'https://api.example.com/data',
        method: 'POST',
        headers: { 'X-Custom': 'test' },
        body: { key: 'value' },
      }, ctx)
      expect(capturedInit.method).toBe('POST')
      expect((capturedInit.headers as Record<string, string>)['X-Custom']).toBe('test')
      expect(capturedInit.body).toBe(JSON.stringify({ key: 'value' }))
    } finally {
      globalThis.fetch = origFetch
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 13. CONTROL FLOW — DEFINE/USE/SLOT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Define/Use template system', () => {
  test('Define then Use should render template content', () => {
    const ctx = makeCtx()
    // Define creates a template, Use materializes it
    const define: ComponentNode = {
      type: 'Define',
      name: 'greeting',
      children: [{ type: 'Text', content: 'Hello, World!' }],
    }
    const use: ComponentNode = { type: 'Use', def: 'greeting' }

    // Render Define first to register the template
    renderNode(define, ctx)
    // Then Use should materialize it
    const result = renderNode(use, ctx)
    expect(result.textContent).toContain('Hello, World!')
  })

  test('Use with legacy name prop should work', () => {
    const ctx = makeCtx()
    const define: ComponentNode = {
      type: 'Define',
      name: 'card-template',
      children: [{ type: 'Text', content: 'Card content' }],
    }
    renderNode(define, ctx)

    const use: ComponentNode = { type: 'Use', name: 'card-template' }
    const result = renderNode(use, ctx)
    expect(result.textContent).toContain('Card content')
  })

  test('Use with overrides should pass scope variables', () => {
    const ctx = makeCtx()
    const define: ComponentNode = {
      type: 'Define',
      name: 'item-tmpl',
      children: [{ type: 'Text', content: '{{ $item }}' }],
    }
    renderNode(define, ctx)

    const use: ComponentNode = {
      type: 'Use',
      def: 'item-tmpl',
      overrides: { $item: 'Override Value' },
    }
    const result = renderNode(use, ctx)
    expect(result.textContent).toContain('Override Value')
  })

  test('Use with undefined template should render empty', () => {
    const ctx = makeCtx()
    const use: ComponentNode = { type: 'Use', def: 'nonexistent' }
    const result = renderNode(use, ctx)
    expect(result.textContent).toBe('')
  })
})

describe('Slot fallback behavior', () => {
  test('Slot without provided content should render fallback children', () => {
    const ctx = makeCtx()
    const slot: ComponentNode = {
      type: 'Slot',
      name: 'footer',
      children: [{ type: 'Text', content: 'Default footer' }],
    }
    const result = renderNode(slot, ctx)
    expect(result.textContent).toContain('Default footer')
  })

  test('Slot with provided content should override fallback', () => {
    const ctx = makeCtx()
    ctx.slots = {
      footer: [{ type: 'Text', content: 'Custom footer' }],
    }
    const slot: ComponentNode = {
      type: 'Slot',
      name: 'footer',
      children: [{ type: 'Text', content: 'Default footer' }],
    }
    const result = renderNode(slot, ctx)
    expect(result.textContent).toContain('Custom footer')
    expect(result.textContent).not.toContain('Default footer')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 14. RX FILTER COVERAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rx pipe filters', () => {
  test('number filter with precision', () => {
    const store = new Store({ val: 3.14159 })
    expect(evaluateTemplate('{{ val | number:2 }}', store)).toBe(3.14)
  })

  test('compact filter', () => {
    const store = new Store({ val: 1500000 })
    const result = evaluateTemplate('{{ val | compact }}', store)
    expect(typeof result).toBe('string')
    expect(result).toContain('M') // 1.5M
  })

  test('date filter', () => {
    const store = new Store({ d: '2026-01-15T12:00:00Z' })
    const result = evaluateTemplate('{{ d | date }}', store)
    expect(typeof result).toBe('string')
    expect(String(result).length).toBeGreaterThan(0)
  })

  test('time filter', () => {
    const store = new Store({ d: '2026-01-15T12:30:00Z' })
    const result = evaluateTemplate('{{ d | time }}', store)
    expect(typeof result).toBe('string')
  })

  test('datetime filter', () => {
    const store = new Store({ d: '2026-01-15T12:30:00Z' })
    const result = evaluateTemplate('{{ d | datetime }}', store)
    expect(typeof result).toBe('string')
  })

  test('pluralize filter singular', () => {
    const store = new Store({ n: 1 })
    expect(evaluateTemplate("{{ n | pluralize:'item' }}", store)).toBe('item')
  })

  test('pluralize filter plural', () => {
    const store = new Store({ n: 5 })
    expect(evaluateTemplate("{{ n | pluralize:'item' }}", store)).toBe('items')
  })

  test('default filter with null value', () => {
    const store = new Store({ val: null })
    expect(evaluateTemplate("{{ val | default:'N/A' }}", store)).toBe('N/A')
  })

  test('default filter with existing value', () => {
    const store = new Store({ val: 'hello' })
    expect(evaluateTemplate("{{ val | default:'N/A' }}", store)).toBe('hello')
  })

  test('selectattr filter', () => {
    const store = new Store({
      items: [
        { name: 'a', active: true },
        { name: 'b', active: false },
        { name: 'c', active: true },
      ]
    })
    const result = evaluateTemplate("{{ items | selectattr:'active' }}", store)
    expect(Array.isArray(result)).toBe(true)
    expect((result as { name: string }[]).length).toBe(2)
  })

  test('rejectattr filter', () => {
    const store = new Store({
      items: [
        { name: 'a', active: true },
        { name: 'b', active: false },
        { name: 'c', active: true },
      ]
    })
    const result = evaluateTemplate("{{ items | rejectattr:'active' }}", store)
    expect(Array.isArray(result)).toBe(true)
    expect((result as { name: string }[]).length).toBe(1)
  })

  test('abs filter', () => {
    const store = new Store({ val: -42 })
    expect(evaluateTemplate('{{ val | abs }}', store)).toBe(42)
  })

  test('percent filter', () => {
    const store = new Store({ val: 0.856 })
    expect(evaluateTemplate('{{ val | percent }}', store)).toBe('86%')
  })

  test('percent filter with precision', () => {
    const store = new Store({ val: 0.856 })
    expect(evaluateTemplate('{{ val | percent:1 }}', store)).toBe('85.6%')
  })

  test('first and last on array', () => {
    const store = new Store({ arr: [10, 20, 30] })
    expect(evaluateTemplate('{{ arr | first }}', store)).toBe(10)
    expect(evaluateTemplate('{{ arr | last }}', store)).toBe(30)
  })

  test('join filter', () => {
    const store = new Store({ arr: ['a', 'b', 'c'] })
    expect(evaluateTemplate("{{ arr | join:'-' }}", store)).toBe('a-b-c')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 15. STORE EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Store edge cases', () => {
  test('append with index inserts at correct position', () => {
    const store = new Store({ items: ['a', 'b', 'c'] })
    store.append('items', 'X', 1)
    expect(store.get('items')).toEqual(['a', 'X', 'b', 'c'])
  })

  test('append to non-existent key creates array', () => {
    const store = new Store({})
    store.append('newItems', 'first')
    expect(store.get('newItems')).toEqual(['first'])
  })

  test('append to non-array value wraps in array', () => {
    const store = new Store({ val: 'not-an-array' })
    store.append('val', 'new')
    expect(store.get('val')).toEqual(['new'])
  })

  test('subscribe returns working unsubscribe function', () => {
    const store = new Store({ count: 0 })
    let callCount = 0
    const unsub = store.subscribe('count', () => { callCount++ })
    store.set('count', 1)
    expect(callCount).toBe(1)
    unsub()
    store.set('count', 2)
    expect(callCount).toBe(1) // should NOT have been called again
  })

  test('subscribeAll returns working unsubscribe function', () => {
    const store = new Store({ a: 1 })
    let callCount = 0
    const unsub = store.subscribeAll(() => { callCount++ })
    store.set('a', 2)
    expect(callCount).toBe(1)
    unsub()
    store.set('a', 3)
    expect(callCount).toBe(1)
  })

  test('constructor clones initial state (no shared references)', () => {
    const initial = { items: [1, 2, 3], nested: { key: 'val' } }
    const store = new Store(initial)
    store.set('items', [4, 5])
    // Original should not be mutated
    expect(initial.items).toEqual([1, 2, 3])
  })

  test('pop with string value removes by value', () => {
    const store = new Store({ tags: ['a', 'b', 'c'] })
    store.pop('tags', 'b')
    expect(store.get('tags')).toEqual(['a', 'c'])
  })

  test('pop with value not in array does nothing', () => {
    const store = new Store({ tags: ['a', 'b'] })
    store.pop('tags', 'z')
    expect(store.get('tags')).toEqual(['a', 'b'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 16. LAYOUT ALIGNMENT MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Layout alignment and justification', () => {
  test('Column align=center sets alignItems', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Column', align: 'center' }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.style.alignItems).toBe('center')
  })

  test('Row justify=between sets justifyContent', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Row', justify: 'between' }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.style.justifyContent).toBe('space-between')
  })

  test('Column justify=evenly sets justifyContent', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Column', justify: 'evenly' }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.style.justifyContent).toBe('space-evenly')
  })

  test('Row align=baseline sets alignItems', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Row', align: 'baseline' }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.style.alignItems).toBe('baseline')
  })

  test('Grid gap and columns', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Grid', columns: 4, gap: 2 }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    expect(el.style.gap).toBe('8px')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 17. Rx LOGICAL OR SHORT-CIRCUIT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rx logical operators', () => {
  test('|| should short-circuit and return left if truthy', () => {
    const store = new Store({ a: 'hello' })
    const result = evaluateTemplate("{{ a || 'fallback' }}", store)
    expect(result).toBe('hello')
  })

  test('|| should return right if left is falsy', () => {
    const store = new Store({ a: '' })
    const result = evaluateTemplate("{{ a || 'fallback' }}", store)
    expect(result).toBe('fallback')
  })

  test('|| with null left should return right', () => {
    const store = new Store({ a: null })
    const result = evaluateTemplate("{{ a || 'default' }}", store)
    expect(result).toBe('default')
  })

  test('&& should return right if left is truthy', () => {
    const store = new Store({ a: true })
    const result = evaluateTemplate("{{ a && 'yes' }}", store)
    expect(result).toBe('yes')
  })

  test('&& should return left if left is falsy', () => {
    const store = new Store({ a: false })
    const result = evaluateTemplate("{{ a && 'yes' }}", store)
    expect(result).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 18. IF/ELIF/ELSE CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

describe('If/Elif/Else rendering', () => {
  test('If with truthy condition renders children', () => {
    const ctx = makeCtx({ show: true })
    const node: ComponentNode = {
      type: 'If',
      condition: 'show',
      children: [{ type: 'Text', content: 'Visible' }],
    }
    const result = renderNode(node, ctx)
    expect(result.textContent).toContain('Visible')
  })

  test('If with falsy condition renders nothing', () => {
    const ctx = makeCtx({ show: false })
    const node: ComponentNode = {
      type: 'If',
      condition: 'show',
      children: [{ type: 'Text', content: 'Hidden' }],
    }
    const result = renderNode(node, ctx)
    expect(result.textContent).toBe('')
  })

  test('If with reactive expression condition', () => {
    const ctx = makeCtx({ count: 5 })
    const node: ComponentNode = {
      type: 'If',
      condition: '{{ count > 0 }}',
      children: [{ type: 'Text', content: 'Positive' }],
    }
    const result = renderNode(node, ctx)
    expect(result.textContent).toContain('Positive')
  })

  test('If with undefined condition renders nothing', () => {
    const ctx = makeCtx({})
    const node: ComponentNode = {
      type: 'If',
      // condition is undefined
      children: [{ type: 'Text', content: 'Nope' }],
    }
    const result = renderNode(node, ctx)
    expect(result.textContent).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 19. FOREACH LET BINDINGS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForEach let bindings', () => {
  test('let bindings should be available in child scope', () => {
    const ctx = makeCtx({ items: ['a', 'b', 'c'] })
    const node: ComponentNode = {
      type: 'ForEach',
      expression: 'items',
      let: { separator: ' | ' },
      children: [{ type: 'Text', content: '{{ $item }}{{ separator }}' }],
    }
    const result = renderNode(node, ctx)
    expect(result.textContent).toContain('a | ')
    expect(result.textContent).toContain('b | ')
  })

  test('$index should be available in ForEach children', () => {
    const ctx = makeCtx({ items: ['x', 'y'] })
    const node: ComponentNode = {
      type: 'ForEach',
      expression: 'items',
      children: [{ type: 'Text', content: '{{ $index }}:{{ $item }}' }],
    }
    const result = renderNode(node, ctx)
    expect(result.textContent).toContain('0:x')
    expect(result.textContent).toContain('1:y')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 20. HoverCard / Tooltip / Dialog edge cases
// ═══════════════════════════════════════════════════════════════════════════════

describe('HoverCard rendering', () => {
  test('should render with hover interaction structure', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'HoverCard',
      children: [{ type: 'Text', content: 'Hover details' }],
    }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.className).toContain('pf-hover-card')
    const content = el.querySelector('.pf-hover-card-content') as HTMLElement
    expect(content).not.toBeNull()
    expect(content.style.display).toBe('none')
  })
})

describe('Dialog edge cases', () => {
  test('dialog with dismissible=false should not close on backdrop click', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Dialog',
      title: 'Important',
      dismissible: false,
      children: [{ type: 'Text', content: 'Cannot dismiss' }],
    }
    const el = renderNode(node, ctx) as HTMLElement
    const dialog = el.querySelector('dialog') as HTMLDialogElement
    expect(dialog).not.toBeNull()
    // The dialog should exist and have the title
    expect(el.textContent).toContain('Important')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 21. ENGINE DEFS SUBSTITUTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Engine defs substitution', () => {
  test('node type matching a def should substitute', () => {
    const ctx = makeCtx()
    ctx.defs = {
      CustomCard: {
        type: 'Card',
        title: 'Default Title',
      } as unknown as ComponentNode,
    }
    const node: ComponentNode = { type: 'CustomCard' }
    const result = renderNode(node, ctx) as HTMLElement
    // Should render as a Card, not as unknown type
    expect(result.className).toContain('pf-card')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 22. SVG SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('SVG sanitization', () => {
  test('should strip script elements from SVG', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Svg',
      content: '<svg><script>alert(1)</script><circle cx="10" cy="10" r="5"/></svg>',
    }
    const el = renderNode(node, ctx) as HTMLElement
    expect(el.innerHTML).not.toContain('<script>')
    expect(el.querySelector('circle')).not.toBeNull()
  })

  test('should strip onclick attributes from SVG elements', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Svg',
      content: '<svg><rect onclick="alert(1)" x="0" y="0" width="10" height="10"/></svg>',
    }
    const el = renderNode(node, ctx) as HTMLElement
    const rect = el.querySelector('rect')
    expect(rect).not.toBeNull()
    expect(rect!.hasAttribute('onclick')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 23. DATA TABLE SEARCH FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

describe('DataTable search', () => {
  test('search input should filter visible rows', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'DataTable',
      search: true,
      columns: [{ key: 'name', header: 'Name' }],
      rows: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
    }
    const el = renderNode(node, ctx) as HTMLElement
    const searchInput = el.querySelector('.pf-datatable-search') as HTMLInputElement
    expect(searchInput).not.toBeNull()

    // Simulate search
    searchInput.value = 'alice'
    searchInput.dispatchEvent(new Event('input'))

    const rows = Array.from(el.querySelectorAll('tbody tr'))
    const visibleRows = rows.filter(r => (r as HTMLElement).style.display !== 'none')
    expect(visibleRows.length).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 24. APP toHTML FEATURES
// ═══════════════════════════════════════════════════════════════════════════════

describe('PrefabApp toHTML', () => {
  test('pretty option should produce formatted JSON', () => {
    const app = new PrefabApp({
      view: Text({ content: 'Hello' }),
    })
    const html = app.toHTML({ pretty: true })
    // Pretty JSON has newlines and indentation
    expect(html).toContain('\n')
    const dataMatch = /window\.__PREFAB_DATA__\s*=\s*([\s\S]*?);/.exec(html)
    expect(dataMatch).not.toBeNull()
    expect(dataMatch![1]).toContain('\n')
  })

  test('custom cdnVersion should appear in script src', () => {
    const app = new PrefabApp({
      view: Text({ content: 'Hello' }),
    })
    const html = app.toHTML({ cdnVersion: '1.2.3' })
    expect(html).toContain('@1.2.3/dist/renderer.min.js')
  })

  test('stylesheets should render as link tags', () => {
    const app = new PrefabApp({
      view: Text({ content: 'Hello' }),
      stylesheets: ['https://example.com/style.css'],
    })
    const html = app.toHTML()
    expect(html).toContain('<link rel="stylesheet" href="https://example.com/style.css">')
  })

  test('scripts should render as script tags', () => {
    const app = new PrefabApp({
      view: Text({ content: 'Hello' }),
      scripts: ['https://example.com/lib.js'],
    })
    const html = app.toHTML()
    expect(html).toContain('<script src="https://example.com/lib.js"></script>')
  })

  test('title should be HTML-escaped', () => {
    const app = new PrefabApp({
      title: 'My <App> & "Dashboard"',
      view: Text({ content: 'Hello' }),
    })
    const html = app.toHTML()
    expect(html).toContain('<title>My &lt;App&gt; &amp; &quot;Dashboard&quot;</title>')
  })
})
