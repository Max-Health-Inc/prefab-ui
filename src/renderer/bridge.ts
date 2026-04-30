/**
 * Bridge -- PostMessage-based communication between a prefab app
 * (running in an iframe) and its host (the parent window).
 *
 * Dual protocol:
 *   1. prefab:*   — custom protocol (self-hosted, any postMessage host)
 *   2. ui/*       — MCP Apps JSON-RPC 2.0 (VS Code, Claude, ChatGPT, Goose)
 *
 * Protocol detection: races prefab:init and ui/initialize JSON-RPC
 * in parallel — whichever responds first wins.
 *
 * prefab:* messages:
 *   App  → Host: prefab:init, prefab:tool-call, prefab:send-message,
 *                 prefab:request-mode, prefab:open-link, prefab:update-context
 *   Host → App:  prefab:init-response, prefab:tool-input, prefab:tool-result,
 *                 prefab:tool-cancelled, prefab:theme-update, prefab:state-update
 *
 * ui/* JSON-RPC messages (MCP Apps spec 2026-01-26):
 *   App  → Host: ui/initialize, ui/notifications/initialized,
 *                 ui/notifications/size-changed, ui/open-link, ui/message,
 *                 ui/request-display-mode, ui/update-model-context
 *   Host → App:  ui/notifications/tool-input, ui/notifications/tool-result,
 *                 ui/notifications/tool-cancelled, ui/notifications/tool-input-partial,
 *                 ui/notifications/host-context-changed, ui/resource-teardown
 */

import type { McpTransport } from './actions.js'

// ── Public types ─────────────────────────────────────────────────────────────

export interface BridgeMessage<T extends string = string> {
  type: T
  id?: string
  payload?: Record<string, unknown>
}

export interface AppCapabilities {
  toolInput?: boolean
  partialInput?: boolean
  displayModes?: DisplayMode[]
  version?: string
}

export interface HostCapabilities {
  toast?: boolean
  clipboard?: boolean
  navigation?: boolean
  displayModes?: DisplayMode[]
  messaging?: boolean
}

export type DisplayMode = 'inline' | 'fullscreen' | 'pip'

export interface HostContext {
  hostName?: string
  hostVersion?: string
  capabilities: HostCapabilities
  theme?: HostTheme
  toolInput?: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface HostTheme {
  variables?: Record<string, string>
  colorScheme?: 'light' | 'dark' | 'auto'
  /** Raw CSS for @font-face / @import rules (from MCP Apps styles.css.fonts) */
  fontCss?: string
}

// ── JSON-RPC types ───────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: number | string
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: unknown
  error?: { code: number; message: string }
}

type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse

/** Type guard: is this a JSON-RPC 2.0 envelope? */
function isJsonRpcEnvelope(msg: unknown): msg is JsonRpcMessage {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    (msg as Record<string, unknown>).jsonrpc === '2.0'
  )
}

// ── Bridge Class ─────────────────────────────────────────────────────────────

export class Bridge {
  private hostOrigin: string
  private listeners = new Map<string, Set<(payload: Record<string, unknown>) => void>>()
  private protocol: 'prefab' | 'jsonrpc' = 'prefab'
  private cleanup: (() => void) | undefined

  // prefab:* state
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private callIdCounter = 0

  // JSON-RPC state
  private rpcPending = new Map<number | string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private rpcIdCounter = 0
  private sentRpcIds = new Set<number | string>()
  private postFn: ((msg: unknown) => void) | undefined

  constructor(hostOrigin = '*') {
    this.hostOrigin = hostOrigin
  }

