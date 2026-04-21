/**
 * Renderer tests — state store, Rx evaluator, actions, engine, mount.
 *
 * These tests require a DOM environment. They use happy-dom via Bun's test config.
 * @happy-dom
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Store } from '../src/renderer/state'
import { evaluateTemplate, evaluateExpression, isRxExpression } from '../src/renderer/rx'
import { dispatchActions } from '../src/renderer/actions'
import type { DispatchContext, ToastEvent } from '../src/renderer/actions'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { registerAllComponents } from '../src/renderer/components/index'
import { PrefabRenderer } from '../src/renderer/index'
import type { PrefabWireData } from '../src/renderer/index'
import { createNoopTransport } from '../src/renderer/transport'

// ── Store ────────────────────────────────────────────────────────────────────

describe('Store', () => {
  let store: Store

  beforeEach(() => {
    store = new Store({ count: 0, user: { name: 'Alice', role: 'admin' }, items: [1, 2, 3] })
  })

  it('get returns value at path', () => {
    expect(store.get('count')).toBe(0)
    expect(store.get('user.name')).toBe('Alice')
  })

  it('set updates value and notifies', () => {
    let called = false
    store.subscribe('count', () => { called = true })
    store.set('count', 5)
    expect(store.get('count')).toBe(5)
    expect(called).toBe(true)
  })

  it('toggle flips boolean', () => {
    store.set('active', false)
    store.toggle('active')
    expect(store.get('active')).toBe(true)
  })

  it('append adds to array', () => {
    store.append('items', 4)
    expect(store.get('items')).toEqual([1, 2, 3, 4])
  })

  it('pop removes from array by index', () => {
    store.pop('items', 0)
    expect(store.get('items')).toEqual([2, 3])
  })

  it('merge merges object into state', () => {
    store.merge({ count: 10, newKey: 'hello' })
    expect(store.get('count')).toBe(10)
    expect(store.get('newKey')).toBe('hello')
  })

  it('getAll returns full state', () => {
    const all = store.getAll()
    expect(all.count).toBe(0)
    expect((all.user as Record<string, string>).name).toBe('Alice')
  })

  it('global subscriber gets notified on any change', () => {
    let called = 0
    store.subscribeAll(() => { called++ })
    store.set('count', 1)
    store.set('user.name', 'Bob')
    expect(called).toBe(2)
  })
})

// ── Rx Expressions ───────────────────────────────────────────────────────────

describe('Rx Expressions', () => {
  let store: Store

  beforeEach(() => {
    store = new Store({ count: 5, name: 'Alice', active: true, price: 99.5, items: ['a', 'b'] })
  })

  it('isRxExpression detects templates', () => {
    expect(isRxExpression('{{ count }}')).toBe(true)
    expect(isRxExpression('hello')).toBe(false)
    expect(isRxExpression(42)).toBe(false)
  })

  it('evaluates state reference', () => {
    expect(evaluateTemplate('{{ count }}', store)).toBe(5)
    expect(evaluateTemplate('{{ name }}', store)).toBe('Alice')
  })

  it('evaluates arithmetic', () => {
    expect(evaluateTemplate('{{ count + 1 }}', store)).toBe(6)
    expect(evaluateTemplate('{{ count * 2 }}', store)).toBe(10)
  })

  it('evaluates comparison', () => {
    expect(evaluateTemplate('{{ count > 3 }}', store)).toBe(true)
    expect(evaluateTemplate('{{ count < 3 }}', store)).toBe(false)
  })

  it('evaluates ternary', () => {
    expect(evaluateTemplate("{{ active ? 'Yes' : 'No' }}", store)).toBe('Yes')
  })

  it('evaluates negation', () => {
    expect(evaluateTemplate('{{ !active }}', store)).toBe(false)
  })

  it('interpolates mixed text', () => {
    expect(evaluateTemplate('Count is {{ count }}', store)).toBe('Count is 5')
  })

  it('evaluates scope variables', () => {
    const scope = { $item: 'hello', $index: 2 }
    expect(evaluateTemplate('{{ $item }}', store, scope)).toBe('hello')
    expect(evaluateTemplate('{{ $index }}', store, scope)).toBe(2)
  })

  it('string literals', () => {
    expect(evaluateExpression("'hello'", store)).toBe('hello')
    expect(evaluateExpression('"world"', store)).toBe('world')
  })

  it('numeric literals', () => {
    expect(evaluateExpression('42', store)).toBe(42)
    expect(evaluateExpression('3.14', store)).toBe(3.14)
  })

  it('boolean literals', () => {
    expect(evaluateExpression('true', store)).toBe(true)
    expect(evaluateExpression('false', store)).toBe(false)
  })

  it('pipe filter — upper', () => {
    expect(evaluateTemplate('{{ name | upper }}', store)).toBe('ALICE')
  })

  it('pipe filter — lower', () => {
    expect(evaluateTemplate('{{ name | lower }}', store)).toBe('alice')
  })

  it('pipe filter — length', () => {
    expect(evaluateTemplate('{{ items | length }}', store)).toBe(2)
  })
})

// ── Actions ──────────────────────────────────────────────────────────────────

describe('Actions', () => {
  let store: Store
  let toasts: ToastEvent[]
  let ctx: DispatchContext

  beforeEach(() => {
    store = new Store({ count: 0, items: [] })
    toasts = []
    ctx = {
      store,
      transport: createNoopTransport(),
      rerender: () => {},
      onToast: (t) => toasts.push(t),
    }
  })

  it('setState sets a value', async () => {
    await dispatchActions({ action: 'setState', key: 'count', value: 10 }, ctx)
    expect(store.get('count')).toBe(10)
  })

  it('toggleState toggles a boolean', async () => {
    store.set('active', false)
    await dispatchActions({ action: 'toggleState', key: 'active' }, ctx)
    expect(store.get('active')).toBe(true)
  })

  it('appendState appends to array', async () => {
    await dispatchActions({ action: 'appendState', key: 'items', value: 'hello' }, ctx)
    expect(store.get('items')).toEqual(['hello'])
  })

  it('popState removes from array', async () => {
    store.set('items', ['a', 'b', 'c'])
    await dispatchActions({ action: 'popState', key: 'items', index: 1 }, ctx)
    expect(store.get('items')).toEqual(['a', 'c'])
  })

  it('showToast emits toast event', async () => {
    await dispatchActions({ action: 'showToast', message: 'Hello', variant: 'success' }, ctx)
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Hello')
    expect(toasts[0].variant).toBe('success')
  })

  it('dispatches array of actions', async () => {
    await dispatchActions([
      { action: 'setState', key: 'count', value: 5 },
      { action: 'showToast', message: 'Done' },
    ], ctx)
    expect(store.get('count')).toBe(5)
    expect(toasts).toHaveLength(1)
  })

  it('openLink is dispatched without error', async () => {
    // openLink uses window.open — just ensure no throw
    await dispatchActions({ action: 'openLink', url: 'https://example.com' }, ctx)
  })
})

// ── Render Engine ────────────────────────────────────────────────────────────

describe('Render Engine', () => {
  beforeEach(() => {
    registerAllComponents()
  })

  function makeCtx(state?: Record<string, unknown>): RenderContext {
    return {
      store: new Store(state),
      scope: {},
      transport: createNoopTransport(),
      rerender: () => {},
    }
  }

  it('renders a Text component', () => {
    const node: ComponentNode = { type: 'Text', content: 'Hello' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.textContent).toContain('Hello')
  })

  it('renders a Heading component', () => {
    const node: ComponentNode = { type: 'Heading', content: 'Title', level: 2 }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.tagName).toBe('H2')
    expect(dom.textContent).toBe('Title')
  })

  it('renders a Button component', () => {
    const node: ComponentNode = { type: 'Button', label: 'Click Me' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.tagName).toBe('BUTTON')
    expect(dom.textContent).toBe('Click Me')
  })

  it('renders Column with children', () => {
    const node: ComponentNode = {
      type: 'Column',
      children: [
        { type: 'Text', content: 'A' },
        { type: 'Text', content: 'B' },
      ],
    }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.children.length).toBe(2)
  })

  it('renders with cssClass', () => {
    const node: ComponentNode = { type: 'Text', content: 'styled', cssClass: 'my-class' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.className).toContain('my-class')
  })

  it('renders with id', () => {
    const node: ComponentNode = { type: 'Text', content: 'identified', id: 'my-id' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.id).toBe('my-id')
  })

  it('resolves Rx expression in content', () => {
    const node: ComponentNode = { type: 'Text', content: '{{ name }}' }
    const ctx = makeCtx({ name: 'Alice' })
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.textContent).toContain('Alice')
  })

  it('renders Card with sub-components', () => {
    const node: ComponentNode = {
      type: 'Card',
      children: [
        { type: 'CardHeader', children: [{ type: 'CardTitle', content: 'My Card' }] },
        { type: 'CardContent', children: [{ type: 'Text', content: 'Body' }] },
      ],
    }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.textContent).toContain('My Card')
    expect(dom.textContent).toContain('Body')
  })

  it('renders Badge with variant', () => {
    const node: ComponentNode = { type: 'Badge', content: 'New', variant: 'success' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.textContent).toBe('New')
    expect(dom.getAttribute('data-variant')).toBe('success')
  })

  it('renders Input with state binding', () => {
    const ctx = makeCtx({ email: 'test@example.com' })
    const node: ComponentNode = { type: 'Input', name: 'email' }
    const dom = renderNode(node, ctx) as HTMLElement
    // Input is wrapped in a div; find the actual input element
    const input = dom.querySelector('input') ?? dom
    expect(input.tagName).toBe('INPUT')
    expect((input as HTMLInputElement).value).toBe('test@example.com')
  })

  it('renders ForEach iterating items', () => {
    const ctx = makeCtx({ items: ['A', 'B', 'C'] })
    const node: ComponentNode = {
      type: 'ForEach',
      expression: '{{ items }}',
      children: [{ type: 'Text', content: '{{ $item }}' }],
    }
    const dom = renderNode(node, ctx) as DocumentFragment
    expect(dom.childNodes.length).toBe(3)
  })

  it('renders If conditionally (true)', () => {
    const ctx = makeCtx({ show: true })
    const node: ComponentNode = {
      type: 'If',
      condition: '{{ show }}',
      children: [{ type: 'Text', content: 'Visible' }],
    }
    const dom = renderNode(node, ctx)
    expect(dom.textContent).toContain('Visible')
  })

  it('renders If conditionally (false)', () => {
    const ctx = makeCtx({ show: false })
    const node: ComponentNode = {
      type: 'If',
      condition: '{{ show }}',
      children: [{ type: 'Text', content: 'Hidden' }],
    }
    const dom = renderNode(node, ctx)
    expect(dom.textContent ?? '').not.toContain('Hidden')
  })

  it('renders DataTable', () => {
    const ctx = makeCtx({
      rows: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    })
    const node: ComponentNode = {
      type: 'DataTable',
      columns: [{ key: 'name', header: 'Name' }, { key: 'age', header: 'Age' }],
      rows: '{{ rows }}',
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.querySelector('table')).toBeTruthy()
    expect(dom.textContent).toContain('Alice')
    expect(dom.textContent).toContain('Bob')
  })

  it('renders Alert with variant', () => {
    const node: ComponentNode = {
      type: 'Alert',
      variant: 'destructive',
      children: [
        { type: 'AlertTitle', content: 'Error' },
        { type: 'AlertDescription', content: 'Something went wrong' },
      ],
    }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.getAttribute('role')).toBe('alert')
    expect(dom.textContent).toContain('Error')
    expect(dom.textContent).toContain('Something went wrong')
  })

  it('renders Image', () => {
    const node: ComponentNode = { type: 'Image', src: '/photo.jpg', alt: 'Photo' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.tagName).toBe('IMG')
    expect(dom.getAttribute('src')).toBe('/photo.jpg')
    expect(dom.getAttribute('alt')).toBe('Photo')
  })

  it('renders Separator', () => {
    const node: ComponentNode = { type: 'Separator' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.tagName).toBe('HR')
  })

  it('renders Progress with value', () => {
    const node: ComponentNode = { type: 'Progress', value: 75 }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    // Progress is a visual bar with no text — check it has a fill child
    const fill = dom.querySelector('.pf-progress-fill')! as HTMLElement
    expect(fill).toBeTruthy()
    expect(fill.style.width).toBe('75%')
  })

  it('renders unknown type as div', () => {
    const node: ComponentNode = { type: 'NonExistent' }
    const dom = renderNode(node, makeCtx()) as HTMLElement
    expect(dom.tagName).toBe('DIV')
  })
})

// ── PrefabRenderer.mount ─────────────────────────────────────────────────────

describe('PrefabRenderer', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
  })

  it('mounts a simple view', () => {
    const data: PrefabWireData = {
      $prefab: { version: '0.3' },
      view: { type: 'Text', content: 'Hello World' },
    }
    const app = PrefabRenderer.mount(root, data)
    expect(root.textContent).toContain('Hello World')
    app.destroy()
  })

  it('mounts with initial state', () => {
    const data: PrefabWireData = {
      $prefab: { version: '0.3' },
      view: { type: 'Text', content: '{{ greeting }}' },
      state: { greeting: 'Hi there' },
    }
    const app = PrefabRenderer.mount(root, data)
    expect(root.textContent).toContain('Hi there')
    app.destroy()
  })

  it('update merges state and re-renders', () => {
    const data: PrefabWireData = {
      $prefab: { version: '0.3' },
      view: { type: 'Text', content: '{{ count }}' },
      state: { count: 0 },
    }
    const app = PrefabRenderer.mount(root, data)
    expect(root.textContent).toContain('0')

    app.update({
      $prefab: { version: '0.3' },
      update: { state: { count: 42 } },
    })
    expect(root.textContent).toContain('42')
    app.destroy()
  })

  it('isPrefabData detects wire format', () => {
    expect(PrefabRenderer.isPrefabData({ $prefab: { version: '0.3' }, view: {} })).toBe(true)
    expect(PrefabRenderer.isPrefabData({ foo: 'bar' })).toBe(false)
    expect(PrefabRenderer.isPrefabData(null)).toBe(false)
  })

  it('isPrefabUpdate detects updates', () => {
    expect(PrefabRenderer.isPrefabUpdate({ $prefab: { version: '0.3' }, update: { state: {} } })).toBe(true)
    expect(PrefabRenderer.isPrefabUpdate({ $prefab: { version: '0.3' }, view: {} })).toBe(false)
  })

  it('mounts with theme', () => {
    const data: PrefabWireData = {
      $prefab: { version: '0.3' },
      view: { type: 'Text', content: 'Themed' },
      theme: { light: { primary: '#ff0000' } },
    }
    const app = PrefabRenderer.mount(root, data)
    expect(root.style.getPropertyValue('--primary')).toBe('#ff0000')
    app.destroy()
  })

  it('mounts complex nested layout', () => {
    const data: PrefabWireData = {
      $prefab: { version: '0.3' },
      view: {
        type: 'Column',
        children: [
          { type: 'Heading', content: 'Dashboard', level: 1 },
          {
            type: 'Row',
            children: [
              { type: 'Card', children: [{ type: 'CardContent', children: [{ type: 'Metric', label: 'Users', value: '{{ users }}' }] }] },
              { type: 'Card', children: [{ type: 'CardContent', children: [{ type: 'Metric', label: 'Revenue', value: '{{ revenue }}' }] }] },
            ],
          },
          { type: 'Separator' },
          {
            type: 'DataTable',
            columns: [{ key: 'name', header: 'Name' }, { key: 'email', header: 'Email' }],
            rows: '{{ users_list }}',
          },
        ],
      },
      state: {
        users: 150,
        revenue: '$10K',
        users_list: [
          { name: 'Alice', email: 'alice@test.com' },
          { name: 'Bob', email: 'bob@test.com' },
        ],
      },
    }
    const app = PrefabRenderer.mount(root, data)
    expect(root.textContent).toContain('Dashboard')
    expect(root.textContent).toContain('150')
    expect(root.textContent).toContain('Alice')
    app.destroy()
  })

  it('destroy cleans up root', () => {
    const data: PrefabWireData = {
      $prefab: { version: '0.3' },
      view: { type: 'Text', content: 'Bye' },
    }
    const app = PrefabRenderer.mount(root, data)
    expect(root.innerHTML).not.toBe('')
    app.destroy()
    expect(root.innerHTML).toBe('')
  })
})
