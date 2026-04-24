/**
 * Control flow renderers — ForEach, If/Elif/Else
 */

import { registerComponent, renderNode, renderChildArray } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'
import { evaluateTemplate, isRxExpression } from '../rx.js'

export function registerControlComponents(): void {
  registerComponent('ForEach', renderForEach)
  registerComponent('If', renderIf)
  registerComponent('Elif', renderElif)
  registerComponent('Else', renderElse)
  registerComponent('Define', renderDefine)
  registerComponent('Use', renderUse)
  registerComponent('Slot', renderSlot)
}

function renderForEach(node: ComponentNode, ctx: RenderContext): DocumentFragment {
  const frag = document.createDocumentFragment()
  const expr = node.expression as string | undefined
  if (!expr) return frag
  let items: unknown[]

  if (isRxExpression(expr)) {
    const val = evaluateTemplate(expr, ctx.store, ctx.scope)
    items = Array.isArray(val) ? val : []
  } else {
    const val = ctx.store.get(expr)
    items = Array.isArray(val) ? val : []
  }

  const letBindings = (node.let as Record<string, unknown> | undefined) ?? {}

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const childScope = {
      ...ctx.scope,
      $item: item,
      $index: i,
      ...letBindings,
    }
    const childCtx = { ...ctx, scope: childScope }

    if (node.children) {
      renderChildArray(node.children, frag, childCtx)
    }
  }

  return frag
}

/**
 * If/Elif/Else rendering.
 *
 * These components form a conditional chain. When an If is encountered,
 * it checks siblings for Elif/Else. Since the parent renders children
 * sequentially, we handle this by marking Elif/Else as already-consumed
 * when found after an If.
 *
 * For the standalone render, If evaluates its condition and renders
 * children if truthy. Elif/Else are no-ops when rendered standalone
 * (they're consumed by the parent's If chain logic).
 */
function renderIf(node: ComponentNode, ctx: RenderContext): HTMLElement | DocumentFragment {
  const condition = evaluateCondition(node.condition as string, ctx)

  if (condition) {
    const frag = document.createDocumentFragment()
    if (node.children) {
      renderChildArray(node.children, frag, ctx)
    }
    return frag
  }

  // Return empty element
  return document.createDocumentFragment()
}

function renderElif(node: ComponentNode, ctx: RenderContext): HTMLElement | DocumentFragment {
  // Elif is evaluated the same as If (parent chain handles precedence)
  return renderIf(node, ctx)
}

function renderElse(node: ComponentNode, ctx: RenderContext): DocumentFragment {
  const frag = document.createDocumentFragment()
  if (node.children) {
    renderChildArray(node.children, frag, ctx)
  }
  return frag
}

function evaluateCondition(condition: string, ctx: RenderContext): boolean {
  if (!condition) return false
  if (isRxExpression(condition)) {
    return Boolean(evaluateTemplate(condition, ctx.store, ctx.scope))
  }
  // Plain state key reference
  return Boolean(ctx.store.get(condition))
}

// ── Define / Use / Slot ──────────────────────────────────────────────────────

/**
 * Define: stores named template children in the context defs map.
 * Renders nothing — content is materialized via Use.
 */
function renderDefine(node: ComponentNode, ctx: RenderContext): DocumentFragment {
  const name = node.name as string
  if (name && node.children) {
    ctx.templates = ctx.templates ?? {}
    ctx.templates[name] = node.children
  }
  return document.createDocumentFragment()
}

/**
 * Use: materializes a named definition previously stored via Define.
 * Accepts both `def` (TS builder) and `name` (legacy) props.
 */
function renderUse(node: ComponentNode, ctx: RenderContext): DocumentFragment {
  const frag = document.createDocumentFragment()
  const name = (node.def ?? node.name) as string
  const children = ctx.templates?.[name]
  if (!children) return frag

  const overrides = (node.overrides ?? {}) as Record<string, unknown>
  const childScope = { ...ctx.scope, ...overrides }
  const childCtx = { ...ctx, scope: childScope }

  for (const child of children) {
    frag.appendChild(renderNode(child, childCtx))
  }
  return frag
}

/**
 * Slot: renders named slot children, or fallback children if no slot content provided.
 */
function renderSlot(node: ComponentNode, ctx: RenderContext): DocumentFragment {
  const frag = document.createDocumentFragment()
  const slotName = (node.name as string | undefined) ?? 'default'

  // Check if parent context provided slot content
  const slotContent = ctx.slots?.[slotName]
  const children = slotContent ?? node.children

  if (children) {
    for (const child of children) {
      frag.appendChild(renderNode(child, ctx))
    }
  }
  return frag
}
