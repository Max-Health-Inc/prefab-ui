/**
 * Table component renderers — Table, TableHead, TableBody, TableRow, etc.
 */

import { registerComponent, renderChildren, renderNode, resolveStr, el } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerTableComponents(): void {
  registerComponent('Table', renderTable)
  registerComponent('TableHead', renderTableSection('thead'))
  registerComponent('TableBody', renderTableSection('tbody'))
  registerComponent('TableFooter', renderTableSection('tfoot'))
  registerComponent('TableRow', renderTableRow)
  registerComponent('TableHeader', renderTableHeader)
  registerComponent('TableCell', renderTableCell)
  registerComponent('TableCaption', renderTableCaption)
  registerComponent('ExpandableRow', renderExpandableRow)
}

function renderTable(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const table = document.createElement('table')
  table.className = 'pf-table'
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'
  renderChildren(node, table, ctx)
  return table
}

function renderTableSection(tag: string): (node: ComponentNode, ctx: RenderContext) => HTMLElement {
  return (node, ctx) => {
    const e = document.createElement(tag)
    e.className = `pf-${tag}`
    renderChildren(node, e, ctx)
    return e
  }
}

function renderTableRow(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const tr = document.createElement('tr')
  tr.className = 'pf-table-row'
  renderChildren(node, tr, ctx)
  return tr
}

function renderTableHeader(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const th = document.createElement('th')
  th.className = 'pf-table-header'
  th.style.textAlign = 'left'
  th.style.padding = '8px 12px'
  th.style.fontWeight = '600'
  th.textContent = resolveStr(node.content, ctx)
  return th
}

function renderTableCell(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const td = document.createElement('td')
  td.className = 'pf-table-cell'
  td.style.padding = '8px 12px'
  if (node.colSpan != null) td.colSpan = node.colSpan as number
  if (node.rowSpan != null) td.rowSpan = node.rowSpan as number
  renderChildren(node, td, ctx)
  return td
}

function renderTableCaption(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const caption = document.createElement('caption')
  caption.className = 'pf-table-caption'
  caption.style.padding = '8px'
  caption.style.fontSize = '14px'
  caption.textContent = resolveStr(node.content, ctx)
  return caption
}

function renderExpandableRow(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-expandable-row')
  const summary = el('div', 'pf-expandable-row-summary')
  summary.style.cursor = 'pointer'
  summary.style.display = 'flex'
  summary.style.alignItems = 'center'
  summary.style.gap = '8px'

  const arrow = el('span', 'pf-expandable-arrow')
  arrow.textContent = '▶'
  arrow.style.transition = 'transform 0.2s'
  arrow.style.fontSize = '10px'
  summary.appendChild(arrow)

  const summaryNodes = node.summary as ComponentNode[] | undefined
  if (summaryNodes) {
    for (const sn of summaryNodes) {
      summary.appendChild(renderNode(sn, ctx))
    }
  }

  const detail = el('div', 'pf-expandable-row-detail')
  detail.style.display = 'none'
  detail.style.paddingLeft = '24px'
  renderChildren(node, detail, ctx)

  let expanded = false
  summary.addEventListener('click', () => {
    expanded = !expanded
    detail.style.display = expanded ? 'block' : 'none'
    arrow.style.transform = expanded ? 'rotate(90deg)' : ''
  })

  wrapper.appendChild(summary)
  wrapper.appendChild(detail)
  return wrapper
}
