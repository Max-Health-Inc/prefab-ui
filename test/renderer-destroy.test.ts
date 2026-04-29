/**
 * Tests for component destroy hook lifecycle.
 *
 * Validates that:
 * - RenderFn can return { element, destroy } instead of just an element
 * - destroy callbacks fire on re-render
 * - destroy callbacks fire on MountedApp.destroy()
 * - Errors in destroy callbacks don't break other cleanups
 * - DestroyRegistry tracks and flushes correctly
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { PrefabRenderer, registerComponent, DestroyRegistry } from '../src/renderer/index'
import type { ComponentNode, RenderFn } from '../src/renderer/engine'
import type { PrefabWireData } from '../src/renderer/index'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeWire(view: ComponentNode): PrefabWireData {
  return {
    $prefab: { version: '0.2' },
    view,
    state: { counter: 0 },
  }
}

// ── DestroyRegistry unit tests ───────────────────────────────────────────────

describe('DestroyRegistry', () => {
  let registry: DestroyRegistry

  beforeEach(() => {
    registry = new DestroyRegistry()
  })

  it('starts empty', () => {
    expect(registry.size).toBe(0)
  })

  it('tracks callbacks', () => {
    registry.track(() => {})
    registry.track(() => {})
    expect(registry.size).toBe(2)
  })

  it('flush calls all callbacks and clears', () => {
    const calls: number[] = []
    registry.track(() => calls.push(1))
    registry.track(() => calls.push(2))
    registry.track(() => calls.push(3))

    registry.flush()
    expect(calls).toEqual([1, 2, 3])
    expect(registry.size).toBe(0)
  })

  it('flush is idempotent when empty', () => {
    registry.flush()
    expect(registry.size).toBe(0)
  })

  it('survives errors in callbacks without stopping others', () => {
    const calls: number[] = []
    registry.track(() => calls.push(1))
    registry.track(() => { throw new Error('boom') })
    registry.track(() => calls.push(3))

    // Should not throw
    registry.flush()
    expect(calls).toEqual([1, 3])
    expect(registry.size).toBe(0)
  })
})

// ── Integration: destroy on re-render ────────────────────────────────────────

describe('Component destroy hook', () => {
  let destroyCalls: string[]

  beforeEach(() => {
    destroyCalls = []
  })

  it('fires destroy callback on re-render', () => {
    const render: RenderFn = (_node: ComponentNode) => {
      const el = document.createElement('div')
      el.textContent = 'stateful'
      return {
        element: el,
        destroy: () => destroyCalls.push('destroyed'),
      }
    }
    registerComponent('StatefulWidget', render)

    const wire = makeWire({ type: 'StatefulWidget' })
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire, { themeToggle: false })

    expect(destroyCalls).toEqual([])

    // Re-render should flush previous destroy callbacks
    mounted.rerender()
    expect(destroyCalls).toEqual(['destroyed'])

    // Second re-render fires the new callback from the re-render
    mounted.rerender()
    expect(destroyCalls).toEqual(['destroyed', 'destroyed'])

    mounted.destroy()
  })

  it('fires destroy callback on MountedApp.destroy()', () => {
    const render: RenderFn = () => ({
      element: document.createElement('span'),
      destroy: () => destroyCalls.push('cleanup'),
    })
    registerComponent('CleanupWidget', render)

    const wire = makeWire({ type: 'CleanupWidget' })
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire, { themeToggle: false })

    expect(destroyCalls).toEqual([])
    mounted.destroy()
    expect(destroyCalls).toEqual(['cleanup'])
  })

  it('handles multiple components with destroy hooks', () => {
    const renderA: RenderFn = () => ({
      element: document.createElement('div'),
      destroy: () => destroyCalls.push('A'),
    })
    const renderB: RenderFn = () => ({
      element: document.createElement('div'),
      destroy: () => destroyCalls.push('B'),
    })
    registerComponent('WidgetA', renderA)
    registerComponent('WidgetB', renderB)

    const wire = makeWire({
      type: 'Column',
      children: [
        { type: 'WidgetA' },
        { type: 'WidgetB' },
      ],
    })
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire, { themeToggle: false })

    mounted.destroy()
    expect(destroyCalls).toContain('A')
    expect(destroyCalls).toContain('B')
    expect(destroyCalls.length).toBe(2)
  })

  it('components without destroy still work (backward compat)', () => {
    const render: RenderFn = (_node: ComponentNode) => {
      const el = document.createElement('div')
      el.textContent = 'plain'
      return el
    }
    registerComponent('PlainWidget', render)

    const wire = makeWire({ type: 'PlainWidget' })
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire, { themeToggle: false })

    expect(root.textContent).toContain('plain')
    // Should not throw
    mounted.rerender()
    mounted.destroy()
  })

  it('error in one destroy does not prevent others', () => {
    const renderBad: RenderFn = () => ({
      element: document.createElement('div'),
      destroy: () => { throw new Error('intentional') },
    })
    const renderGood: RenderFn = () => ({
      element: document.createElement('div'),
      destroy: () => destroyCalls.push('good'),
    })
    registerComponent('BadWidget', renderBad)
    registerComponent('GoodWidget', renderGood)

    const wire = makeWire({
      type: 'Column',
      children: [
        { type: 'BadWidget' },
        { type: 'GoodWidget' },
      ],
    })
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire, { themeToggle: false })

    // Should not throw, good widget's destroy should still run
    mounted.destroy()
    expect(destroyCalls).toEqual(['good'])
  })

  it('destroy is not called on initial mount', () => {
    const render: RenderFn = () => ({
      element: document.createElement('div'),
      destroy: () => destroyCalls.push('init'),
    })
    registerComponent('InitWidget', render)

    const wire = makeWire({ type: 'InitWidget' })
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire, { themeToggle: false })

    // No destroy on initial mount — only on subsequent re-renders or teardown
    expect(destroyCalls).toEqual([])
    mounted.destroy()
  })

  it('state update triggers destroy before re-render', () => {
    const render: RenderFn = () => ({
      element: document.createElement('div'),
      destroy: () => destroyCalls.push('before-update'),
    })
    registerComponent('UpdateWidget', render)

    const wire: PrefabWireData = {
      $prefab: { version: '0.2' },
      view: { type: 'UpdateWidget' },
      state: { value: 'old' },
    }
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire, { themeToggle: false })

    expect(destroyCalls).toEqual([])

    mounted.update({
      $prefab: { version: '0.2' },
      update: { state: { value: 'new' } },
    })

    expect(destroyCalls).toEqual(['before-update'])
    mounted.destroy()
  })
})
