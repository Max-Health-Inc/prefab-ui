/**
 * Bridge -- PostMessage-based communication between a prefab app
 * (running in an iframe) and its host (the parent window).
 *
 * Dual protocol:
 *   Primary:  prefab:* custom protocol (supported by VS Code Copilot, MistralOS)
 *   Fallback: ext-apps JSON-RPC 2.0 (@modelcontextprotocol/ext-apps)
 *
 * Protocol detection: tries prefab:init first (1.5s timeout).
 * If no response, falls back to ext-apps.
 *
 * prefab:* messages:
 *   App  → Host: prefab:init, prefab:tool-call, prefab:send-message,
 *                 prefab:request-mode, prefab:open-link, prefab:update-context
 *   Host → App:  prefab:init-response, prefab:tool-input, prefab:tool-result,
 *                 prefab:tool-cancelled, prefab:theme-update, prefab:state-update
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
}

// ── Lazy ext-apps types ──────────────────────────────────────────────────────

type ExtApp = import('@modelcontextprotocol/ext-apps').App
type ExtTransportClass = typeof import('@modelcontextprotocol/ext-apps').PostMessageTransport

// ── Bridge Class ─────────────────────────────────────────────────────────────

export class Bridge {
  private hostOrigin: string
  private listeners = new Map<string, Set<(payload: Record<string, unknown>) => void>>()
  private protocol: 'prefab' | 'ext-apps' = 'prefab'
  private cleanup: (() => void) | undefined

  // prefab:* state
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private callIdCounter = 0

  // ext-apps state (lazy)
  private extApp: ExtApp | undefined

  constructor(hostOrigin = '*') {
    this.hostOrigin = hostOrigin
  }

  /** Start listening for prefab:* messages. */
  connect(): void {
    if (typeof window === 'undefined') return

    const handler = (event: MessageEvent): void => {
      if (this.hostOrigin !== '*' && event.origin !== this.hostOrigin) return
      const msg = event.data as BridgeMessage | undefined
      if (!msg?.type?.startsWith('prefab:')) return

      // Resolve pending tool-call promises
      if (msg.type === 'prefab:tool-call-response' && msg.id) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          if (msg.payload?.error != null) {
            p.reject(new Error(msg.payload.error as string))
          } else {
            p.resolve(msg.payload?.result)
          }
          return
        }
      }

      // Dispatch to registered listeners
      const handlers = this.listeners.get(msg.type)
      if (handlers) {
        for (const fn of handlers) fn(msg.payload ?? {})
      }
    }

    window.addEventListener('message', handler)
    this.cleanup = () => window.removeEventListener('message', handler)
  }

  /**
   * Init handshake. Tries prefab:init first, falls back to ext-apps.
   */
  async initialize(appCapabilities: AppCapabilities): Promise<HostContext> {
    try {
      return await this.initPrefab(appCapabilities)
    } catch {
      return this.initExtApps(appCapabilities)
    }
  }

  /** Create an McpTransport that routes through the active protocol. */
  createTransport(): McpTransport {
    if (this.protocol === 'ext-apps' && this.extApp) {
      return this.createExtAppsTransport()
    }
    return this.createPrefabTransport()
  }

  /** Request a display mode change. */
  requestMode(mode: DisplayMode): void {
    if (this.protocol === 'ext-apps' && this.extApp) {
      void this.extApp.requestDisplayMode({ mode })
    } else {
      this.sendPrefab('prefab:request-mode', { mode })
    }
  }

  /** Request the host to open a URL. */
  openLink(url: string, target?: string): void {
    if (this.protocol === 'ext-apps' && this.extApp) {
      void this.extApp.openLink({ url })
    } else {
      this.sendPrefab('prefab:open-link', { url, target })
    }
  }

  /** Send context updates to the host. */
  updateContext(context: Record<string, unknown>): void {
    if (this.protocol === 'ext-apps' && this.extApp) {
      void this.extApp.updateModelContext({ structuredContent: context })
    } else {
      this.sendPrefab('prefab:update-context', { context })
    }
  }

  /** Register a handler for a message type (prefab:* or internal). */
  on(type: string, handler: (payload: Record<string, unknown>) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
  }

  /** Remove a handler. */
  off(type: string, handler: (payload: Record<string, unknown>) => void): void {
    this.listeners.get(type)?.delete(handler)
  }

  /** Disconnect and clean up. */
  disconnect(): void {
    this.cleanup?.()
    this.extApp = undefined
    this.listeners.clear()
    for (const [, p] of this.pending) {
      p.reject(new Error('Bridge disconnected'))
    }
    this.pending.clear()
  }

  /** Which protocol is active after initialize(). */
  get activeProtocol(): 'prefab' | 'ext-apps' {
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

      // If no prefab:init-response within 1.5s, reject to trigger ext-apps fallback
      setTimeout(() => {
        if (!settled) {
          settled = true
          this.off('prefab:init-response', onResponse)
          reject(new Error('prefab:init timeout'))
        }
      }, 1500)
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

  // ── ext-apps fallback ──────────────────────────────────────────────────

  private async initExtApps(appCapabilities: AppCapabilities): Promise<HostContext> {
    const { App, PostMessageTransport } = await import('@modelcontextprotocol/ext-apps')
    const transport = new (PostMessageTransport as ExtTransportClass)(
      window.parent,
      window.parent,
    )
    const extApp = new App(
      { name: 'prefab', version: '0.2' },
      {
        ...(appCapabilities.displayModes && {
          availableDisplayModes: appCapabilities.displayModes,
        }),
      },
    )

    this.wireExtAppsEvents(extApp)

    await Promise.race([
      extApp.connect(transport),
      rejectAfter(3000, 'ext-apps init timeout'),
    ])

    this.extApp = extApp
    this.protocol = 'ext-apps'

    const hostInfo = extApp.getHostVersion?.()
    const hostCaps = extApp.getHostCapabilities?.()
    const hostCtx = extApp.getHostContext?.()

    return {
      hostName: hostInfo?.name,
      hostVersion: hostInfo?.version,
      capabilities: {
        toast: true,
        navigation: hostCaps?.openLinks != null,
        messaging: true,
      },
      theme: hostCtx?.theme
        ? { colorScheme: hostCtx.theme as 'light' | 'dark' | 'auto' }
        : undefined,
      // ext-apps delivers tool args via ui/notifications/tool-input, not in hostContext
      toolInput: undefined,
      meta: hostCtx as unknown as Record<string, unknown>,
    }
  }

  private wireExtAppsEvents(extApp: ExtApp): void {
    extApp.ontoolinput = (params) => {
      this.dispatch('prefab:tool-input', { args: params.arguments ?? {} })
    }
    extApp.ontoolinputpartial = (params) => {
      this.dispatch('prefab:tool-input-partial', { args: params.arguments ?? {} })
    }
    extApp.ontoolresult = (params) => {
      this.dispatch('prefab:tool-result', { result: params })
    }
    extApp.ontoolcancelled = () => {
      this.dispatch('prefab:tool-cancelled', {})
    }
    extApp.onhostcontextchanged = (params) => {
      const theme: HostTheme = {}
      if (params.theme) {
        theme.colorScheme = params.theme as 'light' | 'dark' | 'auto'
      }
      this.dispatch('prefab:theme-update', theme as Record<string, unknown>)
    }
  }

  private createExtAppsTransport(): McpTransport {
    const extApp = this.extApp!
    return {
      callTool: async (name: string, args: Record<string, unknown>): Promise<unknown> => {
        const result = await extApp.callServerTool({ name, arguments: args })
        if (result?.content) {
          const texts = (result.content as Array<{ type: string; text?: string }>)
            .filter(c => c.type === 'text')
            .map(c => c.text)
          return texts.length === 1 ? texts[0] : texts
        }
        return result
      },
      sendMessage: async (message: string): Promise<void> => {
        await extApp.sendMessage({
          role: 'user',
          content: [{ type: 'text', text: message }],
        })
      },
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

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}

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
