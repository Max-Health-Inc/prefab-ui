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

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR)
  if (!root) {
    console.error(`[prefab:auto] Mount target "${ROOT_SELECTOR}" not found`)
    return
  }

  const ui = await app()

  let mounted: MountedApp | undefined

  // ── Tool result handler (structuredContent from MCP) ───────────────────
  ui.onToolResult((result) => {
    if (isPrefabWire(result)) {
      if (mounted) mounted.destroy()
      mounted = ui.mount(root, result)
    } else if (isPrefabUpdate(result) && mounted) {
      mounted.update(result)
    }
  })

  // ── Tool input handler (initial data or dynamic args) ──────────────────
  ui.onToolInput((args) => {
    if (isPrefabWire(args)) {
      if (mounted) mounted.destroy()
      mounted = ui.mount(root, args)
    } else if (isPrefabUpdate(args) && mounted) {
      mounted.update(args)
    }
  })
}

boot().catch((err: unknown) => {
  console.error('[prefab:auto] Boot failed:', err)
})
