/**
 * PrefabRenderer — Main entry point for the browser renderer.
 *
 * Usage (CDN — new API):
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab/dist/renderer.min.js"></script>
 * <script>
 *   const ui = await prefab.app();
 *   ui.onToolInput((args) => {
 *     ui.render('#root', chart({ data: args.data }));
 *   });
 * </script>
 * ```
 *
 * Usage (CDN — legacy):
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab/dist/renderer.min.js"></script>
 * <script>
 *   PrefabRenderer.mount(document.getElementById('root'), data);
 * </script>
 * ```
 *
 * Or as ESM:
 * ```ts
 * import { PrefabRenderer, app } from '@maxhealth.tech/prefab/renderer'
 * const ui = await app()
 * ```
 */

import { Store } from './state.js'
import { renderNode } from './engine.js'
import type { ComponentNode, RenderContext } from './engine.js'
import { registerAllComponents } from './components/index.js'
import { applyTheme, applyKeyBindings } from './theme.js'
import { dispatchActions, clearAllIntervals } from './actions.js'
import type { McpTransport, ToastEvent, ActionJSON } from './actions.js'
import { createHttpTransport, createNoopTransport } from './transport.js'
import type { McpTransportOptions } from './transport.js'
import { app } from './app.js'
import { Bridge, isIframe } from './bridge.js'

// Re-export new APIs
export { app } from './app.js'
export type { AppOptions, PrefabApp, MountHandle } from './app.js'
export { Bridge, isIframe, applyHostTheme } from './bridge.js'
export type {
  AppCapabilities,
  HostCapabilities,
  HostContext,
  HostTheme,
  DisplayMode,
  BridgeMessage,
} from './bridge.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrefabWireData {
  $prefab: { version: string }
  view: ComponentNode
  state?: Record<string, unknown>
  theme?: { light?: Record<string, string>; dark?: Record<string, string> }
  defs?: Record<string, ComponentNode>
  keyBindings?: Record<string, ActionJSON | ActionJSON[]>
  stylesheets?: string[]
}

export interface PrefabUpdateData {
  $prefab: { version: string }
  update: { state: Record<string, unknown> }
}

export interface MountOptions {
  /** MCP transport configuration. */
  transport?: McpTransport | McpTransportOptions
  /** Toast notification handler. */
  onToast?: (toast: ToastEvent) => void
}

export interface MountedApp {
  /** Re-render the entire UI from current state. */
  rerender: () => void
  /** Apply a state update (from display_update). */
  update: (data: PrefabUpdateData) => void
  /** Get the reactive store. */
  store: Store
  /** Unmount and clean up. */
  destroy: () => void
}

// ── PrefabRenderer ───────────────────────────────────────────────────────────

export const PrefabRenderer = {
  /**
   * Mount a prefab UI into a DOM element.
   *
   * @param root - The DOM element to render into.
   * @param data - The $prefab wire format JSON.
   * @param options - Optional transport and toast handler.
   * @returns A MountedApp handle for updates and cleanup.
   */
  mount(root: HTMLElement, data: PrefabWireData, options?: MountOptions): MountedApp {
    // Register all built-in components (idempotent)
    registerAllComponents()

    // Initialize state store
    const store = new Store(data.state)

    // Set up transport
    let transport: McpTransport
    if (options?.transport && 'callTool' in options.transport) {
      transport = options.transport
    } else if (options?.transport) {
      transport = createHttpTransport(options.transport as McpTransportOptions)
    } else {
      transport = createNoopTransport()
    }

    // Toast handler with fallback
    const onToast = options?.onToast ?? defaultToastHandler

    // Build render context
    const ctx: RenderContext = {
      store,
      scope: {},
      transport,
      rerender: () => render(),
      onToast,
      defs: data.defs,
    }

    // Apply theme
    applyTheme(root, data.theme)

    // Inject stylesheets
    const styleEls: HTMLStyleElement[] = []
    if (data.stylesheets) {
      for (const css of data.stylesheets) {
        const style = document.createElement('style')
        style.textContent = css
        style.dataset.prefab = 'injected'
        document.head.appendChild(style)
        styleEls.push(style)
      }
    }

    // Keyboard bindings
    let cleanupKeys: (() => void) | undefined
    if (data.keyBindings) {
      cleanupKeys = applyKeyBindings(data.keyBindings, async (actions) => {
        await dispatchActions(actions as ActionJSON | ActionJSON[], {
          store,
          transport,
          scope: {},
          rerender: () => render(),
          onToast,
        })
      })
    }

    // Render function
    function render(): void {
      root.innerHTML = ''
      const dom = renderNode(data.view, ctx)
      root.appendChild(dom)
    }

    // Initial render
    render()

    // Run onMount from the view root (if present)
    // Already handled by renderNode via queueMicrotask

    return {
      rerender: () => render(),
      update(updateData: PrefabUpdateData) {
        store.merge(updateData.update.state)
        render()
      },
      store,
      destroy() {
        cleanupKeys?.()
        clearAllIntervals()
        for (const s of styleEls) s.remove()
        root.innerHTML = ''
      },
    }
  },

  /**
   * Check if data is a prefab wire format.
   */
  isPrefabData(data: unknown): data is PrefabWireData {
    return data != null && typeof data === 'object' && '$prefab' in data
  },

  /**
   * Check if data is a prefab state update.
   */
  isPrefabUpdate(data: unknown): data is PrefabUpdateData {
    return (
      data != null &&
      typeof data === 'object' &&
      '$prefab' in data &&
      'update' in data
    )
  },
}

