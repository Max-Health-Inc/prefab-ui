/**
 * PrefabApp — Root application wrapper.
 *
 * Wraps a component tree with state, theme, defs, and key bindings.
 * Serializes to the $prefab wire format compatible with the Python version.
 */

import { type Component } from './core/component.js'
import type { ComponentJSON } from './core/component.js'
import type { Action, ActionJSON } from './actions/types.js'
import { drainAutoState } from './rx/state-collector.js'
import type { PipeFn } from './rx/pipes.js'

/** Package version — injected by build script, updated at release time. */
export const VERSION = '0.2.9'

// ── Theme ────────────────────────────────────────────────────────────────────

export interface Theme {
  light?: Record<string, string>
  dark?: Record<string, string>
}

// ── Wire format ──────────────────────────────────────────────────────────────

export interface PrefabWireFormat {
  $prefab: { version: string }
  view: ComponentJSON
  state?: Record<string, unknown>
  theme?: Theme
  defs?: Record<string, ComponentJSON>
  keyBindings?: Record<string, ActionJSON | ActionJSON[]>
  onMount?: ActionJSON | ActionJSON[]
  stylesheets?: string[]
  /** Custom pipe source code — hydrated by the renderer on mount. */
  pipes?: Record<string, string>
}

// ── PrefabApp ────────────────────────────────────────────────────────────────

export interface PrefabAppOptions {
  title?: string
  view: Component
  state?: Record<string, unknown>
  theme?: Theme
  defs?: Record<string, Component>
  stylesheets?: string[]
  scripts?: string[]
  onMount?: Action | Action[]
  keyBindings?: Record<string, Action | Action[]>
  cssClass?: string
  /** Custom pipes to serialize in the wire format. Functions are converted to source strings. */
  pipes?: Record<string, PipeFn>
}

export class PrefabApp {
  readonly title: string
  readonly view: Component
  readonly state?: Record<string, unknown>
  readonly theme?: Theme
  readonly defs?: Record<string, Component>
  readonly stylesheets?: string[]
  readonly scripts?: string[]
  readonly onMount?: Action | Action[]
  readonly keyBindings?: Record<string, Action | Action[]>
  readonly cssClass?: string
  readonly pipes?: Record<string, PipeFn>

  constructor(opts: PrefabAppOptions) {
    this.title = opts.title ?? 'Prefab'
    this.view = opts.view
    // Merge auto-collected state (from signal/collection factories) with explicit state.
    // Explicit state wins on key conflicts.
    const autoState = drainAutoState()
    const explicit = opts.state
    const merged = Object.keys(autoState).length > 0 || explicit
      ? { ...autoState, ...explicit }
      : undefined
    this.state = merged
    this.theme = opts.theme
    this.defs = opts.defs
    this.stylesheets = opts.stylesheets
    this.scripts = opts.scripts
    this.onMount = opts.onMount
    this.keyBindings = opts.keyBindings
    this.cssClass = opts.cssClass
    this.pipes = opts.pipes
  }

  /**
   * Serialize to the $prefab wire format (JSON).
   * This is what gets sent over MCP or stored as a resource.
   */
  toJSON(): PrefabWireFormat {
    // Wrap view in a root Div with pf-app-root class
    const rootCssClass = this.cssClass ? `pf-app-root ${this.cssClass}` : 'pf-app-root'
    const rootView: ComponentJSON = {
      type: 'Div',
      cssClass: rootCssClass,
      children: [this.view.toJSON()],
    }

    const wire: PrefabWireFormat = {
      $prefab: { version: '0.2' },
      view: rootView,
    }

    if (this.state) wire.state = this.state
    if (this.theme) wire.theme = this.theme
    if (this.stylesheets != null && this.stylesheets.length > 0) wire.stylesheets = this.stylesheets

    if (this.defs) {
      wire.defs = {}
      for (const [name, comp] of Object.entries(this.defs)) {
        wire.defs[name] = comp.toJSON()
      }
    }

    if (this.keyBindings) {
      wire.keyBindings = {}
      for (const [key, actions] of Object.entries(this.keyBindings)) {
        wire.keyBindings[key] = Array.isArray(actions)
          ? actions.map(a => a.toJSON())
          : actions.toJSON()
      }
    }

    if (this.onMount) {
      wire.onMount = Array.isArray(this.onMount)
        ? this.onMount.map(a => a.toJSON())
        : this.onMount.toJSON()
    }

    if (this.pipes && Object.keys(this.pipes).length > 0) {
      wire.pipes = {}
      for (const [name, fn] of Object.entries(this.pipes)) {
        wire.pipes[name] = fn.toString()
      }
    }

    return wire
  }

  /**
   * Serialize to a self-contained HTML page.
   * The page embeds the JSON wire format and a script tag
   * that loads the prefab renderer from a CDN.
   *
   * @param opts.includeStyles  Inject a `<link>` to the prefab base theme CSS
   *   from the CDN.  Defaults to `true`.  Set `false` to BYO CSS.
   */
  toHTML(opts?: { cdnVersion?: string; pretty?: boolean; includeStyles?: boolean }): string {
    const cdnVersion = opts?.cdnVersion ?? VERSION
    const includeStyles = opts?.includeStyles !== false
    const jsonStr = opts?.pretty
      ? JSON.stringify(this.toJSON(), null, 2)
      : JSON.stringify(this.toJSON())

    // Escape </script> in JSON to prevent breaking out of the inline script tag
    const safeJsonStr = jsonStr.replace(/<\//g, '<\\/')

    const baseStyleTag = includeStyles
      ? `\n    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@${cdnVersion}/dist/prefab.css">`
      : ''

    const stylesheetTags = (this.stylesheets ?? [])
      .map(s => s.startsWith('<') ? s : `<link rel="stylesheet" href="${escapeHtml(s)}">`)
      .join('\n    ')

    const scriptTags = (this.scripts ?? [])
      .map(s => `<script src="${escapeHtml(s)}"></script>`)
      .join('\n    ')

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(this.title)}</title>${baseStyleTag}
    ${stylesheetTags}
    <script src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@${cdnVersion}/dist/renderer.min.js"></script>
    ${scriptTags}
  </head>
  <body>
    <div id="prefab-root"></div>
    <script>
      window.__PREFAB_DATA__ = ${safeJsonStr};
      if (window.PrefabRenderer) {
        window.PrefabRenderer.mount(document.getElementById('prefab-root'), window.__PREFAB_DATA__);
      }
    </script>
  </body>
</html>`
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
