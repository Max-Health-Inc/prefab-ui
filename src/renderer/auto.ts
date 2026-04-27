/**
 * Auto-mount entry point — self-executing prefab renderer.
 *
 * When loaded as `<script src="renderer.auto.min.js"></script>`, this bundle:
 * 1. Calls `app()` to initialize bridge + handshake with the host
 * 2. Listens for `onToolResult` (structuredContent) and mounts into `#root`
 * 3. Listens for `onToolInput` and mounts if the payload is $prefab wire data
 *
 * Designed for CSP-restricted environments (VS Code webviews, sandboxed iframes)
 * where inline `<script>` blocks are forbidden.
 *
 * Supports both Bridge protocols:
 *   - prefab:*   (self-hosted, custom hosts)
 *   - ui/* JSON-RPC (VS Code, Claude, ChatGPT)
 *
 * The host HTML only needs:
 * ```html
 * <div id="root"></div>
 * <script src="renderer.auto.min.js"></script>
 * ```
 */

import { app } from './app.js'
import { PrefabRenderer } from './index.js'
import type { PrefabWireData, PrefabUpdateData, MountedApp } from './index.js'

const ROOT_SELECTOR = '#root'

function isPrefabWire(data: unknown): data is PrefabWireData {
  return PrefabRenderer.isPrefabData(data)
}

function isPrefabUpdate(data: unknown): data is PrefabUpdateData {
  return PrefabRenderer.isPrefabUpdate(data)
}

/**
 * Extract $prefab wire data from a tool result payload.
 * Handles both direct wire data and MCP Apps tool-result envelope
 * where the actual data is nested inside `structuredContent`.
 */
interface ContentItem {
  type: string
  text?: string
}

function extractWireData(payload: unknown): PrefabWireData | null {
  if (isPrefabWire(payload)) return payload
  if (payload !== null && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    // MCP Apps tool-result: { content: [...], structuredContent: { $prefab, view } }
    if (isPrefabWire(obj.structuredContent)) return obj.structuredContent
    // Try parsing text content items
    if (Array.isArray(obj.content)) {
      for (const raw of obj.content) {
        const item = raw as ContentItem
        if (item.type === 'text' && typeof item.text === 'string') {
          try {
            const parsed: unknown = JSON.parse(item.text)
            if (isPrefabWire(parsed)) return parsed
          } catch { /* skip non-JSON */ }
        }
      }
    }
  }
  return null
}

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR)
  if (!root) {
    console.error(`[prefab:auto] Mount target "${ROOT_SELECTOR}" not found`)
    return
  }

  const el: HTMLElement = root
  const ui = await app()

  let mounted: MountedApp | undefined

  function mount(data: PrefabWireData): void {
    if (mounted) mounted.destroy()
    mounted = ui.mount(el, data)
  }

  // ── Tool result handler (structuredContent from MCP) ───────────────────
  ui.onToolResult((result) => {
    const wire = extractWireData(result)
    if (wire) {
      mount(wire)
    } else if (isPrefabUpdate(result) && mounted) {
      mounted.update(result)
    }
  })

  // ── Tool input handler (initial data or dynamic args) ──────────────────
  ui.onToolInput((args) => {
    const wire = extractWireData(args)
    if (wire) {
      mount(wire)
    } else if (isPrefabUpdate(args) && mounted) {
      mounted.update(args)
    }
  })
}

/**
 * Defer boot until the DOM is interactive.
 * In VS Code webviews, the sandbox proxy may not be wired when scripts execute.
 * Waiting for DOMContentLoaded (or running immediately if already loaded)
 * ensures postMessage listeners are in place before we send ui/initialize.
 */
function deferBoot(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      boot().catch((err: unknown) => {
        console.error('[prefab:auto] Boot failed:', err)
      })
    }, { once: true })
  } else {
    // DOM already interactive/complete — boot on next microtask to let
    // any synchronous host setup finish
    queueMicrotask(() => {
      boot().catch((err: unknown) => {
        console.error('[prefab:auto] Boot failed:', err)
      })
    })
  }
}

deferBoot()
