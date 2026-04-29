/**
 * app() factory — the one-call entry point for prefab apps.
 *
 * Auto-detects environment (iframe → postMessage bridge, standalone → HTTP transport),
 * performs handshake if in iframe, applies host theme, and returns a clean API object.
 *
 * Usage:
 * ```ts
 * const ui = await prefab.app();
 *
 * ui.onToolInput((args) => {
 *   ui.render('#root', Column(
 *     H1('Results'),
 *     autoTable(args.data),
 *   ));
 * });
 * ```
 */

import { PrefabRenderer } from './index.js'
import type { PrefabWireData, MountOptions, MountedApp } from './index.js'
import { Bridge, isIframe, applyHostTheme } from './bridge.js'
import type {
  AppCapabilities,
  HostContext,
  HostCapabilities,
  HostTheme,
  DisplayMode,
} from './bridge.js'
import { createHttpTransport, createNoopTransport } from './transport.js'
import type { McpTransportOptions } from './transport.js'
import type { McpTransport } from './actions.js'
import { registerAllComponents } from './components/index.js'
import { Store } from './state.js'
import { renderNode } from './engine.js'
import type { ComponentNode, RenderContext } from './engine.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppOptions {
  /** Override environment detection: force bridge or standalone mode. */
  mode?: 'bridge' | 'standalone' | 'auto'
  /** Allowed host origin for postMessage (default: '*'). Set explicitly in production. */
  hostOrigin?: string
  /** HTTP transport options (for standalone mode). */
  transport?: McpTransportOptions
  /** App capabilities to advertise to host. */
  capabilities?: AppCapabilities
}

export type ToolInputHandler = (args: Record<string, unknown>) => void
export type ToolResultHandler = (result: unknown) => void
export type VoidHandler = () => void

export interface PrefabApp {
  /** Call an MCP tool through the transport. */
  callTool: (name: string, args?: Record<string, unknown>) => Promise<unknown>
  /** Send a message through the transport. */
  sendMessage: (message: string) => Promise<void>
  /** Register a handler for tool input from the host. */
  onToolInput: (handler: ToolInputHandler) => void
  /** Register a handler for tool results from the host. */
  onToolResult: (handler: ToolResultHandler) => void
  /** Register a handler for tool cancellation. */
  onToolCancelled: (handler: VoidHandler) => void
  /** Register a handler for partial/streaming tool input. */
  onToolInputPartial: (handler: ToolInputHandler) => void
  /** Render a component tree into a DOM element. */
  render: (target: string | HTMLElement, ...components: ComponentNode[]) => MountHandle
  /** Mount full wire-format data (legacy API). */
  mount: (target: string | HTMLElement, data: PrefabWireData, opts?: MountOptions) => MountedApp
  /** Request a display mode change. */
  requestMode: (mode: DisplayMode) => void
  /** Request the host to open a URL. */
  openLink: (url: string, target?: string) => void
  /** Send context updates. */
  updateContext: (context: Record<string, unknown>) => void
  /**
   * Observe an element and notify the host whenever it resizes.
   * Mirrors the ext-apps SDK `autoResize: true` behaviour.
   * Returns a teardown function that disconnects the observer.
   */
  setupAutoResize: (target: string | HTMLElement) => () => void
  /** Host context from initialization. */
  host: HostContext
  /** Host capabilities. */
  capabilities: HostCapabilities
  /** Host theme (if provided). */
  theme: HostTheme | undefined
  /** The underlying MCP transport. */
  transport: McpTransport
  /** Destroy the app and clean up. */
  destroy: () => void
}

