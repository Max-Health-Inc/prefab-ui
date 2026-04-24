/**
 * TDD: Browser pipe registration gap
 *
 * RED tests first — these fail until the upstream fix lands.
 *
 * Bug: registerPipe() only works in Node. The browser renderer bundle
 * (1) doesn't expose registerPipe on window.prefab,
 * (2) has no wire format field to carry pipe source code,
 * (3) renderer.mount() doesn't hydrate pipes from wire data.
 *
 * Result: custom pipes like `humanName` resolve to [object Object] in browser.
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { PrefabApp } from '../src/app'
import { Column, Text } from '../src/index'
import { PrefabRenderer } from '../src/renderer/index'
import { unregisterPipe, listPipes, type PipeFn } from '../src/rx/pipes'
import type { PrefabWireFormat } from '../src/app'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simulated FHIR humanName pipe — joins given + family. */
const humanNameFn: PipeFn = (value: unknown) => {
  if (!value || !Array.isArray(value)) return String(value)
  const first = value[0] as Record<string, unknown> | undefined
  if (!first) return ''
  const given = Array.isArray(first.given) ? (first.given as string[]).join(' ') : ''
  const family = typeof first.family === 'string' ? first.family : ''
  return `${given} ${family}`.trim()
}

beforeEach(() => {
  // Clean slate — remove any custom pipes from prior tests
  for (const name of listPipes()) {
    unregisterPipe(name)
  }
})

// ── 1. window.prefab global exposes registerPipe ─────────────────────────────

describe('window.prefab global', () => {
  it('exposes registerPipe on the prefab global', () => {
    // Simulate what the IIFE bundle does: sets up window.prefab
    // In the real bundle, we check the renderer/index.ts auto-init block.
    // Here we import the renderer and check the module exports.
    // The renderer index.ts should re-export registerPipe.
    const mod = require('../src/renderer/index') as Record<string, unknown>
    expect(typeof mod.registerPipe).toBe('function')
  })

  it('exposes unregisterPipe on the prefab global', () => {
    const mod = require('../src/renderer/index') as Record<string, unknown>
    expect(typeof mod.unregisterPipe).toBe('function')
  })

  it('exposes listPipes on the prefab global', () => {
    const mod = require('../src/renderer/index') as Record<string, unknown>
    expect(typeof mod.listPipes).toBe('function')
  })
})

// ── 2. PrefabApp wire format carries pipe sources ────────────────────────────

describe('PrefabApp pipes in wire format', () => {
  it('serializes pipes as source strings in wire JSON', () => {
    const app = new PrefabApp({
      view: Column({ children: [Text('hello')] }),
      pipes: {
        humanName: humanNameFn,
      },
    })

    const wire = app.toJSON()
    expect(wire.pipes).toBeDefined()
    expect(typeof wire.pipes!.humanName).toBe('string')
    // The source should be a function body that can be eval'd
    expect(wire.pipes!.humanName).toContain('value')
  })

  it('omits pipes when none provided', () => {
    const app = new PrefabApp({
      view: Column({ children: [Text('hello')] }),
    })
    const wire = app.toJSON()
    expect(wire.pipes).toBeUndefined()
  })

  it('serializes multiple pipes', () => {
    const app = new PrefabApp({
      view: Column({ children: [Text('hello')] }),
      pipes: {
        humanName: humanNameFn,
        phone: ((v: unknown) => String(v)) as PipeFn,
      },
    })
    const wire = app.toJSON()
    expect(Object.keys(wire.pipes!)).toEqual(['humanName', 'phone'])
  })

  it('toHTML embeds pipe sources in wire data', () => {
    const app = new PrefabApp({
      view: Column({ children: [Text('hello')] }),
      pipes: {
        humanName: humanNameFn,
      },
    })
    const html = app.toHTML()
    // The HTML should embed the pipe source in the JSON wire data
    expect(html).toContain('humanName')
    // The pipe function body should be serialized in the JSON
    expect(html).toContain('family')
  })
})

// ── 3. Renderer hydrates pipes from wire format on mount ─────────────────────

describe('Renderer hydrates wire pipes on mount', () => {
  it('registers pipes from wire data before rendering', () => {
    // Pre-check: no custom pipes
    expect(listPipes()).not.toContain('testPipe')

    const wire: PrefabWireFormat = {
      $prefab: { version: '0.2' },
      view: {
        type: 'Text',
        content: '{{ name | testPipe }}',
      },
      state: {
        name: [{ given: ['John'], family: 'Doe' }],
      },
      pipes: {
        testPipe: humanNameFn.toString(),
      },
    }

    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire as never)

    // The pipe should now be registered
    expect(listPipes()).toContain('testPipe')
    // And the rendered text should use it
    expect(root.textContent).toContain('John Doe')

    mounted.destroy()
    // Clean up
    unregisterPipe('testPipe')
  })

  it('wire pipes do not shadow built-in pipes', () => {
    const wire: PrefabWireFormat = {
      $prefab: { version: '0.2' },
      view: {
        type: 'Text',
        content: '{{ name | upper }}',
      },
      state: { name: 'hello' },
      pipes: {
        // Malicious attempt to override built-in 'upper'
        upper: '(value) => "HACKED"',
      },
    }

    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire as never)

    // Built-in upper should win → 'HELLO', not 'HACKED'
    expect(root.textContent).toContain('HELLO')
    expect(root.textContent).not.toContain('HACKED')

    mounted.destroy()
  })

  it('cleans up wire pipes on destroy', () => {
    const wire: PrefabWireFormat = {
      $prefab: { version: '0.2' },
      view: { type: 'Text', content: 'hello' },
      pipes: {
        ephemeralPipe: '(value) => value',
      },
    }

    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire as never)
    expect(listPipes()).toContain('ephemeralPipe')

    mounted.destroy()
    expect(listPipes()).not.toContain('ephemeralPipe')
  })

  it('handles invalid pipe source gracefully', () => {
    const wire: PrefabWireFormat = {
      $prefab: { version: '0.2' },
      view: {
        type: 'Text',
        content: '{{ name | brokenPipe }}',
      },
      state: { name: 'hello' },
      pipes: {
        brokenPipe: 'this is not valid javascript!!! {{{',
      },
    }

    const root = document.createElement('div')
    // Should not throw — graceful fallback
    const mounted = PrefabRenderer.mount(root, wire as never)
    // brokenPipe should NOT be registered (bad source)
    expect(listPipes()).not.toContain('brokenPipe')
    // Fallback: raw value passed through
    expect(root.textContent).toContain('hello')

    mounted.destroy()
  })
})

// ── 4. End-to-end: Node register → serialize → browser mount ─────────────────

describe('E2E: pipe round-trip Node → wire → browser', () => {
  it('custom pipe survives the Node→JSON→renderer round trip', () => {
    // Step 1: Node side — create app with pipes
    const app = new PrefabApp({
      view: Column({ children: [
        Text('{{ patientName | humanName }}'),
      ] }),
      state: {
        patientName: [{ given: ['Jane'], family: 'Smith' }],
      },
      pipes: {
        humanName: humanNameFn,
      },
    })

    // Step 2: Serialize to wire (as if sending over MCP)
    const wire = app.toJSON()
    expect(wire.pipes).toBeDefined()

    // Step 3: Browser side — mount from wire (fresh renderer, no pre-registered pipes)
    const root = document.createElement('div')
    const mounted = PrefabRenderer.mount(root, wire as never)

    // The text should show "Jane Smith", not "[object Object]"
    expect(root.textContent).toContain('Jane Smith')
    expect(root.textContent).not.toContain('[object Object]')

    mounted.destroy()
  })
})