  /** Start listening for messages (prefab:* and JSON-RPC ui/*). */
  connect(): void {
    if (typeof window === 'undefined') return

    // Detect VS Code webview API (provides postMessage without origin restrictions)
    const vscodeApi = detectVsCodeApi()
    if (vscodeApi) {
      this.postFn = (msg) => vscodeApi.postMessage(msg)
    }

    const handler = (event: MessageEvent): void => {
      if (this.hostOrigin !== '*' && event.origin !== this.hostOrigin) return
      const msg: unknown = event.data

      // ── JSON-RPC 2.0 messages (ui/* protocol) ───────────────────────────
      if (isJsonRpcEnvelope(msg)) {
        this.handleJsonRpc(msg)
        return
      }

      // ── prefab:* messages ───────────────────────────────────────────────
      const bmsg = msg as BridgeMessage | undefined
      if (!bmsg?.type.startsWith('prefab:')) return

      // Resolve pending tool-call promises
      if (bmsg.type === 'prefab:tool-call-response' && bmsg.id) {
        const p = this.pending.get(bmsg.id)
        if (p) {
          this.pending.delete(bmsg.id)
          if (bmsg.payload?.error != null) {
            p.reject(new Error(bmsg.payload.error as string))
          } else {
            p.resolve(bmsg.payload?.result)
          }
          return
        }
      }

      // Dispatch to registered listeners
      const handlers = this.listeners.get(bmsg.type)
      if (handlers) {
        for (const fn of handlers) fn(bmsg.payload ?? {})
      }
    }

    window.addEventListener('message', handler)
    this.cleanup = () => window.removeEventListener('message', handler)
  }

  /**
   * Init handshake. Races prefab:init and ui/initialize JSON-RPC in parallel.
   * Whichever protocol responds first wins.
   */
  async initialize(appCapabilities: AppCapabilities): Promise<HostContext> {
    try {
      return await Promise.any([
        this.initPrefab(appCapabilities),
        this.initJsonRpc(appCapabilities),
      ])
    } catch (err) {
      // All protocols failed — provide a clear diagnostic instead of raw AggregateError
      const reasons = err instanceof AggregateError
        ? err.errors.map((e: Error) => e.message).join('; ')
        : String(err)
      throw new Error(`Bridge init failed — no host responded. Tried: ${reasons}`, { cause: err })
    }
  }

  /** Create an McpTransport that routes through the active protocol. */
  createTransport(): McpTransport {
    if (this.protocol === 'jsonrpc') {
      return this.createJsonRpcTransport()
    }
    return this.createPrefabTransport()
  }

  /** Request a display mode change. */
  requestMode(mode: DisplayMode): void {
    if (this.protocol === 'jsonrpc') {
      void this.sendRpcRequest('ui/request-display-mode', { mode })
    } else {
      this.sendPrefab('prefab:request-mode', { mode })
    }
  }

  /** Request the host to open a URL. */
  openLink(url: string, target?: string): void {
    if (this.protocol === 'jsonrpc') {
      void this.sendRpcRequest('ui/open-link', { url, target })
    } else {
      this.sendPrefab('prefab:open-link', { url, target })
    }
  }

  /** Send context updates to the host. */
  updateContext(context: Record<string, unknown>): void {
    if (this.protocol === 'jsonrpc') {
      void this.sendRpcRequest('ui/update-model-context', { structuredContent: context })
    } else {
      this.sendPrefab('prefab:update-context', { context })
    }
  }