export interface MountHandle {
  /** Re-render the current component tree. */
  rerender: () => void
  /** Access the reactive store. */
  store: Store
  /** Unmount. */
  destroy: () => void
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a prefab app. Auto-detects iframe vs standalone.
 *
 * In an iframe: uses postMessage bridge, performs handshake with host.
 * Standalone: uses HTTP transport (or noop if no config).
 */
export async function app(options?: AppOptions): Promise<PrefabApp> {
  registerAllComponents()

  const mode = options?.mode ?? 'auto'
  const useBridge = mode === 'bridge' || (mode === 'auto' && isIframe())

  let transport: McpTransport
  let bridge: Bridge | undefined
  let hostContext: HostContext = { capabilities: {} }

  if (useBridge) {
    bridge = new Bridge(options?.hostOrigin)
    bridge.connect()
    hostContext = await bridge.initialize(options?.capabilities ?? { toolInput: true })
    transport = bridge.createTransport()
  } else if (options?.transport) {
    transport = createHttpTransport(options.transport)
  } else {
    transport = createNoopTransport()
  }

  // Apply host theme if provided and we're in a browser
  if (hostContext.theme && typeof document !== 'undefined') {
    applyHostTheme(document.documentElement, hostContext.theme)
  }

  // NOTE: VS Code theming is handled automatically via the var() fallback
  // chain in prefab.css — --vscode-editor-background etc. resolve in :root
  // and @media-dark blocks without needing data-theme.

  // Lifecycle handlers
  let toolInputHandler: ToolInputHandler | undefined
  let toolResultHandler: ToolResultHandler | undefined
  let toolCancelledHandler: VoidHandler | undefined
  let toolInputPartialHandler: ToolInputHandler | undefined

  // Buffer initial tool input — delivered when onToolInput is registered
  let pendingToolInput: Record<string, unknown> | undefined = hostContext.toolInput

  // Buffer tool result — delivered when onToolResult is registered
  // (host may send tool-result before the handler is wired up, e.g. VS Code)
  let pendingToolResult: unknown

  // Wire up bridge lifecycle events
  if (bridge) {
    bridge.on('prefab:tool-input', (payload) => {
      const args = (payload.args ?? payload) as Record<string, unknown>
      if (toolInputHandler) {
        toolInputHandler(args)
      } else {
        pendingToolInput = args
      }
    })
    bridge.on('prefab:tool-result', (payload) => {
      const result = payload.result ?? payload
      if (toolResultHandler) {
        toolResultHandler(result)
      } else {
        pendingToolResult = result
      }
    })
    bridge.on('prefab:tool-cancelled', () => {
      toolCancelledHandler?.()
    })
    bridge.on('prefab:tool-input-partial', (payload) => {
      toolInputPartialHandler?.((payload.args ?? payload) as Record<string, unknown>)
    })
    bridge.on('prefab:theme-update', (payload) => {
      if (typeof document !== 'undefined') {
        applyHostTheme(document.documentElement, payload as unknown as HostTheme)
      }
    })
  }

  // ── render() — functional composition API ────────────────────────────────

  function render(
    target: string | HTMLElement,
    ...components: ComponentNode[]
  ): MountHandle {
    const root = resolveTarget(target)
    const store = new Store()

    const ctx: RenderContext = {
      store,
      scope: {},
      transport,
      rerender: () => doRender(),
      onToast: undefined,
    }

    function doRender(): void {
      root.innerHTML = ''
      for (const component of components) {
        root.appendChild(renderNode(component, ctx))
      }
    }

    doRender()
    return { rerender: doRender, store, destroy: () => { root.innerHTML = '' } }
  }

  // ── Build API ────────────────────────────────────────────────────────────

  const api: PrefabApp = {
    callTool: (name, args = {}) => transport.callTool(name, args),
    sendMessage: (message) => transport.sendMessage(message),
    onToolInput: (handler) => {
      toolInputHandler = handler
      // Flush buffered initial tool input
      if (pendingToolInput) {
        const args = pendingToolInput
        pendingToolInput = undefined
        queueMicrotask(() => handler(args))
      }
    },
    onToolResult: (handler) => {
      toolResultHandler = handler
      // Flush buffered tool result
      if (pendingToolResult !== undefined) {
        const result = pendingToolResult
        pendingToolResult = undefined
        queueMicrotask(() => handler(result))
      }
    },
    onToolCancelled: (handler) => { toolCancelledHandler = handler },
    onToolInputPartial: (handler) => { toolInputPartialHandler = handler },
    render,
    mount: (target, data, opts) => {
      const root = resolveTarget(target)
      return PrefabRenderer.mount(root, data, {
        transport,
        ...opts,
      })
    },
    requestMode: (m) => bridge?.requestMode(m),
    openLink: (url, t) => {
      if (bridge) {
        bridge.openLink(url, t)
      } else if (typeof window !== 'undefined') {
        window.open(url, t ?? '_blank')
      }
    },
    updateContext: (context) => {
      if (bridge) bridge.updateContext(context)
    },
    setupAutoResize: (target) => {
      if (!bridge) return noop
      const el = typeof target === 'string' ? resolveTarget(target) : target
      return bridge.setupAutoResize(el)
    },
    host: hostContext,
    capabilities: hostContext.capabilities,
    theme: hostContext.theme,
    transport,
    destroy: () => bridge?.disconnect(),
  }

  return api
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Reusable empty function to satisfy lint (no-empty-function). */
const noop = (): void => { /* no-op */ }

function resolveTarget(target: string | HTMLElement): HTMLElement {
  if (typeof target === 'string') {
    if (typeof document === 'undefined') {
      throw new Error('Cannot resolve selector outside browser')
    }
    const el = document.querySelector(target)
    if (!el) throw new Error(`Element not found: ${target}`)
    return el as HTMLElement
  }
  return target
}


