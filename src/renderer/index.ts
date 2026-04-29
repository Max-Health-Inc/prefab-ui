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
import { DestroyRegistry } from './engine.js'
import { registerAllComponents } from './components/index.js'
import { applyTheme, applyKeyBindings, createThemeToggle } from './theme.js'
import type { ThemeToggleOptions } from './theme.js'
import { dispatchActions, clearAllIntervals } from './actions.js'
import type { McpTransport, ToastEvent, ActionJSON } from './actions.js'
import { createHttpTransport, createNoopTransport } from './transport.js'
import type { McpTransportOptions } from './transport.js'
import { app } from './app.js'
import { Bridge, isIframe } from './bridge.js'
import { registerPipe, unregisterPipe, listPipes } from '../rx/pipes.js'
import type { PipeFn } from '../rx/pipes.js'
import { registerComponent } from './engine.js'

// Re-export new APIs
export { app } from './app.js'
export type { AppOptions, PrefabApp, MountHandle } from './app.js'
export { Bridge, isIframe, applyHostTheme } from './bridge.js'
export { registerPipe, unregisterPipe, listPipes } from '../rx/pipes.js'
export type { PipeFn } from '../rx/pipes.js'
export { registerComponent } from './engine.js'
export type { RenderFn, RenderResult, RenderFnReturn, ComponentNode, RenderContext } from './engine.js'
export { DestroyRegistry } from './engine.js'
export type {
  AppCapabilities,
  HostCapabilities,
  HostContext,
  HostTheme,
  DisplayMode,
  BridgeMessage,
} from './bridge.js'
export { createThemeToggle } from './theme.js'
export type { ThemeToggleOptions } from './theme.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrefabWireData {
  $prefab: { version: string }
  view: ComponentNode
  state?: Record<string, unknown>
  theme?: { light?: Record<string, string>; dark?: Record<string, string> }
  defs?: Record<string, ComponentNode>
  keyBindings?: Record<string, ActionJSON | ActionJSON[]>
  stylesheets?: string[]
  /** Custom pipe source code strings — hydrated by the renderer on mount. */
  pipes?: Record<string, string>
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
  /** Show a built-in theme toggle. Default: true. Set false to suppress. */
  themeToggle?: boolean | ThemeToggleOptions
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

    // Hydrate custom pipes from wire format (before any rendering)
    const wirePipeNames: string[] = []
    if (data.pipes) {
      for (const [name, source] of Object.entries(data.pipes)) {
        hydratePipe(name, source, wirePipeNames)
      }
    }

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

    // Destroy registry — tracks component cleanup callbacks
    const destroyRegistry = new DestroyRegistry()

    // Build render context
    const ctx: RenderContext = {
      store,
      scope: {},
      transport,
      rerender: () => render(),
      onToast,
      defs: data.defs,
      destroyRegistry,
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

    // Theme toggle
    let cleanupToggle: (() => void) | undefined
    const toggleOpt = options?.themeToggle ?? true
    if (toggleOpt !== false) {
      const toggleCfg = typeof toggleOpt === 'object' ? toggleOpt : undefined
      cleanupToggle = createThemeToggle(root, toggleCfg)
    }

    // Render function
    function render(): void {
      // Flush destroy callbacks from previous render cycle
      destroyRegistry.flush()
      // Preserve the toggle button across re-renders
      const toggleBtn = root.querySelector('.pf-theme-toggle')
      root.innerHTML = ''
      const dom = renderNode(data.view, ctx)
      root.appendChild(dom)
      if (toggleBtn) root.appendChild(toggleBtn)
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
        destroyRegistry.flush()
        cleanupToggle?.()
        cleanupKeys?.()
        clearAllIntervals()
        for (const s of styleEls) s.remove()
        // Unregister wire-hydrated pipes (scoped to this mount)
        for (const name of wirePipeNames) unregisterPipe(name)
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

// ── Pipe hydration ───────────────────────────────────────────────────────────

/** Built-in pipe names that wire pipes must never shadow. */
const BUILTIN_PIPES = new Set([
  'find', 'dot', 'length', 'upper', 'lower', 'truncate', 'join',
  'first', 'last', 'abs', 'round', 'number', 'currency', 'percent',
  'compact', 'date', 'time', 'datetime', 'pluralize', 'default',
  'selectattr', 'rejectattr',
])

/**
 * Safely hydrate a pipe from its source string.
 * Registers it via registerPipe if valid; skips with a warning otherwise.
 * Built-in pipe names are silently ignored (security).
 */
function hydratePipe(name: string, source: string, tracked: string[]): void {
  if (BUILTIN_PIPES.has(name)) {
    console.warn(`[prefab] wire pipe "${name}" ignored — shadows built-in`)
    return
  }
  try {
    // Evaluate the source string as a function expression.
    // new Function is intentional — it's the only way to hydrate serialized pipe source from wire format.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
    const fn = new Function('return (' + source + ')')() as PipeFn
    if (typeof fn !== 'function') {
      console.warn(`[prefab] wire pipe "${name}" — source did not evaluate to a function`)
      return
    }
    registerPipe(name, fn)
    tracked.push(name)
  } catch (e) {
    console.warn(`[prefab] wire pipe "${name}" — failed to hydrate:`, e)
  }
}

// ── Default toast ────────────────────────────────────────────────────────────

function defaultToastHandler(toast: ToastEvent): void {
  if (typeof document === 'undefined') return

  const container = getOrCreateToastContainer()
  const toastEl = document.createElement('div')
  const variant = toast.variant ?? 'default'
  toastEl.className = `pf-toast${variant !== 'default' ? ` pf-toast--${variant}` : ''}`
  toastEl.setAttribute('data-variant', variant)
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
    registerPipe,
    unregisterPipe,
    listPipes,
    registerComponent,
    createThemeToggle,
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