  /**
   * Observe an element's size and notify the host whenever it changes.
   * Mirrors the ext-apps SDK's `autoResize: true` behaviour — uses a
   * `ResizeObserver` on the target element and sends
   * `ui/notifications/size-changed` (JSON-RPC) or
   * `prefab:size-changed` (prefab protocol).
   *
   * Returns a teardown function that disconnects the observer.
   */
  setupAutoResize(el: HTMLElement): () => void {
    if (typeof ResizeObserver === 'undefined') return noop

    let lastW = -1
    let lastH = -1

    const notify = (width: number, height: number): void => {
      if (width === lastW && height === lastH) return
      lastW = width
      lastH = height
      if (this.protocol === 'jsonrpc') {
        this.sendRpcNotification('ui/notifications/size-changed', { width, height })
      } else {
        this.sendPrefab('prefab:size-changed', { width, height })
      }
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Prefer borderBoxSize when available (more accurate for CSS box-model)
        if (entry.borderBoxSize.length) {
          const box = entry.borderBoxSize[0]
          notify(Math.ceil(box.inlineSize), Math.ceil(box.blockSize))
        } else {
          const rect = entry.target.getBoundingClientRect()
          notify(Math.ceil(rect.width), Math.ceil(rect.height))
        }
      }
    })

    observer.observe(el)

    // Fire an initial notification so the host gets the right size immediately
    const rect = el.getBoundingClientRect()
    notify(Math.ceil(rect.width), Math.ceil(rect.height))

    return () => observer.disconnect()
  }

  /**
   * Notify the host of declarative layout/size hints from the wire format.
   * Sends once when the UI mounts so the host can pre-allocate space.
   *
   * Uses `ui/notifications/preferred-size` (JSON-RPC) or
   * `prefab:preferred-size` (prefab protocol).
   */
  notifyPreferredSize(layout: { preferredHeight?: number; minHeight?: number; maxHeight?: number }): void {
    if (this.protocol === 'jsonrpc') {
      this.sendRpcNotification('ui/notifications/preferred-size', layout)
    } else {
      this.sendPrefab('prefab:preferred-size', layout as Record<string, unknown>)
    }
  }

  /** Register a handler for a message type (prefab:* or internal). */
  on(type: string, handler: (payload: Record<string, unknown>) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    const set = this.listeners.get(type)
    if (set) set.add(handler)
  }

  /** Remove a handler. */
  off(type: string, handler: (payload: Record<string, unknown>) => void): void {
    this.listeners.get(type)?.delete(handler)
  }

  /** Disconnect and clean up. */
  disconnect(): void {
    this.cleanup?.()
    this.listeners.clear()
    for (const [, p] of this.pending) {
      p.reject(new Error('Bridge disconnected'))
    }
    this.pending.clear()
    for (const [, p] of this.rpcPending) {
      p.reject(new Error('Bridge disconnected'))
    }
    this.rpcPending.clear()
    this.sentRpcIds.clear()
  }

  /** Which protocol is active after initialize(). */
  get activeProtocol(): 'prefab' | 'jsonrpc' {
    return this.protocol
  }

  // ── prefab:* protocol ──────────────────────────────────────────────────

  private initPrefab(appCapabilities: AppCapabilities): Promise<HostContext> {
    return new Promise<HostContext>((resolve, reject) => {
      let settled = false

      const onResponse = (payload: Record<string, unknown>): void => {
        if (settled) return
        settled = true
        this.off('prefab:init-response', onResponse)
        this.protocol = 'prefab'
        resolve(payload as unknown as HostContext)
      }
      this.on('prefab:init-response', onResponse)
      this.sendPrefab('prefab:init', { capabilities: appCapabilities })

      // Timeout — loses the race, the other protocol may still win
      setTimeout(() => {
        if (!settled) {
          settled = true
          this.off('prefab:init-response', onResponse)
          reject(new Error('prefab:init timeout'))
        }
      }, 2000)
    })
  }

  private createPrefabTransport(): McpTransport {
    return {
      callTool: (name: string, args: Record<string, unknown>): Promise<unknown> => {
        const id = `tc-${++this.callIdCounter}`
        return new Promise((resolve, reject) => {
          this.pending.set(id, { resolve, reject })
          this.sendPrefab('prefab:tool-call', { tool: name, arguments: args }, id)
          setTimeout(() => {
            if (this.pending.has(id)) {
              this.pending.delete(id)
              reject(new Error(`Tool call '${name}' timed out`))
            }
          }, 30000)
        })
      },
      sendMessage: (message: string): Promise<void> => {
        this.sendPrefab('prefab:send-message', { message })
        return Promise.resolve()
      },
    }
  }

  private sendPrefab(type: string, payload?: Record<string, unknown>, id?: string): void {
    if (typeof window === 'undefined') return
    const target = window.parent !== window ? window.parent : window
    const msg: BridgeMessage = { type, payload, id }
    target.postMessage(msg, this.hostOrigin)
  }

  // ── JSON-RPC ui/* protocol (MCP Apps spec 2026-01-26) ────────────────

  /** Handle incoming JSON-RPC message. */
  private handleJsonRpc(msg: JsonRpcMessage): void {
    // Response to a request we sent (has no 'method' → must be JsonRpcResponse)
    if (!('method' in msg)) {
      const p = this.rpcPending.get(msg.id)
      if (p) {
        this.rpcPending.delete(msg.id)
        if (msg.error) {
          p.reject(new Error(msg.error.message))
        } else {
          p.resolve(msg.result)
        }
      }
      return
    }

    // Request or notification from host (JsonRpcRequest)
    const method = msg.method
    const params = msg.params ?? {}

    // Skip our own outgoing requests bounced back (same-window postMessage in tests)
    if (msg.id != null && this.sentRpcIds.delete(msg.id)) return

    // Auto-acknowledge host requests (those with an id) so we don't deadlock
    if (msg.id != null) {
      this.postJsonRpc({ jsonrpc: '2.0', id: msg.id, result: {} })
    }

    // Map ui/* notifications to internal prefab:* events
    switch (method) {
      case 'ui/notifications/tool-input':
        this.dispatch('prefab:tool-input', { args: params.arguments ?? params })
        break
      case 'ui/notifications/tool-input-partial':
        this.dispatch('prefab:tool-input-partial', { args: params.arguments ?? params })
        break
      case 'ui/notifications/tool-result':
        this.dispatch('prefab:tool-result', { result: params })
        break
      case 'ui/notifications/tool-cancelled':
        this.dispatch('prefab:tool-cancelled', params)
        break
      case 'ui/notifications/host-context-changed': {
        const theme: HostTheme = {}
        if (typeof params.theme === 'string') {
          theme.colorScheme = params.theme as 'light' | 'dark' | 'auto'
        }
        if (typeof params.styles === 'object' && params.styles !== null) {
          const styles = params.styles as { variables?: Record<string, string>; css?: { fonts?: string } }
          if (styles.variables) theme.variables = styles.variables
          if (typeof styles.css?.fonts === 'string') theme.fontCss = styles.css.fonts
        }
        this.dispatch('prefab:theme-update', theme as Record<string, unknown>)
        break
      }
      case 'ui/resource-teardown':
        this.dispatch('prefab:teardown', params)
        break
    }
  }

  /** Initialize via MCP Apps JSON-RPC ui/initialize handshake. */
  private initJsonRpc(appCapabilities: AppCapabilities): Promise<HostContext> {
    return new Promise<HostContext>((resolve, reject) => {
      const id = ++this.rpcIdCounter
      let settled = false

      this.rpcPending.set(id, {
        resolve: (result) => {
          if (settled) return
          settled = true
          this.protocol = 'jsonrpc'

          const r = (result ?? {}) as Record<string, unknown>
          const hostInfo = (r.hostInfo ?? {}) as Record<string, string>
          const hostCtx = (r.hostContext ?? {}) as Record<string, unknown>
          const hostCaps = (r.hostCapabilities ?? {}) as Record<string, unknown>

          // Parse theme from hostContext
          let theme: HostTheme | undefined
          if (typeof hostCtx.theme === 'string' || typeof hostCtx.styles === 'object') {
            theme = {}
            if (typeof hostCtx.theme === 'string') {
              theme.colorScheme = hostCtx.theme as 'light' | 'dark' | 'auto'
            }
            if (typeof hostCtx.styles === 'object' && hostCtx.styles !== null) {
              const styles = hostCtx.styles as { variables?: Record<string, string>; css?: { fonts?: string } }
              if (styles.variables) theme.variables = styles.variables
              if (typeof styles.css?.fonts === 'string') theme.fontCss = styles.css.fonts
            }
          }

          // Send ui/notifications/initialized to confirm readiness
          this.postJsonRpc({
            jsonrpc: '2.0',
            method: 'ui/notifications/initialized',
            params: {},
          })

          resolve({
            hostName: hostInfo.name,
            hostVersion: hostInfo.version,
            capabilities: {
              toast: true,
              navigation: hostCaps.openLinks != null,
              messaging: true,
              displayModes: (hostCtx.availableDisplayModes ?? []) as DisplayMode[],
            },
            theme,
            toolInput: undefined,
            meta: hostCtx,
          })
        },
        reject: (err) => {
          if (settled) return
          settled = true
          reject(err)
        },
      })

      // Send ui/initialize request (matches MCP Apps spec 2026-01-26 / ext-apps SDK schema)
      this.postJsonRpc({
        jsonrpc: '2.0',
        id,
        method: 'ui/initialize',
        params: {
          protocolVersion: '2026-01-26',
          appInfo: { name: 'prefab', version: '0.2' },
          appCapabilities: {
            ...(appCapabilities.displayModes && {
              availableDisplayModes: appCapabilities.displayModes,
            }),
          },
        },
      })

      // Timeout — loses the race, the other protocol may still win
      setTimeout(() => {
        if (!settled) {
          settled = true
          this.rpcPending.delete(id)
          reject(new Error('ui/initialize timeout'))
        }
      }, 2000)
    })
  }

  /** Create transport that routes tool calls via JSON-RPC tools/call. */
  private createJsonRpcTransport(): McpTransport {
    return {
      callTool: (name: string, args: Record<string, unknown>): Promise<unknown> => {
        return this.sendRpcRequest('tools/call', { name, arguments: args })
      },
      sendMessage: (message: string): Promise<void> => {
        return this.sendRpcRequest('ui/message', {
          role: 'user',
          content: { type: 'text', text: message },
        }) as Promise<void>
      },
    }
  }

  /** Send a JSON-RPC request and return a promise for the response. */
  private sendRpcRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = ++this.rpcIdCounter
    return new Promise((resolve, reject) => {
      this.rpcPending.set(id, { resolve, reject })
      this.postJsonRpc({ jsonrpc: '2.0', id, method, params })
      setTimeout(() => {
        if (this.rpcPending.has(id)) {
          this.rpcPending.delete(id)
          reject(new Error(`JSON-RPC '${method}' timed out`))
        }
      }, 30000)
    })
  }

  /** Send a JSON-RPC notification (no id, no response expected). */
  private sendRpcNotification(method: string, params: Record<string, unknown>): void {
    this.postJsonRpc({ jsonrpc: '2.0', method, params })
  }

  /** Low-level: post a JSON-RPC envelope. Uses acquireVsCodeApi if available. */
  private postJsonRpc(msg: Record<string, unknown>): void {
    if (typeof window === 'undefined') return
    // Track outgoing request ids to filter self-messages in same-window envs
    if (msg.id != null && typeof msg.method === 'string') {
      this.sentRpcIds.add(msg.id as number | string)
    }
    if (this.postFn) {
      this.postFn(msg)
    } else {
      const target = window.parent !== window ? window.parent : window
      target.postMessage(msg, this.hostOrigin)
    }
  }


  // ── Shared ─────────────────────────────────────────────────────────────

  private dispatch(type: string, payload: Record<string, unknown>): void {
    const handlers = this.listeners.get(type)
    if (handlers) {
      for (const fn of handlers) fn(payload)
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Reusable empty function to satisfy lint (no-empty-function). */
const noop = (): void => { /* no-op */ }

// ── Host Theme → CSS Variables ───────────────────────────────────────────────

export function applyHostTheme(root: HTMLElement, hostTheme: HostTheme): void {
  if (hostTheme.variables) {
    for (const [key, value] of Object.entries(hostTheme.variables)) {
      root.style.setProperty(key.startsWith('--') ? key : `--${key}`, value)
    }
  }

  if (hostTheme.colorScheme && hostTheme.colorScheme !== 'auto') {
    root.setAttribute('data-theme', hostTheme.colorScheme)
  }

  if (hostTheme.fontCss) {
    applyHostFonts(hostTheme.fontCss)
  }
}

/** Inject host-provided @font-face / @import CSS (idempotent). */
function applyHostFonts(fontCss: string): void {
  const styleId = '__prefab-host-fonts'
  if (document.getElementById(styleId)) return
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = fontCss
  document.head.appendChild(style)
}

// ── Environment Detection ────────────────────────────────────────────────────

export function isIframe(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/** Detect VS Code webview API (acquireVsCodeApi). Returns the API object or undefined. */
function detectVsCodeApi(): { postMessage: (msg: unknown) => void } | undefined {
  if (typeof window === 'undefined') return undefined
  const win = window as unknown as Record<string, unknown>
  if (typeof win.acquireVsCodeApi === 'function') {
    try {
      const api = (win.acquireVsCodeApi as () => unknown)()
      if (api !== null && typeof api === 'object' && 'postMessage' in api) {
        return api as { postMessage: (msg: unknown) => void }
      }
    } catch {
      return undefined
    }
  }
  return undefined
}
