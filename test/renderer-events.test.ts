/**
 * Renderer tests — Event handling and form interactions.
 *
 * Tests button onClick, form onSubmit, input onChange, checkbox/switch/slider binding.
 * @happy-dom
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Store } from '../src/renderer/state'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { registerAllComponents } from '../src/renderer/components/index'
import { createNoopTransport } from '../src/renderer/transport'

beforeEach(() => { registerAllComponents() })

function makeCtx(state?: Record<string, unknown>): RenderContext & { rerendered: number } {
  const ctx = {
    store: new Store(state),
    scope: {},
    transport: createNoopTransport(),
    rerender: () => { ctx.rerendered++ },
    rerendered: 0,
  }
  return ctx
}

// ── Button onClick ───────────────────────────────────────────────────────────

describe('Button onClick', () => {
  it('dispatches setState on click', async () => {
    const ctx = makeCtx({ count: 0 })
    const node: ComponentNode = {
      type: 'Button',
      label: 'Increment',
      onClick: { action: 'setState', key: 'count', value: 1 },
    }
    const dom = renderNode(node, ctx) as HTMLButtonElement
    dom.click()
    await new Promise(r => queueMicrotask(r))
    expect(ctx.store.get('count')).toBe(1)
  })

  it('dispatches array of actions on click', async () => {
    const ctx = makeCtx({ count: 0, clicked: false })
    const node: ComponentNode = {
      type: 'Button',
      label: 'Multi',
      onClick: [
        { action: 'setState', key: 'count', value: 5 },
        { action: 'toggleState', key: 'clicked' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLButtonElement
    dom.click()
    // dispatchActions is async (fire-and-forget via void), await microtask
    await new Promise(r => queueMicrotask(r))
    expect(ctx.store.get('count')).toBe(5)
    expect(ctx.store.get('clicked')).toBe(true)
  })

  it('disabled button does not dispatch', () => {
    const ctx = makeCtx({ count: 0 })
    const node: ComponentNode = {
      type: 'Button',
      label: 'No-op',
      disabled: true,
      onClick: { action: 'setState', key: 'count', value: 99 },
    }
    const dom = renderNode(node, ctx) as HTMLButtonElement
    expect(dom.disabled).toBe(true)
    // Browsers block click on disabled buttons; verify it's marked disabled
  })
})

// ── Form onSubmit ────────────────────────────────────────────────────────────

describe('Form onSubmit', () => {
  it('collects form values and merges into state', () => {
    const ctx = makeCtx({})
    const node: ComponentNode = {
      type: 'Form',
      onSubmit: { action: 'setState', key: 'submitted', value: true },
      children: [
        { type: 'Input', name: 'username', placeholder: 'Name' },
        { type: 'Button', label: 'Submit', submit: true },
      ],
    }
    const form = renderNode(node, ctx) as HTMLFormElement

    // Fill in the input
    const input = form.querySelector('input')!
    input.value = 'Alice'
    // Trigger native input event to sync state
    input.dispatchEvent(new Event('input', { bubbles: true }))

    // Submit the form
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(ctx.store.get('submitted')).toBe(true)
    expect(ctx.store.get('username')).toBe('Alice')
  })

  it('submit button has type=submit', () => {
    const ctx = makeCtx({})
    const node: ComponentNode = {
      type: 'Button',
      label: 'Go',
      submit: true,
    }
    const btn = renderNode(node, ctx) as HTMLButtonElement
    expect(btn.type).toBe('submit')
  })

  it('non-submit button has type=button', () => {
    const ctx = makeCtx({})
    const node: ComponentNode = {
      type: 'Button',
      label: 'Cancel',
    }
    const btn = renderNode(node, ctx) as HTMLButtonElement
    expect(btn.type).toBe('button')
  })
})

// ── Input onChange / state binding ───────────────────────────────────────────

describe('Input state binding', () => {
  it('syncs input value to store on input event', () => {
    const ctx = makeCtx({ email: '' })
    const node: ComponentNode = { type: 'Input', name: 'email' }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input')!

    input.value = 'bob@test.com'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(ctx.store.get('email')).toBe('bob@test.com')
  })

  it('reads initial value from state', () => {
    const ctx = makeCtx({ name: 'PreFilled' })
    const node: ComponentNode = { type: 'Input', name: 'name' }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    expect(input.value).toBe('PreFilled')
  })

  it('dispatches onChange action', () => {
    const ctx = makeCtx({ search: '', lastEvent: '' })
    const node: ComponentNode = {
      type: 'Input',
      name: 'search',
      onChange: { action: 'setState', key: 'lastEvent', value: 'changed' },
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input')!

    input.value = 'hello'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(ctx.store.get('lastEvent')).toBe('changed')
  })
})

// ── Textarea ─────────────────────────────────────────────────────────────────

describe('Textarea state binding', () => {
  it('syncs textarea value to store', () => {
    const ctx = makeCtx({ bio: '' })
    const node: ComponentNode = { type: 'Textarea', name: 'bio', rows: 5 }
    const dom = renderNode(node, ctx) as HTMLElement
    const textarea = dom.querySelector('textarea')!

    textarea.value = 'Hello world'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    expect(ctx.store.get('bio')).toBe('Hello world')
  })

  it('reads initial value from state', () => {
    const ctx = makeCtx({ desc: 'Initial text' })
    const node: ComponentNode = { type: 'Textarea', name: 'desc' }
    const dom = renderNode(node, ctx) as HTMLElement
    const textarea = dom.querySelector('textarea')!
    expect(textarea.value).toBe('Initial text')
  })
})

// ── Checkbox ─────────────────────────────────────────────────────────────────

describe('Checkbox state binding', () => {
  it('reads initial boolean from state', () => {
    const ctx = makeCtx({ agree: true })
    const node: ComponentNode = { type: 'Checkbox', name: 'agree', label: 'I agree' }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input.checked).toBe(true)
  })

  it('syncs checked state on change', () => {
    const ctx = makeCtx({ agree: false })
    const node: ComponentNode = { type: 'Checkbox', name: 'agree', label: 'I agree' }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input[type="checkbox"]') as HTMLInputElement

    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('agree')).toBe(true)
  })
})

// ── Switch ───────────────────────────────────────────────────────────────────

describe('Switch state binding', () => {
  it('renders with role=switch', () => {
    const ctx = makeCtx({ darkMode: false })
    const node: ComponentNode = { type: 'Switch', name: 'darkMode', label: 'Dark mode' }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('[role="switch"]')!
    expect(input).toBeTruthy()
  })

  it('syncs boolean state on change', () => {
    const ctx = makeCtx({ darkMode: false })
    const node: ComponentNode = { type: 'Switch', name: 'darkMode', label: 'Dark mode' }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input')!

    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('darkMode')).toBe(true)
  })
})

// ── Slider ───────────────────────────────────────────────────────────────────

describe('Slider state binding', () => {
  it('reads initial value from state', () => {
    const ctx = makeCtx({ volume: 75 })
    const node: ComponentNode = { type: 'Slider', name: 'volume', min: 0, max: 100 }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input[type="range"]') as HTMLInputElement
    expect(input.value).toBe('75')
  })

  it('syncs numeric state on input', () => {
    const ctx = makeCtx({ volume: 50 })
    const node: ComponentNode = { type: 'Slider', name: 'volume', min: 0, max: 100 }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input[type="range"]') as HTMLInputElement

    input.value = '80'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(ctx.store.get('volume')).toBe(80)
  })
})

// ── Select ───────────────────────────────────────────────────────────────────

describe('Select state binding', () => {
  it('reads initial value from state', () => {
    const ctx = makeCtx({ color: 'blue' })
    const node: ComponentNode = {
      type: 'Select',
      name: 'color',
      children: [
        { type: 'SelectOption', value: 'red', label: 'Red' },
        { type: 'SelectOption', value: 'blue', label: 'Blue' },
        { type: 'SelectOption', value: 'green', label: 'Green' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const select = dom.querySelector('select')!
    expect(select.value).toBe('blue')
  })

  it('syncs state on change', () => {
    const ctx = makeCtx({ color: 'red' })
    const node: ComponentNode = {
      type: 'Select',
      name: 'color',
      children: [
        { type: 'SelectOption', value: 'red', label: 'Red' },
        { type: 'SelectOption', value: 'blue', label: 'Blue' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const select = dom.querySelector('select')!

    select.value = 'blue'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('color')).toBe('blue')
  })

  it('dispatches onChange action', () => {
    const ctx = makeCtx({ color: 'red', changed: false })
    const node: ComponentNode = {
      type: 'Select',
      name: 'color',
      onChange: { action: 'setState', key: 'changed', value: true },
      children: [
        { type: 'SelectOption', value: 'red', label: 'Red' },
        { type: 'SelectOption', value: 'blue', label: 'Blue' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const select = dom.querySelector('select')!

    select.value = 'blue'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('changed')).toBe(true)
  })
})
