/**
 * Alert component renderers — Alert, AlertTitle, AlertDescription
 */

import { registerComponent, renderChildren, resolveStr, el } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerAlertComponents(): void {
  registerComponent('Alert', renderAlert)
  registerComponent('AlertTitle', renderAlertTitle)
  registerComponent('AlertDescription', renderAlertDescription)
}

function renderAlert(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-alert')
  e.setAttribute('role', 'alert')
  const variant = (node.variant as string | undefined) ?? 'default'
  e.setAttribute('data-variant', variant)
  e.style.padding = '12px 16px'

  if (node.icon != null) {
    const icon = el('span', 'pf-alert-icon')
    icon.setAttribute('data-icon', node.icon as string)
    icon.style.marginRight = '8px'
    e.appendChild(icon)
  }

  renderChildren(node, e, ctx)
  return e
}

function renderAlertTitle(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('h5', 'pf-alert-title')
  e.textContent = resolveStr(node.content, ctx)
  e.style.fontWeight = '600'
  e.style.marginBottom = '4px'
  return e
}

function renderAlertDescription(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('p', 'pf-alert-description')
  e.textContent = resolveStr(node.content, ctx)
  e.style.fontSize = '14px'
  return e
}
