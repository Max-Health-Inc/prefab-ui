/**
 * MCP Display Helpers — return prefab UIs as MCP tool results.
 *
 * These functions wrap PrefabApp / Component trees into MCP-compatible
 * tool result content arrays, ready to return from tool handlers.
 *
 * @example
 * ```ts
 * import { display, display_error } from 'prefab-ui/mcp'
 * import { autoTable } from 'prefab-ui'
 *
 * // In a FastMCP tool handler:
 * async function listPatients(args, context) {
 *   const patients = await fetchPatients()
 *   return display(autoTable(patients), { title: 'Patient List' })
 * }
 * ```
 */

import { Component } from '../core/component.js'
import { PrefabApp } from '../app.js'
import type { PrefabAppOptions, Theme } from '../app.js'
import type { Action } from '../actions/types.js'
import type { McpToolResult } from './types.js'

// ── display() ────────────────────────────────────────────────────────────────

export interface DisplayOptions {
  /** Page / app title. */
  title?: string
  /** Initial reactive state. */
  state?: Record<string, unknown>
  /** Light/dark theme overrides. */
  theme?: Theme
  /** Reusable component definitions. */
  defs?: Record<string, Component>
  /** Action(s) to run when the UI mounts. */
  onMount?: Action | Action[]
  /** Keyboard shortcuts. */
  keyBindings?: Record<string, Action | Action[]>
  /** Extra CSS class on root element. */
  cssClass?: string
}

/**
 * Wrap a Component (or PrefabApp) as an MCP tool result.
 *
 * If given a Component, it's wrapped in a PrefabApp automatically.
 * If given a PrefabApp, it's serialized as-is.
 *
 * @returns MCP tool result with the prefab wire format JSON as text content.
 */
export function display(
  viewOrApp: Component | PrefabApp,
  options?: DisplayOptions,
): McpToolResult {
  const app = viewOrApp instanceof PrefabApp
    ? viewOrApp
    : new PrefabApp({
        title: options?.title ?? 'Prefab',
        view: viewOrApp,
        state: options?.state,
        theme: options?.theme,
        defs: options?.defs,
        onMount: options?.onMount,
        keyBindings: options?.keyBindings,
        cssClass: options?.cssClass,
      })

  return {
    content: [{ type: 'text', text: JSON.stringify(app.toJSON()) }],
  }
}

// ── display_form() ───────────────────────────────────────────────────────────

import { autoForm } from '../auto/form.js'
import type { AutoFormField, AutoFormOptions } from '../auto/form.js'

export interface DisplayFormOptions extends AutoFormOptions {
  /** Initial state values for form fields. */
  state?: Record<string, unknown>
  /** Theme overrides. */
  theme?: Theme
}

/**
 * Return a form UI as an MCP tool result.
 *
 * The form submits back to the specified MCP tool via CallTool.
 * Field definitions map to Input components; the submit action
 * invokes `submitTool` with all field values.
 *
 * @returns MCP tool result with form prefab UI.
 */
export function display_form(
  fields: AutoFormField[],
  submitTool: string,
  options?: DisplayFormOptions,
): McpToolResult {
  const view = autoForm(fields, submitTool, options)
  const app = new PrefabApp({
    title: options?.title ?? 'Form',
    view,
    state: options?.state,
    theme: options?.theme,
  })

  return {
    content: [{ type: 'text', text: JSON.stringify(app.toJSON()) }],
  }
}

// ── display_update() ─────────────────────────────────────────────────────────

export interface StateUpdate {
  /** State key-value pairs to merge into the existing UI state. */
  state: Record<string, unknown>
}

export interface PrefabUpdateWire {
  $prefab: { version: string }
  update: StateUpdate
}

/**
 * Return a partial state update for an existing prefab UI.
 *
 * Instead of re-rendering the entire UI, this sends a state delta
 * that the renderer merges into its reactive store.
 *
 * @returns MCP tool result with a $prefab update payload.
 */
export function display_update(
  state: Record<string, unknown>,
): McpToolResult {
  const payload: PrefabUpdateWire = {
    $prefab: { version: '0.2' },
    update: { state },
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  }
}

// ── display_error() ──────────────────────────────────────────────────────────

import { Column } from '../components/layout/index.js'
import { Heading, Muted, Code } from '../components/typography/index.js'
import { Alert, AlertTitle, AlertDescription } from '../components/alert/index.js'
import { Card, CardContent } from '../components/card/index.js'

export interface DisplayErrorOptions {
  /** Error detail / stack trace to show in a code block. */
  detail?: string
  /** Hint for the user on how to fix the issue. */
  hint?: string
  /** Theme overrides. */
  theme?: Theme
}

/**
 * Return a standardized error view as an MCP tool result.
 *
 * Renders a destructive Alert with title + message, optional detail
 * code block, and optional hint. Sets `isError: true` on the MCP result.
 *
 * @returns MCP tool result with error UI and isError flag.
 */
export function display_error(
  title: string,
  message: string,
  options?: DisplayErrorOptions,
): McpToolResult {
  const alertChildren: Component[] = [
    AlertTitle(title),
    AlertDescription(message),
  ]

  const bodyChildren: Component[] = [
    Alert({ variant: 'destructive', icon: 'AlertCircle', children: alertChildren }),
  ]

  if (options?.detail) {
    bodyChildren.push(
      Card({ children: [CardContent({ children: [Code(options.detail)] })] }),
    )
  }

  if (options?.hint) {
    bodyChildren.push(Muted(options.hint))
  }

  const view = Column({ gap: 4, cssClass: 'p-6 max-w-2xl', children: bodyChildren })

  const app = new PrefabApp({
    title: 'Error',
    view,
    theme: options?.theme,
  })

  return {
    content: [{ type: 'text', text: JSON.stringify(app.toJSON()) }],
    isError: true,
  }
}
