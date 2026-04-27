/**
 * Bridge & app() tests -- prefab:* and ui/* JSON-RPC dual protocol.
 *
 * Tests the prefab:* PostMessage protocol which VS Code Copilot supports natively.
 *
 * @happy-dom
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Bridge, isIframe, applyHostTheme } from '../src/renderer/bridge'
import type { HostTheme, BridgeMessage } from '../src/renderer/bridge'
import { app } from '../src/renderer/app'

// ── Bridge (prefab:* protocol) ───────────────────────────────────────────────

describe('Bridge (prefab:* protocol)', () => {
  let bridge: Bridge

  beforeEach(() => {
    bridge = new Bridge('*')
  })

  afterEach(() => {
    bridge.disconnect()
  })

  it('connect and disconnect without error', () => {
    bridge.connect()
    bridge.disconnect()
  })

  it('dispatches incoming messages to registered listeners', () => {
    bridge.connect()

    let received: Record<string, unknown> | undefined
    bridge.on('prefab:tool-input', (payload) => {
      received = payload
    })

    const msg: BridgeMessage = {
      type: 'prefab:tool-input',
      payload: { args: { query: 'test' } },
    }
    window.postMessage(msg, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).toBeDefined()
        expect((received?.args as Record<string, unknown>)?.query).toBe('test')
        resolve()
      }, 50)
    })
  })

  it('ignores messages without prefab: prefix', () => {
    bridge.connect()

    let called = false
    bridge.on('prefab:tool-input', () => { called = true })

    window.postMessage({ type: 'other:message', payload: {} }, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(called).toBe(false)
        resolve()
      }, 50)
    })
  })

  it('off removes a listener', () => {
    bridge.connect()
    let count = 0
    const handler = (): void => { count++ }
    bridge.on('prefab:tool-input', handler)
    bridge.off('prefab:tool-input', handler)

    window.postMessage({ type: 'prefab:tool-input', payload: {} } satisfies BridgeMessage, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(count).toBe(0)
        resolve()
      }, 50)
    })
  })

  it('createTransport returns an McpTransport', () => {
    const transport = bridge.createTransport()
    expect(typeof transport.callTool).toBe('function')
    expect(typeof transport.sendMessage).toBe('function')
  })

  it('initialize resolves via prefab:init-response', async () => {
    bridge.connect()

    // Simulate host responding to prefab:init
    setTimeout(() => {
      const response: BridgeMessage = {
        type: 'prefab:init-response',
        payload: {
          capabilities: { toast: true, navigation: true },
          hostName: 'TestHost',
        } as unknown as Record<string, unknown>,
      }
      window.postMessage(response, '*')
    }, 10)

    const context = await bridge.initialize({ toolInput: true })
    expect(context).toBeDefined()
    expect(context.capabilities).toBeDefined()
    expect(bridge.activeProtocol).toBe('prefab')
  })

  it('createTransport.callTool sends and resolves on response', () => {
    bridge.connect()
    const transport = bridge.createTransport()

    let sentMsg: BridgeMessage | undefined
    const captureHandler = (event: MessageEvent): void => {
      const msg = event.data as BridgeMessage
      if (msg?.type === 'prefab:tool-call') {
        sentMsg = msg
        const response: BridgeMessage = {
          type: 'prefab:tool-call-response',
          id: msg.id,
          payload: { result: { status: 'ok' } },
        }
        window.postMessage(response, '*')
      }
    }
    window.addEventListener('message', captureHandler)

    const promise = transport.callTool('test-tool', { arg1: 'value1' })

    return promise.then((result) => {
      expect(sentMsg).toBeDefined()
      expect(sentMsg!.payload?.tool).toBe('test-tool')
      expect((result as Record<string, unknown>)?.status).toBe('ok')
      window.removeEventListener('message', captureHandler)
    })
  })

  it('createTransport.callTool rejects on error response', () => {
    bridge.connect()
    const transport = bridge.createTransport()

    const captureHandler = (event: MessageEvent): void => {
      const msg = event.data as BridgeMessage
      if (msg?.type === 'prefab:tool-call') {
        const response: BridgeMessage = {
          type: 'prefab:tool-call-response',
          id: msg.id,
          payload: { error: 'Tool not found' },
        }
        window.postMessage(response, '*')
      }
    }
    window.addEventListener('message', captureHandler)

    return transport.callTool('missing-tool', {}).then(
      () => { throw new Error('Should have rejected') },
      (err: unknown) => {
        expect((err as Error).message).toBe('Tool not found')
        window.removeEventListener('message', captureHandler)
      },
    )
  })

  it('activeProtocol defaults to prefab', () => {
    expect(bridge.activeProtocol).toBe('prefab')
  })
})

// ── applyHostTheme ───────────────────────────────────────────────────────────

describe('applyHostTheme', () => {
  it('sets CSS variables on the root element', () => {
    const root = document.createElement('div')
    const theme: HostTheme = {
      variables: { background: '#ffffff', foreground: '#000000' },
    }
    applyHostTheme(root, theme)
    expect(root.style.getPropertyValue('--background')).toBe('#ffffff')
    expect(root.style.getPropertyValue('--foreground')).toBe('#000000')
  })

  it('handles variables with -- prefix', () => {
    const root = document.createElement('div')
    applyHostTheme(root, { variables: { '--accent': 'blue' } })
    expect(root.style.getPropertyValue('--accent')).toBe('blue')
  })

  it('sets data-theme attribute for color scheme', () => {
    const root = document.createElement('div')
    applyHostTheme(root, { colorScheme: 'dark' })
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('does not set data-theme for auto', () => {
    const root = document.createElement('div')
    applyHostTheme(root, { colorScheme: 'auto' })
    expect(root.getAttribute('data-theme')).toBeNull()
  })
})

// ── isIframe ─────────────────────────────────────────────────────────────────

describe('isIframe', () => {
  it('returns false when window.self === window.top', () => {
    expect(isIframe()).toBe(false)
  })
})

// ── app() factory ────────────────────────────────────────────────────────────

describe('app()', () => {
  it('creates a standalone app in non-iframe environment', async () => {
    const ui = await app({ mode: 'standalone' })

    expect(ui).toBeDefined()
    expect(typeof ui.callTool).toBe('function')
    expect(typeof ui.sendMessage).toBe('function')
    expect(typeof ui.onToolInput).toBe('function')
    expect(typeof ui.onToolResult).toBe('function')
    expect(typeof ui.onToolCancelled).toBe('function')
    expect(typeof ui.onToolInputPartial).toBe('function')
    expect(typeof ui.render).toBe('function')
    expect(typeof ui.mount).toBe('function')
    expect(typeof ui.requestMode).toBe('function')
    expect(typeof ui.openLink).toBe('function')
    expect(typeof ui.updateContext).toBe('function')
    expect(typeof ui.destroy).toBe('function')

    expect(ui.host).toBeDefined()
    expect(ui.capabilities).toBeDefined()
    expect(ui.transport).toBeDefined()

    ui.destroy()
  })

  it('render() renders components into a DOM element', async () => {
    const ui = await app({ mode: 'standalone' })
    const root = document.createElement('div')
    document.body.appendChild(root)
    root.id = 'test-render-root'

    const handle = ui.render('#test-render-root', {
      type: 'Column',
      children: [
        { type: 'Text', content: 'Hello World' },
      ],
    })

    expect(handle).toBeDefined()
    expect(root.innerHTML).not.toBe('')
    expect(root.textContent).toContain('Hello World')

    handle.destroy()
    ui.destroy()
    root.remove()
  })

  it('mount() mounts wire format data', async () => {
    const ui = await app({ mode: 'standalone' })
    const root = document.createElement('div')
    document.body.appendChild(root)

    const wireData = {
      $prefab: { version: '0.2' },
      view: {
        type: 'Column',
        children: [
          { type: 'Text', content: 'Mounted!' },
        ],
      },
      state: { count: 0 },
    }

    const mounted = ui.mount(root, wireData)
    expect(mounted).toBeDefined()
    expect(root.textContent).toContain('Mounted!')

    mounted.destroy()
    ui.destroy()
    root.remove()
  })

  it('onToolInput registers a handler', async () => {
    const ui = await app({ mode: 'standalone' })
    let received: Record<string, unknown> | undefined
    ui.onToolInput((args) => { received = args })
    expect(received).toBeUndefined()
    ui.destroy()
  })

  it('creates bridge app when mode is bridge', async () => {
    const respondToInit = (event: MessageEvent): void => {
      const msg = event.data as BridgeMessage
      if (msg?.type === 'prefab:init') {
        const response: BridgeMessage = {
          type: 'prefab:init-response',
          payload: {
            capabilities: { toast: true },
            hostName: 'TestHost',
            hostVersion: '1.0',
          } as unknown as Record<string, unknown>,
        }
        window.postMessage(response, '*')
      }
    }
    window.addEventListener('message', respondToInit)

    const ui = await app({ mode: 'bridge', hostOrigin: '*' })

    expect(ui.host.hostName).toBe('TestHost')
    expect(ui.capabilities.toast).toBe(true)

    ui.destroy()
    window.removeEventListener('message', respondToInit)
  })

  it('delivers initial toolInput from host context', async () => {
    const respondToInit = (event: MessageEvent): void => {
      const msg = event.data as BridgeMessage
      if (msg?.type === 'prefab:init') {
        const response: BridgeMessage = {
          type: 'prefab:init-response',
          payload: {
            capabilities: {},
            toolInput: { query: 'initial' },
          } as unknown as Record<string, unknown>,
        }
        window.postMessage(response, '*')
      }
    }
    window.addEventListener('message', respondToInit)

    const ui = await app({ mode: 'bridge', hostOrigin: '*' })

    let received: Record<string, unknown> | undefined
    ui.onToolInput((args) => { received = args })

    await new Promise((r) => setTimeout(r, 50))
    expect(received).toEqual({ query: 'initial' })

    ui.destroy()
    window.removeEventListener('message', respondToInit)
  })
})

// ── Bridge (JSON-RPC ui/* protocol) ──────────────────────────────────────────

describe('Bridge (JSON-RPC ui/* protocol)', () => {
  let bridge: Bridge

  beforeEach(() => {
    bridge = new Bridge('*')
  })

  afterEach(() => {
    bridge.disconnect()
  })

  it('initializes via ui/initialize when prefab:init times out', async () => {
    bridge.connect()

    // Simulate host responding to ui/initialize JSON-RPC request
    const respondToJsonRpc = (event: MessageEvent): void => {
      const msg = event.data
      if (msg?.jsonrpc === '2.0' && msg.method === 'ui/initialize' && msg.id != null) {
        window.postMessage({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2026-01-26',
            hostInfo: { name: 'VS Code', version: '1.99' },
            hostCapabilities: { openLinks: {} },
            hostContext: {
              theme: 'dark',
              styles: { variables: { '--bg': '#000' } },
              availableDisplayModes: ['inline', 'fullscreen'],
            },
          },
        }, '*')
      }
    }
    window.addEventListener('message', respondToJsonRpc)

    const context = await bridge.initialize({ toolInput: true })

    expect(bridge.activeProtocol).toBe('jsonrpc')
    expect(context.hostName).toBe('VS Code')
    expect(context.hostVersion).toBe('1.99')
    expect(context.capabilities.navigation).toBe(true)
    expect(context.theme?.colorScheme).toBe('dark')
    expect(context.theme?.variables?.['--bg']).toBe('#000')

    window.removeEventListener('message', respondToJsonRpc)
  })

  it('dispatches ui/notifications/tool-result to prefab:tool-result', () => {
    bridge.connect()
    // Force jsonrpc protocol
    ;(bridge as unknown as { protocol: string }).protocol = 'jsonrpc'

    let received: Record<string, unknown> | undefined
    bridge.on('prefab:tool-result', (payload) => { received = payload })

    window.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-result',
      params: {
        content: [{ type: 'text', text: 'hello' }],
        structuredContent: { $prefab: { version: '0.2' }, view: { type: 'Text', content: 'Hi' } },
      },
    }, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).toBeDefined()
        expect(received!.result).toBeDefined()
        const result = received!.result as Record<string, unknown>
        expect(result.structuredContent).toBeDefined()
        resolve()
      }, 50)
    })
  })

  it('dispatches ui/notifications/tool-input to prefab:tool-input', () => {
    bridge.connect()

    let received: Record<string, unknown> | undefined
    bridge.on('prefab:tool-input', (payload) => { received = payload })

    window.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-input',
      params: { arguments: { patientId: '123' } },
    }, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).toBeDefined()
        expect((received!.args as Record<string, unknown>)?.patientId).toBe('123')
        resolve()
      }, 50)
    })
  })

  it('dispatches ui/notifications/tool-cancelled to prefab:tool-cancelled', () => {
    bridge.connect()

    let received = false
    bridge.on('prefab:tool-cancelled', () => { received = true })

    window.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/tool-cancelled',
      params: { reason: 'user cancelled' },
    }, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).toBe(true)
        resolve()
      }, 50)
    })
  })

  it('dispatches ui/notifications/host-context-changed to prefab:theme-update', () => {
    bridge.connect()

    let received: Record<string, unknown> | undefined
    bridge.on('prefab:theme-update', (payload) => { received = payload })

    window.postMessage({
      jsonrpc: '2.0',
      method: 'ui/notifications/host-context-changed',
      params: {
        theme: 'light',
        styles: { variables: { '--accent': 'blue' } },
      },
    }, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).toBeDefined()
        expect((received as HostTheme).colorScheme).toBe('light')
        expect((received as HostTheme).variables?.['--accent']).toBe('blue')
        resolve()
      }, 50)
    })
  })

  it('auto-acknowledges host requests with id', () => {
    bridge.connect()

    let ackReceived = false
    const captureAck = (event: MessageEvent): void => {
      const msg = event.data
      if (msg?.jsonrpc === '2.0' && msg.id === 99 && msg.result != null) {
        ackReceived = true
      }
    }
    window.addEventListener('message', captureAck)

    // Send a ui/resource-teardown request (has an id)
    window.postMessage({
      jsonrpc: '2.0',
      id: 99,
      method: 'ui/resource-teardown',
      params: { reason: 'cleanup' },
    }, '*')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(ackReceived).toBe(true)
        window.removeEventListener('message', captureAck)
        resolve()
      }, 50)
    })
  })

  it('createTransport routes tools/call via JSON-RPC', () => {
    bridge.connect()
    ;(bridge as unknown as { protocol: string }).protocol = 'jsonrpc'
    const transport = bridge.createTransport()

    // Simulate host responding to tools/call
    const respondToToolCall = (event: MessageEvent): void => {
      const msg = event.data
      if (msg?.jsonrpc === '2.0' && msg.method === 'tools/call' && msg.id != null) {
        window.postMessage({
          jsonrpc: '2.0',
          id: msg.id,
          result: { content: [{ type: 'text', text: 'result-data' }] },
        }, '*')
      }
    }
    window.addEventListener('message', respondToToolCall)

    return transport.callTool('my-tool', { arg: 'val' }).then((result) => {
      const r = result as Record<string, unknown>
      expect(r.content).toBeDefined()
      window.removeEventListener('message', respondToToolCall)
    })
  })

  it('parallel race — JSON-RPC wins without waiting for prefab:init timeout', async () => {
    bridge.connect()

    // Respond ONLY to ui/initialize (no prefab:init-response ever)
    const respondToJsonRpc = (event: MessageEvent): void => {
      const msg = event.data
      if (msg?.jsonrpc === '2.0' && msg.method === 'ui/initialize' && msg.id != null) {
        // Respond immediately — should not need to wait 1.5s
        window.postMessage({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2026-01-26',
            hostInfo: { name: 'ChatGPT', version: '4.0' },
            hostCapabilities: {},
            hostContext: {},
          },
        }, '*')
      }
    }
    window.addEventListener('message', respondToJsonRpc)

    const start = Date.now()
    const context = await bridge.initialize({ toolInput: true })
    const elapsed = Date.now() - start

    expect(bridge.activeProtocol).toBe('jsonrpc')
    expect(context.hostName).toBe('ChatGPT')
    // Must resolve faster than the old 1.5s prefab:init timeout
    expect(elapsed).toBeLessThan(500)

    window.removeEventListener('message', respondToJsonRpc)
  })

  it('parallel race — prefab:init wins over JSON-RPC', async () => {
    bridge.connect()

    // Respond ONLY to prefab:init (ignore ui/initialize)
    const respondToPrefab = (event: MessageEvent): void => {
      const msg = event.data as BridgeMessage | undefined
      if (msg?.type === 'prefab:init') {
        window.postMessage({
          type: 'prefab:init-response',
          payload: {
            capabilities: { toast: true },
            hostName: 'TestHost',
          },
        } satisfies BridgeMessage, '*')
      }
    }
    window.addEventListener('message', respondToPrefab)

    const start = Date.now()
    const context = await bridge.initialize({ toolInput: true })
    const elapsed = Date.now() - start

    expect(bridge.activeProtocol).toBe('prefab')
    expect(context.hostName).toBe('TestHost')
    expect(elapsed).toBeLessThan(500)

    window.removeEventListener('message', respondToPrefab)
  })
})

// ── app() tool-result buffering ──────────────────────────────────────────────

describe('app() tool-result buffering', () => {
  it('buffers tool-result received before onToolResult is registered', async () => {
    // Respond to prefab:init so app() completes fast
    const respondToInit = (event: MessageEvent): void => {
      const msg = event.data as BridgeMessage
      if (msg?.type === 'prefab:init') {
        window.postMessage({
          type: 'prefab:init-response',
          payload: { capabilities: {} } as unknown as Record<string, unknown>,
        } satisfies BridgeMessage, '*')
      }
    }
    window.addEventListener('message', respondToInit)

    const ui = await app({ mode: 'bridge', hostOrigin: '*' })

    // Simulate host sending tool-result BEFORE onToolResult is registered
    window.postMessage({
      type: 'prefab:tool-result',
      payload: {
        result: {
          structuredContent: { $prefab: { version: '0.2' }, view: { type: 'Text', content: 'buffered' } },
        },
      },
    } satisfies BridgeMessage, '*')

    // Wait for message to be processed
    await new Promise((r) => setTimeout(r, 50))

    // NOW register the handler — should receive the buffered result
    let received: unknown
    ui.onToolResult((result) => { received = result })

    await new Promise((r) => setTimeout(r, 50))
    expect(received).toBeDefined()
    expect((received as Record<string, unknown>).structuredContent).toBeDefined()

    ui.destroy()
    window.removeEventListener('message', respondToInit)
  })

  it('delivers tool-result immediately when handler is already registered', async () => {
    const respondToInit = (event: MessageEvent): void => {
      const msg = event.data as BridgeMessage
      if (msg?.type === 'prefab:init') {
        window.postMessage({
          type: 'prefab:init-response',
          payload: { capabilities: {} } as unknown as Record<string, unknown>,
        } satisfies BridgeMessage, '*')
      }
    }
    window.addEventListener('message', respondToInit)

    const ui = await app({ mode: 'bridge', hostOrigin: '*' })

    // Register handler FIRST
    let received: unknown
    ui.onToolResult((result) => { received = result })

    // Then send tool-result
    window.postMessage({
      type: 'prefab:tool-result',
      payload: { result: { data: 'direct' } },
    } satisfies BridgeMessage, '*')

    await new Promise((r) => setTimeout(r, 50))
    expect(received).toBeDefined()
    expect((received as Record<string, unknown>).data).toBe('direct')

    ui.destroy()
    window.removeEventListener('message', respondToInit)
  })
})
