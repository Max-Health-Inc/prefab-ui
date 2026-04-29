/**
 * Component render engine — takes JSON component trees and produces DOM.
 *
 * The engine uses a registry of render functions keyed by component type.
 * Each render function receives the JSON node and a render context,
 * and returns an HTMLElement (or DocumentFragment).
 */

import type { Store } from './state.js'
import type { EvalScope } from './rx.js'
import type { DispatchContext, McpTransport, ToastEvent, ActionJSON } from './actions.js'
import { evaluateTemplate, isRxExpression } from './rx.js'
import { dispatchActions } from './actions.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ComponentNode {
  type: string
  id?: string
  cssClass?: string
  onMount?: ActionJSON | ActionJSON[]
  children?: ComponentNode[]
  [key: string]: unknown
}

export interface RenderContext {
  store: Store
  scope: EvalScope
  transport?: McpTransport
  rerender: () => void
  onToast?: (toast: ToastEvent) => void
  defs?: Record<string, ComponentNode>
  templates?: Record<string, ComponentNode[]>
  slots?: Record<string, ComponentNode[]>
  destroyRegistry?: DestroyRegistry
}

/** Result of a render function that includes a cleanup callback. */
export interface RenderResult {
  element: HTMLElement | DocumentFragment
  destroy: () => void
}

export type RenderFnReturn = HTMLElement | DocumentFragment | RenderResult

export type RenderFn = (node: ComponentNode, ctx: RenderContext) => RenderFnReturn

// ── Destroy registry ─────────────────────────────────────────────────────────

/** Tracks destroy callbacks for mounted components within a render cycle. */
export class DestroyRegistry {
  private callbacks: (() => void)[] = []

  /** Register a destroy callback. */
  track(cb: () => void): void {
    this.callbacks.push(cb)
  }

  /** Call all registered destroy callbacks and clear the list. */
  flush(): void {
    for (const cb of this.callbacks) {
      try { cb() } catch (e) { console.warn('[prefab] destroy callback error:', e) }
    }
    this.callbacks = []
  }

  /** Number of registered callbacks (for testing). */
  get size(): number {
    return this.callbacks.length
  }
}

// ── Registry ─────────────────────────────────────────────────────────────────

/** Type guard: does the render function return include a destroy callback? */
function isRenderResult(value: RenderFnReturn): value is RenderResult {
  return typeof value === 'object' && 'element' in value
}

const registry = new Map<string, RenderFn>()

/** Register a render function for a component type */
export function registerComponent(type: string, fn: RenderFn): void {
  if (registry.has(type)) {
    console.warn(`[prefab] overriding existing renderer for "${type}"`)
  }
  registry.set(type, fn)
}

/** Get a render function (or fallback) */
export function getRenderer(type: string): RenderFn | undefined {
  return registry.get(type)
}

// ── Core render ──────────────────────────────────────────────────────────────

/**
 * Render a component node to DOM.
 * Looks up the renderer by type; falls back to a generic div.
 */
export function renderNode(node: ComponentNode, ctx: RenderContext): HTMLElement | DocumentFragment {
  // Resolve defs: if node.type matches a def, substitute
  if (ctx.defs?.[node.type]) {
    const defNode = { ...ctx.defs[node.type], ...node, type: ctx.defs[node.type].type }
    return renderNode(defNode, ctx)
  }

  const renderFn = registry.get(node.type)
  let el: HTMLElement | DocumentFragment

  if (renderFn) {
    const result = renderFn(node, ctx)
    if (isRenderResult(result)) {
      el = result.element
      ctx.destroyRegistry?.track(result.destroy)
    } else {
      el = result
    }
  } else {
    // Fallback: generic div with data-type
    el = document.createElement('div')
    ;(el).setAttribute('data-prefab-type', node.type)
    if (node.children) {
      for (const child of node.children) {
        el.appendChild(renderNode(child, ctx))
      }
    }
  }

  // Apply common props
  if (el instanceof HTMLElement) {
    if (node.id) el.id = node.id
    if (node.cssClass) {
      const cls = resolveStr(node.cssClass, ctx)
      if (cls) el.className = (el.className ? el.className + ' ' : '') + cls
    }
  }

  // Run onMount actions
  if (node.onMount) {
    const onMount = node.onMount
    const dispCtx = makeDispatchCtx(ctx)
    queueMicrotask(() => void dispatchActions(onMount, dispCtx))
  }

  return el
}