// ── Default toast ────────────────────────────────────────────────────────────

function defaultToastHandler(toast: ToastEvent): void {
  if (typeof document === 'undefined') return

  const container = getOrCreateToastContainer()
  const toastEl = document.createElement('div')
  toastEl.className = 'pf-toast'
  toastEl.setAttribute('data-variant', toast.variant ?? 'default')
  toastEl.style.padding = '12px 16px'
  toastEl.style.borderRadius = '8px'
  toastEl.style.backgroundColor = 'var(--card, #fff)'
  toastEl.style.border = '1px solid var(--border, #e5e7eb)'
  toastEl.style.boxShadow = '0 4px 12px rgb(0 0 0 / 0.15)'
  toastEl.style.marginBottom = '8px'
  toastEl.style.transition = 'opacity 0.3s ease'

  const msg = document.createElement('div')
  msg.textContent = toast.message
  msg.style.fontWeight = '500'
  toastEl.appendChild(msg)

  if (toast.description) {
    const desc = document.createElement('div')
    desc.textContent = toast.description
    desc.style.fontSize = '14px'
    desc.style.color = 'var(--muted-foreground, #6b7280)'
    toastEl.appendChild(desc)
  }

  container.appendChild(toastEl)

  const duration = toast.duration ?? 4000
  setTimeout(() => {
    toastEl.style.opacity = '0'
    setTimeout(() => toastEl.remove(), 300)
  }, duration)
}

function getOrCreateToastContainer(): HTMLElement {
  const id = 'prefab-toast-container'
  let container = document.getElementById(id)
  if (!container) {
    container = document.createElement('div')
    container.id = id
    container.style.position = 'fixed'
    container.style.bottom = '16px'
    container.style.right = '16px'
    container.style.zIndex = '9999'
    container.style.maxWidth = '400px'
    document.body.appendChild(container)
  }
  return container
}

// ── Auto-mount from window.__PREFAB_DATA__ ───────────────────────────────────

if (typeof window !== 'undefined') {
  // Expose as window.PrefabRenderer (legacy) and window.prefab (new API)
  const w = window as unknown as Record<string, unknown>
  w.PrefabRenderer = PrefabRenderer
  w.prefab = {
    app,
    mount: PrefabRenderer.mount.bind(PrefabRenderer),
    isPrefabData: PrefabRenderer.isPrefabData.bind(PrefabRenderer),
    isPrefabUpdate: PrefabRenderer.isPrefabUpdate.bind(PrefabRenderer),
    Bridge,
    isIframe,
  }

  // Auto-mount if data is available
  const prefabData = w.__PREFAB_DATA__ as PrefabWireData | undefined
  if (prefabData != null) {
    const root = document.getElementById('prefab-root')
    if (root) {
      PrefabRenderer.mount(root, prefabData)
    }
  }
}
