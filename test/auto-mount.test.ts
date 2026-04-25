/**
 * Auto-mount entry point tests.
 *
 * Tests the self-executing boot() logic from src/renderer/auto.ts.
 * Since auto.ts is an IIFE entry point that calls boot() on import,
 * we test the same logic by importing the building blocks directly.
 *
 * @happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { PrefabRenderer } from '../src/renderer/index'
import type { PrefabWireData, PrefabUpdateData, MountedApp } from '../src/renderer/index'
import { app } from '../src/renderer/app'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeWireData(content = 'Hello auto'): PrefabWireData {
  return {
    $prefab: { version: '0.2' },
    view: { type: 'Text', content },
    state: {},
  }
}

function makeUpdateData(state: Record<string, unknown>): PrefabUpdateData {
  return {
    $prefab: { version: '0.2' },
    update: { state },
  }
}

/**
 * Simulate auto-mount boot logic (mirrors src/renderer/auto.ts).
 * Extracted so we can test without top-level side effects.
 */
async function bootAuto(root: HTMLElement): Promise<{
  mounted: MountedApp | undefined
  destroy: () => void
}> {
  const ui = await app({ mode: 'standalone' })
  let mounted: MountedApp | undefined

  ui.onToolResult((result) => {
    if (PrefabRenderer.isPrefabData(result)) {
      if (mounted) mounted.destroy()
      mounted = ui.mount(root, result as PrefabWireData)
    } else if (PrefabRenderer.isPrefabUpdate(result) && mounted) {
      mounted.update(result as PrefabUpdateData)
    }
  })

  ui.onToolInput((args) => {
    if (PrefabRenderer.isPrefabData(args)) {
      if (mounted) mounted.destroy()
      mounted = ui.mount(root, args as PrefabWireData)
    } else if (PrefabRenderer.isPrefabUpdate(args) && mounted) {
      mounted.update(args as PrefabUpdateData)
    }
  })

  return {
    get mounted() { return mounted },
    destroy: () => {
      mounted?.destroy()
      ui.destroy()
    },
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Auto-mount entry point', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
  })

  afterEach(() => {
    root.remove()
  })

  it('isPrefabData detects wire format', () => {
    expect(PrefabRenderer.isPrefabData(makeWireData())).toBe(true)
    expect(PrefabRenderer.isPrefabData({ random: 'data' })).toBe(false)
    expect(PrefabRenderer.isPrefabData(null)).toBe(false)
  })

  it('isPrefabUpdate detects update format', () => {
    expect(PrefabRenderer.isPrefabUpdate(makeUpdateData({ count: 1 }))).toBe(true)
    expect(PrefabRenderer.isPrefabUpdate(makeWireData())).toBe(false)
  })

  it('boots in standalone mode without errors', async () => {
    const handle = await bootAuto(root)
    expect(handle).toBeDefined()
    handle.destroy()
  })

  it('mounts wire data via app().mount()', async () => {
    const ui = await app({ mode: 'standalone' })
    const wire = makeWireData('Auto-mounted')
    const mounted = ui.mount(root, wire)

    expect(root.textContent).toContain('Auto-mounted')
    mounted.destroy()
    ui.destroy()
  })

  it('replaces previous mount on second wire data', async () => {
    const ui = await app({ mode: 'standalone' })
    const first = makeWireData('First')
    const second = makeWireData('Second')

    const m1 = ui.mount(root, first)
    expect(root.textContent).toContain('First')

    m1.destroy()
    const m2 = ui.mount(root, second)
    expect(root.textContent).toContain('Second')
    expect(root.textContent).not.toContain('First')

    m2.destroy()
    ui.destroy()
  })

  it('applies state update to mounted app', async () => {
    const wire: PrefabWireData = {
      $prefab: { version: '0.2' },
      view: { type: 'Text', content: '{{ count }}' },
      state: { count: 0 },
    }
    const ui = await app({ mode: 'standalone' })
    const mounted = ui.mount(root, wire)

    expect(root.textContent).toContain('0')

    mounted.update(makeUpdateData({ count: 42 }))
    expect(root.textContent).toContain('42')

    mounted.destroy()
    ui.destroy()
  })

  it('bootAuto wires up full lifecycle', async () => {
    const handle = await bootAuto(root)
    // In standalone mode there's no bridge event source,
    // so we verify the boot completes and cleanup works
    expect(handle.mounted).toBeUndefined()
    handle.destroy()
  })
})