/**
 * Render all children of a node into a parent element.
 * Handles If/Elif/Else chains: only the first matching branch renders.
 */
export function renderChildren(node: ComponentNode, parent: HTMLElement, ctx: RenderContext): void {
  if (!node.children) return
  renderChildArray(node.children, parent, ctx)
}

/**
 * Render an array of child nodes into a parent, handling If/Elif/Else chains.
 * Exported so ForEach and other manual-loop renderers can use it.
 */
export function renderChildArray(
  children: ComponentNode[],
  parent: HTMLElement | DocumentFragment,
  ctx: RenderContext,
): void {
  let i = 0
  while (i < children.length) {
    const child = children[i]
    if (child.type === 'If') {
      i = renderConditionalChain(children, i, parent, ctx)
    } else if (child.type === 'Elif' || child.type === 'Else') {
      // Orphaned Elif/Else outside an If chain — skip silently
      i++
    } else {
      parent.appendChild(renderNode(child, ctx))
      i++
    }
  }
}

/**
 * Consume an If / Elif* / Else? chain starting at index `start`.
 * Returns the index of the first child AFTER the chain.
 */
function renderConditionalChain(
  children: ComponentNode[],
  start: number,
  parent: HTMLElement | DocumentFragment,
  ctx: RenderContext,
): number {
  let matched = false
  let i = start

  // Evaluate the If node
  const ifNode = children[i]
  if (evalCondition(ifNode.condition as string, ctx)) {
    renderBranchChildren(ifNode, parent, ctx)
    matched = true
  }
  i++

  // Consume consecutive Elif / Else siblings
  while (i < children.length) {
    const sibling = children[i]
    if (sibling.type === 'Elif') {
      if (!matched && evalCondition(sibling.condition as string, ctx)) {
        renderBranchChildren(sibling, parent, ctx)
        matched = true
      }
      i++
    } else if (sibling.type === 'Else') {
      if (!matched) {
        renderBranchChildren(sibling, parent, ctx)
      }
      i++
      break // Else always terminates the chain
    } else {
      break // Non-conditional sibling — chain ends
    }
  }

  return i
}

/** Evaluate a condition string to boolean (used by the chain handler). */
function evalCondition(condition: string, ctx: RenderContext): boolean {
  if (!condition) return false
  if (isRxExpression(condition)) {
    return Boolean(evaluateTemplate(condition, ctx.store, ctx.scope))
  }
  return Boolean(ctx.store.get(condition))
}

/** Render a branch node's children into the parent. */
function renderBranchChildren(
  node: ComponentNode,
  parent: HTMLElement | DocumentFragment,
  ctx: RenderContext,
): void {
  if (!node.children) return
  renderChildArray(node.children, parent, ctx)
}

// ── Helpers for renderers ────────────────────────────────────────────────────

/** Resolve a possibly-reactive string value */
export function resolveStr(value: unknown, ctx: RenderContext): string {
  if (isRxExpression(value)) {
    const result = evaluateTemplate(value, ctx.store, ctx.scope)
    return result == null ? '' : String(result as string | number | boolean)
  }
  return value == null ? '' : String(value as string | number | boolean)
}

/** Resolve a possibly-reactive value, keeping original type */
export function resolveValue(value: unknown, ctx: RenderContext): unknown {
  if (isRxExpression(value)) {
    return evaluateTemplate(value, ctx.store, ctx.scope)
  }
  return value
}

/** Create a DispatchContext from RenderContext */
export function makeDispatchCtx(ctx: RenderContext): DispatchContext {
  return {
    store: ctx.store,
    transport: ctx.transport,
    scope: ctx.scope,
    rerender: ctx.rerender,
    onToast: ctx.onToast,
  }
}

/** Create an element with a CSS class */
export function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag)
  if (className) e.className = className
  return e
}

/** Set text content on an element */
export function text(element: HTMLElement, content: string): HTMLElement {
  element.textContent = content
  return element
}
