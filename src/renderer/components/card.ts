/**
 * Card component renderers — Card, CardHeader, CardTitle, etc.
 */

import { registerComponent, renderChildren, resolveStr, el } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerCardComponents(): void {
  registerComponent('Card', renderCard)
  registerComponent('CardHeader', renderCardSection('pf-card-header'))
  registerComponent('CardTitle', renderCardText('pf-card-title', 'h3'))
  registerComponent('CardDescription', renderCardText('pf-card-description', 'p'))
  registerComponent('CardContent', renderCardSection('pf-card-content'))
  registerComponent('CardFooter', renderCardSection('pf-card-footer'))
}

function renderCard(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-card')
  e.style.overflow = 'hidden'
  renderChildren(node, e, ctx)
  return e
}

function renderCardSection(cls: string) {
  return (node: ComponentNode, ctx: RenderContext): HTMLElement => {
    const e = el('div', cls)
    e.style.padding = '16px 24px'
    renderChildren(node, e, ctx)
    return e
  }
}

function renderCardText(cls: string, tag: string) {
  return (node: ComponentNode, ctx: RenderContext): HTMLElement => {
    const e = document.createElement(tag)
    e.className = cls
    e.textContent = resolveStr(node.content, ctx)
    return e
  }
}
