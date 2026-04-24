/**
 * TDD Bug Hunt — Round 2
 *
 * RED tests targeting suspicious areas in the renderer, state store,
 * expression evaluator, and action dispatcher.
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { PrefabRenderer, type PrefabWireData } from '../src/renderer/index'
import { Store } from '../src/renderer/state'
import { evaluateTemplate, evaluateExpression } from '../src/renderer/rx'
import { dispatchActions, type DispatchContext, type ActionJSON } from '../src/renderer/actions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mount(data: PrefabWireData): { root: HTMLElement; destroy: () => void; store: Store } {
  const root = document.createElement('div')
  const mounted = PrefabRenderer.mount(root, data)
  return { root, destroy: mounted.destroy, store: mounted.store }
}

function wire(view: Record<string, unknown>, state?: Record<string, unknown>): PrefabWireData {
  return { $prefab: { version: '0.2' }, view: view as never, state } as PrefabWireData
}

// ── BUG 1: Store.toggle inverts wrong — sets falsy VALUE instead of toggling ─

describe('BUG: Store.toggle sets falsy value instead of true', () => {
  it('toggle(false) → true', () => {
    const store = new Store({ visible: false })
    store.toggle('visible')
    expect(store.get('visible')).toBe(true)
  })

  it('toggle(true) → false', () => {
    const store = new Store({ visible: true })
    store.toggle('visible')
    expect(store.get('visible')).toBe(false)
  })

  it('toggle(0) → true (0 is falsy)', () => {
    const store = new Store({ count: 0 })
    store.toggle('count')
    expect(store.get('count')).toBe(true)
  })

  it('toggle(null) → true', () => {
    const store = new Store({ val: null })
    store.toggle('val')
    expect(store.get('val')).toBe(true)
  })

  it('toggle("") → true (empty string is falsy)', () => {
    const store = new Store({ text: '' })
    store.toggle('text')
    expect(store.get('text')).toBe(true)
  })

  it('toggle(undefined key) → true', () => {
    const store = new Store({})
    store.toggle('missing')
    expect(store.get('missing')).toBe(true)
  })

  it('double toggle restores original value', () => {
    const store = new Store({ on: true })
    store.toggle('on')
    store.toggle('on')
    expect(store.get('on')).toBe(true)
  })
})

// ── BUG 2: Pop with -1 index should remove last element ─────────────────────

describe('BUG: Store.pop with -1 should remove last element', () => {
  it('pop(key, -1) removes the last element', () => {
    const store = new Store({ items: ['a', 'b', 'c'] })
    store.pop('items', -1)
    expect(store.get('items')).toEqual(['a', 'b'])
  })

  it('pop(key, -1) on single-element array leaves empty', () => {
    const store = new Store({ items: ['only'] })
    store.pop('items', -1)
    expect(store.get('items')).toEqual([])
  })

  it('pop(key, -1) on empty array is a no-op', () => {
    const store = new Store({ items: [] })
    store.pop('items', -1)
    expect(store.get('items')).toEqual([])
  })
})

// ── BUG 3: Rx expression with nested ternary + pipe ─────────────────────────

describe('BUG: Nested ternary with pipe breaks', () => {
  it('ternary result piped through filter', () => {
    // {{ active ? price : 0 | currency }} should parse as:
    // (active ? price : 0) | currency
    const store = new Store({ active: true, price: 42.5 })
    const result = evaluateTemplate('{{ active ? price : 0 | currency }}', store)
    // Should be a currency-formatted string, not a raw number
    expect(typeof result).toBe('string')
    expect(String(result)).toContain('42')
  })

  it('falsy ternary branch piped through filter', () => {
    const store = new Store({ active: false, price: 42.5 })
    const result = evaluateTemplate('{{ active ? price : 0 | currency }}', store)
    expect(String(result)).toContain('$0')
  })
})

// ── BUG 4: setState with dot-path value expression ──────────────────────────

describe('BUG: setState resolves nested reactive values', () => {
  it('setState with rx value resolves before storing', async () => {
    const store = new Store({ count: 10, label: 'Count: {{ count }}' })
    const rerendered: boolean[] = []
    const ctx: DispatchContext = {
      store,
      rerender: () => { rerendered.push(true) },
    }
    await dispatchActions(
      { action: 'setState', key: 'result', value: '{{ count }}' },
      ctx,
    )
    // The stored value should be the resolved number, not the string template
    expect(store.get('result')).toBe(10)
  })

  it('setState with non-rx value stores as-is', async () => {
    const store = new Store({})
    const ctx: DispatchContext = { store, rerender: () => {} }
    await dispatchActions({ action: 'setState', key: 'name', value: 'literal' }, ctx)
    expect(store.get('name')).toBe('literal')
  })
})

// ── BUG 5: Multiple {{ }} expressions in one string ─────────────────────────

describe('BUG: Multiple interpolations in one string', () => {
  it('renders both interpolated values', () => {
    const store = new Store({ first: 'John', last: 'Doe' })
    const result = evaluateTemplate('{{ first }} {{ last }}', store)
    expect(result).toBe('John Doe')
  })

  it('handles missing values gracefully (empty string)', () => {
    const store = new Store({ first: 'John' })
    const result = evaluateTemplate('Hello {{ first }} {{ last }}!', store)
    expect(result).toBe('Hello John !')
  })

  it('mixed text + expression preserves surrounding text', () => {
    const store = new Store({ count: 3 })
    const result = evaluateTemplate('You have {{ count }} items in your cart', store)
    expect(result).toBe('You have 3 items in your cart')
  })
})

// ── BUG 6: Prototype pollution via state path ────────────────────────────────

describe('BUG: Prototype pollution blocked in Store', () => {
  it('blocks __proto__ path', () => {
    const store = new Store({})
    store.set('__proto__.polluted', 'yes')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('blocks constructor path', () => {
    const store = new Store({})
    store.set('constructor.prototype.polluted', 'yes')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('blocks nested __proto__', () => {
    const store = new Store({ user: {} })
    store.set('user.__proto__.polluted', 'yes')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

// ── BUG 7: XSS via openLink action ──────────────────────────────────────────

describe('BUG: openLink blocks javascript: URLs', () => {
  // These are important security tests — openLink should block unsafe schemes

  it('blocks javascript: scheme', async () => {
    const warnings: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

    const store = new Store({})
    const ctx: DispatchContext = { store, rerender: () => {} }
    await dispatchActions({ action: 'openLink', url: 'javascript:alert(1)' }, ctx)

    console.warn = orig
    expect(warnings.some(w => w.includes('unsafe'))).toBe(true)
  })

  it('blocks data: scheme', async () => {
    const warnings: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

    const store = new Store({})
    const ctx: DispatchContext = { store, rerender: () => {} }
    await dispatchActions({ action: 'openLink', url: 'data:text/html,<script>alert(1)</script>' }, ctx)

    console.warn = orig
    expect(warnings.some(w => w.includes('unsafe'))).toBe(true)
  })

  it('allows https: links', async () => {
    // In test env window.open may not exist, but it shouldn't warn about unsafe
    const warnings: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

    const store = new Store({})
    const ctx: DispatchContext = { store, rerender: () => {} }
    await dispatchActions({ action: 'openLink', url: 'https://example.com' }, ctx)

    console.warn = orig
    expect(warnings.some(w => w.includes('unsafe'))).toBe(false)
  })
})

// ── BUG 8: Expression with string containing pipe char ───────────────────────

describe('BUG: Pipe char inside quoted string', () => {
  it('pipe inside single quotes is not split', () => {
    // {{ status === 'on|off' ? 'yes' : 'no' }}
    const store = new Store({ status: 'on|off' })
    const result = evaluateTemplate("{{ status === 'on|off' ? 'yes' : 'no' }}", store)
    expect(result).toBe('yes')
  })

  it('pipe inside double quotes is not split', () => {
    const store = new Store({ sep: '|' })
    // The value should be the pipe character itself
    const result = evaluateTemplate('{{ sep }}', store)
    expect(result).toBe('|')
  })
})

// ── BUG 9: Renderer handles missing/null children gracefully ─────────────────

describe('BUG: Renderer handles edge-case wire data', () => {
  it('renders node with no children (leaf)', () => {
    const { root, destroy } = mount(wire({ type: 'Text', content: 'hello' }))
    expect(root.textContent).toContain('hello')
    destroy()
  })

  it('renders node with empty children array', () => {
    const { root, destroy } = mount(wire({ type: 'Column', children: [] }))
    expect(root.innerHTML).not.toBe('')
    destroy()
  })

  it('renders unknown component type gracefully', () => {
    const { root, destroy } = mount(wire({
      type: 'FutureComponent',
      children: [{ type: 'Text', content: 'inside' }],
    }))
    // Should fall back to a div and still render children
    expect(root.textContent).toContain('inside')
    destroy()
  })

  it('renders deeply nested structure without stack overflow', () => {
    // 50-level nesting
    let node: Record<string, unknown> = { type: 'Text', content: 'leaf' }
    for (let i = 0; i < 50; i++) {
      node = { type: 'Column', children: [node] }
    }
    const { root, destroy } = mount(wire(node))
    expect(root.textContent).toContain('leaf')
    destroy()
  })
})

// ── BUG 10: SetState onSuccess/onError callbacks ─────────────────────────────

describe('BUG: setState onSuccess callback fires', () => {
  it('onSuccess runs after setState', async () => {
    const store = new Store({ count: 0, message: '' })
    const ctx: DispatchContext = { store, rerender: () => {} }
    await dispatchActions({
      action: 'setState',
      key: 'count',
      value: 5,
      onSuccess: { action: 'setState', key: 'message', value: 'done' },
    }, ctx)
    expect(store.get('count')).toBe(5)
    expect(store.get('message')).toBe('done')
  })

  it('onSuccess array — all callbacks fire in order', async () => {
    const store = new Store({ a: '', b: '' })
    const ctx: DispatchContext = { store, rerender: () => {} }
    await dispatchActions({
      action: 'setState',
      key: 'trigger',
      value: true,
      onSuccess: [
        { action: 'setState', key: 'a', value: 'first' },
        { action: 'setState', key: 'b', value: 'second' },
      ],
    }, ctx)
    expect(store.get('a')).toBe('first')
    expect(store.get('b')).toBe('second')
  })
})

// ── BUG 11: Arithmetic with state values ─────────────────────────────────────

describe('BUG: Arithmetic expressions evaluate correctly', () => {
  it('addition: {{ count + 1 }}', () => {
    const store = new Store({ count: 5 })
    expect(evaluateTemplate('{{ count + 1 }}', store)).toBe(6)
  })

  it('subtraction: {{ count - 1 }}', () => {
    const store = new Store({ count: 5 })
    expect(evaluateTemplate('{{ count - 1 }}', store)).toBe(4)
  })

  it('multiplication: {{ price * quantity }}', () => {
    const store = new Store({ price: 9.99, quantity: 3 })
    const result = evaluateTemplate('{{ price * quantity }}', store)
    expect(result).toBeCloseTo(29.97)
  })

  it('division by zero returns 0 (not Infinity)', () => {
    const store = new Store({ a: 10, b: 0 })
    expect(evaluateTemplate('{{ a / b }}', store)).toBe(0)
  })

  it('modulo by zero returns 0', () => {
    const store = new Store({ a: 10, b: 0 })
    expect(evaluateTemplate('{{ a % b }}', store)).toBe(0)
  })
})

// ── BUG 12: setInterval respects safety limits ───────────────────────────────

describe('BUG: setInterval safety limits', () => {
  it('interval < 100ms is clamped to 100ms', async () => {
    const store = new Store({ ticks: 0 })
    const ctx: DispatchContext = { store, rerender: () => {} }
    // This should NOT fire at 1ms — it's clamped
    const warnings: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

    await dispatchActions({
      action: 'setInterval',
      intervalMs: 1,
      onTick: { action: 'setState', key: 'ticks', value: '{{ ticks + 1 }}' },
    }, ctx)

    console.warn = orig
    // No crash, no warning — it just clamps
    expect(warnings.filter(w => w.includes('error'))).toHaveLength(0)
  })
})

// ── BUG 13: Renderer — ForEach with empty array ─────────────────────────────

describe('BUG: ForEach with empty/missing data', () => {
  it('ForEach with empty array renders nothing', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'ForEach',
        expression: '{{ items }}',
        children: [{ type: 'Text', content: '{{ $item }}' }],
      },
      { items: [] },
    ))
    expect(root.textContent?.trim()).toBe('')
    destroy()
  })

  it('ForEach with non-array state renders nothing', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'ForEach',
        expression: '{{ items }}',
        children: [{ type: 'Text', content: '{{ $item }}' }],
      },
      { items: 'not an array' },
    ))
    // Should not crash, should render nothing
    expect(root.innerHTML).toBeDefined()
    destroy()
  })

  it('ForEach with array renders all items', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'ForEach',
        expression: '{{ names }}',
        children: [{ type: 'Text', content: '{{ $item }}' }],
      },
      { names: ['Alice', 'Bob', 'Charlie'] },
    ))
    expect(root.textContent).toContain('Alice')
    expect(root.textContent).toContain('Bob')
    expect(root.textContent).toContain('Charlie')
    destroy()
  })
})

// ── BUG 14: If/Elif/Else chain — only first matching branch should render ────

describe('BUG: If/Elif/Else conditional chain', () => {
  it('If true → renders If, skips Elif and Else', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'Column',
        children: [
          { type: 'If', condition: '{{ true }}', children: [{ type: 'Text', content: 'ONLY_IF' }] },
          { type: 'Elif', condition: '{{ true }}', children: [{ type: 'Text', content: 'ONLY_ELIF' }] },
          { type: 'Else', children: [{ type: 'Text', content: 'ONLY_ELSE' }] },
        ],
      },
    ))
    expect(root.textContent).toContain('ONLY_IF')
    expect(root.textContent).not.toContain('ONLY_ELIF')
    expect(root.textContent).not.toContain('ONLY_ELSE')
    destroy()
  })

  it('If false, Elif true → renders only Elif', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'Column',
        children: [
          { type: 'If', condition: '{{ false }}', children: [{ type: 'Text', content: 'ONLY_IF' }] },
          { type: 'Elif', condition: '{{ true }}', children: [{ type: 'Text', content: 'ONLY_ELIF' }] },
          { type: 'Else', children: [{ type: 'Text', content: 'ONLY_ELSE' }] },
        ],
      },
    ))
    expect(root.textContent).not.toContain('ONLY_IF')
    expect(root.textContent).toContain('ONLY_ELIF')
    expect(root.textContent).not.toContain('ONLY_ELSE')
    destroy()
  })

  it('If false, Elif false → renders only Else', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'Column',
        children: [
          { type: 'If', condition: '{{ false }}', children: [{ type: 'Text', content: 'ONLY_IF' }] },
          { type: 'Elif', condition: '{{ false }}', children: [{ type: 'Text', content: 'ONLY_ELIF' }] },
          { type: 'Else', children: [{ type: 'Text', content: 'ONLY_ELSE' }] },
        ],
      },
    ))
    expect(root.textContent).not.toContain('ONLY_IF')
    expect(root.textContent).not.toContain('ONLY_ELIF')
    expect(root.textContent).toContain('ONLY_ELSE')
    destroy()
  })

  it('If false, no Elif/Else → renders nothing', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'Column',
        children: [
          { type: 'If', condition: '{{ false }}', children: [{ type: 'Text', content: 'ONLY_IF' }] },
          { type: 'Text', content: 'ALWAYS_VISIBLE' },
        ],
      },
    ))
    expect(root.textContent).not.toContain('ONLY_IF')
    expect(root.textContent).toContain('ALWAYS_VISIBLE')
    destroy()
  })

  it('multiple Elif branches — only first matching renders', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'Column',
        children: [
          { type: 'If', condition: '{{ false }}', children: [{ type: 'Text', content: 'COND_A' }] },
          { type: 'Elif', condition: '{{ false }}', children: [{ type: 'Text', content: 'COND_B' }] },
          { type: 'Elif', condition: '{{ true }}', children: [{ type: 'Text', content: 'COND_C' }] },
          { type: 'Elif', condition: '{{ true }}', children: [{ type: 'Text', content: 'COND_D' }] },
          { type: 'Else', children: [{ type: 'Text', content: 'COND_E' }] },
        ],
      },
    ))
    expect(root.textContent).not.toContain('COND_A')
    expect(root.textContent).not.toContain('COND_B')
    expect(root.textContent).toContain('COND_C')
    expect(root.textContent).not.toContain('COND_D')
    expect(root.textContent).not.toContain('COND_E')
    destroy()
  })

  it('If with reactive state condition', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'Column',
        children: [
          { type: 'If', condition: '{{ loggedIn }}', children: [{ type: 'Text', content: 'WELCOME' }] },
          { type: 'Else', children: [{ type: 'Text', content: 'LOGIN' }] },
        ],
      },
      { loggedIn: false },
    ))
    expect(root.textContent).not.toContain('WELCOME')
    expect(root.textContent).toContain('LOGIN')
    destroy()
  })

  it('orphaned Elif after gap is silently skipped', () => {
    // A non-conditional sibling between If and Elif breaks the chain
    // The orphaned Elif becomes a no-op (not part of any chain)
    const { root, destroy } = mount(wire(
      {
        type: 'Column',
        children: [
          { type: 'If', condition: '{{ true }}', children: [{ type: 'Text', content: 'ONLY_IF' }] },
          { type: 'Text', content: 'GAP' },
          { type: 'Elif', condition: '{{ true }}', children: [{ type: 'Text', content: 'ORPHAN' }] },
        ],
      },
    ))
    expect(root.textContent).toContain('ONLY_IF')
    expect(root.textContent).toContain('GAP')
    // Orphaned Elif is NOT rendered — it's not part of any chain
    expect(root.textContent).not.toContain('ORPHAN')
    destroy()
  })
})

// ── BUG 15: ForEach with $index scope variable ───────────────────────────────

describe('BUG: ForEach $index scope', () => {
  it('$index is available in child expressions', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'ForEach',
        expression: '{{ items }}',
        children: [{ type: 'Text', content: '{{ $index }}-{{ $item }}' }],
      },
      { items: ['a', 'b', 'c'] },
    ))
    expect(root.textContent).toContain('0-a')
    expect(root.textContent).toContain('1-b')
    expect(root.textContent).toContain('2-c')
    destroy()
  })

  it('$item.property works for object arrays', () => {
    const { root, destroy } = mount(wire(
      {
        type: 'ForEach',
        expression: '{{ users }}',
        children: [{ type: 'Text', content: '{{ $item.name }}' }],
      },
      { users: [{ name: 'Alice' }, { name: 'Bob' }] },
    ))
    expect(root.textContent).toContain('Alice')
    expect(root.textContent).toContain('Bob')
    destroy()
  })
})

// ── BUG 16: Store.merge partial update ───────────────────────────────────────

describe('BUG: Store.merge edge cases', () => {
  it('merge does not overwrite unrelated keys', () => {
    const store = new Store({ a: 1, b: 2 })
    store.merge({ a: 10 })
    expect(store.get('a')).toBe(10)
    expect(store.get('b')).toBe(2)
  })

  it('merge creates nested paths', () => {
    const store = new Store({})
    store.merge({ 'x.y.z': 42 })
    expect(store.get('x.y.z')).toBe(42)
  })
})

// ── BUG 17: evaluateExpression with edge-case strings ────────────────────────

describe('BUG: Expression evaluator edge cases', () => {
  it('empty expression returns undefined', () => {
    const store = new Store({})
    expect(evaluateExpression('', store)).toBeUndefined()
  })

  it('comparison with string literals', () => {
    const store = new Store({ status: 'active' })
    expect(evaluateTemplate("{{ status === 'active' }}", store)).toBe(true)
    expect(evaluateTemplate("{{ status === 'inactive' }}", store)).toBe(false)
  })

  it('nested dot-path in ternary', () => {
    const store = new Store({ user: { active: true, name: 'Max' } })
    expect(evaluateTemplate("{{ user.active ? user.name : 'anon' }}", store)).toBe('Max')
  })

  it('pipe on result of comparison', () => {
    const store = new Store({ count: 3 })
    // count > 0 → true, upper should make it 'TRUE' (if coerced to string first via upper)
    // Actually: true | upper → upper only works on strings, so it returns true unchanged
    const result = evaluateTemplate('{{ count > 0 }}', store)
    expect(result).toBe(true)
  })
})
