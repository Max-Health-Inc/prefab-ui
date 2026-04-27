/**
 * Interactive component renderers — Tabs, Accordion, Dialog, Popover, Tooltip, etc.
 */

import { registerComponent, renderChildren, renderNode, resolveStr, el } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerInteractiveComponents(): void {
  registerComponent('Tabs', renderTabs)
  registerComponent('Tab', renderTab)
  registerComponent('Accordion', renderAccordion)
  registerComponent('AccordionItem', renderAccordionItem)
  registerComponent('Dialog', renderDialog)
  registerComponent('Popover', renderPopover)
  registerComponent('Tooltip', renderTooltip)
  registerComponent('HoverCard', renderHoverCard)
  registerComponent('Carousel', renderCarousel)
}

function renderTabs(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-tabs')
  const tabBar = el('div', 'pf-tabs-bar')
  tabBar.setAttribute('role', 'tablist')
  tabBar.style.display = 'flex'
  tabBar.style.gap = '4px'
  tabBar.style.marginBottom = '12px'

  const panels: HTMLElement[] = []
  const buttons: HTMLButtonElement[] = []

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const tab = node.children[i]
      const tabId = `pf-tab-${Math.random().toString(36).slice(2, 8)}`
      const panelId = `pf-panel-${Math.random().toString(36).slice(2, 8)}`

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'pf-tab-trigger'
      btn.textContent = (tab.title as string | undefined) ?? `Tab ${i + 1}`
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false')
      btn.setAttribute('aria-controls', panelId)
      btn.id = tabId
      btn.tabIndex = i === 0 ? 0 : -1
      btn.style.padding = '8px 16px'
      btn.style.border = 'none'
      btn.style.background = 'none'
      btn.style.cursor = 'pointer'
      btn.style.borderBottom = '2px solid transparent'
      btn.style.marginBottom = '-2px'
      btn.style.fontSize = '14px'

      const panel = el('div', 'pf-tab-panel')
      panel.style.display = i === 0 ? 'block' : 'none'
      panel.setAttribute('role', 'tabpanel')
      panel.setAttribute('aria-labelledby', tabId)
      panel.id = panelId
      panel.tabIndex = 0
      renderChildren(tab, panel, ctx)

      btn.addEventListener('click', () => {
        activateTab(i)
      })

      if (i === 0) {
        btn.classList.add('pf-tab-active')
        btn.style.fontWeight = '600'
      }

      buttons.push(btn)
      panels.push(panel)
      tabBar.appendChild(btn)
    }
  }

  // Shared tab activation
  function activateTab(index: number): void {
    panels.forEach(p => p.style.display = 'none')
    buttons.forEach(b => {
      b.style.borderBottomColor = 'transparent'
      b.style.fontWeight = 'normal'
      b.classList.remove('pf-tab-active')
      b.setAttribute('aria-selected', 'false')
      b.tabIndex = -1
    })
    panels[index].style.display = 'block'
    buttons[index].classList.add('pf-tab-active')
    buttons[index].style.fontWeight = '600'
    buttons[index].setAttribute('aria-selected', 'true')
    buttons[index].tabIndex = 0
    buttons[index].focus()
  }

  // Keyboard navigation (arrow keys)
  tabBar.addEventListener('keydown', (e) => {
    const current = buttons.indexOf(e.target as HTMLButtonElement)
    if (current < 0) return
    let next: number
    if (e.key === 'ArrowRight') next = (current + 1) % buttons.length
    else if (e.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = buttons.length - 1
    else return
    e.preventDefault()
    activateTab(next)
  })

  wrapper.appendChild(tabBar)
  for (const panel of panels) wrapper.appendChild(panel)
  return wrapper
}

function renderTab(node: ComponentNode, ctx: RenderContext): HTMLElement {
  // Tabs handles Tab children directly; standalone fallback
  const e = el('div', 'pf-tab')
  renderChildren(node, e, ctx)
  return e
}

function renderAccordion(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-accordion')
  renderChildren(node, e, ctx)
  return e
}

function renderAccordionItem(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-accordion-item')

  const contentId = `pf-acc-${Math.random().toString(36).slice(2, 8)}`

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'pf-accordion-trigger'
  trigger.textContent = (node.title as string | undefined) ?? ''
  trigger.setAttribute('aria-expanded', 'false')
  trigger.setAttribute('aria-controls', contentId)
  trigger.style.width = '100%'
  trigger.style.textAlign = 'left'
  trigger.style.padding = '12px 0'
  trigger.style.border = 'none'
  trigger.style.background = 'none'
  trigger.style.cursor = 'pointer'
  trigger.style.fontSize = '14px'
  trigger.style.fontWeight = '500'

  const content = el('div', 'pf-accordion-content')
  content.id = contentId
  content.setAttribute('role', 'region')
  content.setAttribute('aria-labelledby', trigger.id)
  content.style.display = 'none'
  content.style.paddingBottom = '12px'
  renderChildren(node, content, ctx)

  trigger.addEventListener('click', () => {
    const open = content.style.display !== 'none'
    content.style.display = open ? 'none' : 'block'
    trigger.setAttribute('aria-expanded', open ? 'false' : 'true')
  })

  wrapper.appendChild(trigger)
  wrapper.appendChild(content)
  return wrapper
}

function renderDialog(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-dialog-wrapper')

  // Trigger button
  if (node.trigger != null) {
    const triggerEl = renderNode(node.trigger as ComponentNode, ctx) as HTMLElement
    triggerEl.addEventListener('click', () => {
      dialog.showModal()
    })
    wrapper.appendChild(triggerEl)
  }

  const dialog = document.createElement('dialog')
  dialog.className = 'pf-dialog'
  dialog.setAttribute('aria-modal', 'true')
  dialog.style.maxWidth = '500px'
  dialog.style.width = '100%'
  dialog.style.padding = '24px'

  if (node.title != null) {
    const title = el('h2', 'pf-dialog-title')
    title.textContent = resolveStr(node.title, ctx)
    title.id = `pf-dialog-title-${Math.random().toString(36).slice(2, 8)}`
    dialog.setAttribute('aria-labelledby', title.id)
    dialog.appendChild(title)
  }

  if (node.description != null) {
    const desc = el('p', 'pf-dialog-desc')
    desc.textContent = resolveStr(node.description, ctx)
    dialog.appendChild(desc)
  }

  const body = el('div', 'pf-dialog-body')
  renderChildren(node, body, ctx)
  dialog.appendChild(body)

  if (node.dismissible !== false) {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close()
    })
  }

  // Listen for close-overlay events
  document.addEventListener('prefab:close-overlay', () => dialog.close())

  wrapper.appendChild(dialog)
  return wrapper
}

function renderPopover(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-popover')
  wrapper.style.position = 'relative'
  wrapper.style.display = 'inline-block'

  const content = el('div', 'pf-popover-content')
  content.style.display = 'none'
  content.style.position = 'absolute'
  content.style.zIndex = '50'
  content.style.padding = '12px'
  content.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)'

  if (node.title != null) {
    const title = el('div', 'pf-popover-title')
    title.textContent = resolveStr(node.title, ctx)
    title.style.fontWeight = '600'
    title.style.marginBottom = '4px'
    content.appendChild(title)
  }

  renderChildren(node, content, ctx)

  wrapper.addEventListener('click', (e) => {
    // Don't toggle if the click originated inside the content
    if (content.contains(e.target as Node) && content.style.display !== 'none') return
    content.style.display = content.style.display === 'none' ? 'block' : 'none'
  })

  wrapper.appendChild(content)
  return wrapper
}

function renderTooltip(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-tooltip')
  wrapper.style.position = 'relative'
  wrapper.style.display = 'inline-block'

  const tipId = `pf-tip-${Math.random().toString(36).slice(2, 8)}`
  const tip = el('div', 'pf-tooltip-content')
  tip.id = tipId
  tip.setAttribute('role', 'tooltip')
  tip.textContent = resolveStr(node.content ?? '', ctx)
  tip.style.display = 'none'
  tip.style.position = 'absolute'
  tip.style.bottom = '100%'
  tip.style.left = '50%'
  tip.style.transform = 'translateX(-50%)'
  tip.style.padding = '4px 8px'
  tip.style.borderRadius = '4px'
  tip.style.color = '#fff'
  tip.style.fontSize = '12px'
  tip.style.whiteSpace = 'nowrap'
  tip.style.zIndex = '50'

  renderChildren(node, wrapper, ctx)
  wrapper.setAttribute('aria-describedby', tipId)

  wrapper.addEventListener('mouseenter', () => { tip.style.display = 'block' })
  wrapper.addEventListener('mouseleave', () => { tip.style.display = 'none' })
  wrapper.addEventListener('focus', () => { tip.style.display = 'block' }, true)
  wrapper.addEventListener('blur', () => { tip.style.display = 'none' }, true)

  wrapper.appendChild(tip)
  return wrapper
}

function renderHoverCard(node: ComponentNode, ctx: RenderContext): HTMLElement {
  // Similar to popover but triggered on hover
  const wrapper = el('div', 'pf-hover-card')
  wrapper.style.position = 'relative'
  wrapper.style.display = 'inline-block'

  const content = el('div', 'pf-hover-card-content')
  content.style.display = 'none'
  content.style.position = 'absolute'
  content.style.zIndex = '50'
  content.style.padding = '16px'
  content.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  content.style.minWidth = '200px'

  renderChildren(node, content, ctx)

  wrapper.addEventListener('mouseenter', () => { content.style.display = 'block' })
  wrapper.addEventListener('mouseleave', () => { content.style.display = 'none' })

  wrapper.appendChild(content)
  return wrapper
}

function renderCarousel(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-carousel')
  wrapper.style.position = 'relative'
  wrapper.style.overflow = 'hidden'
  wrapper.setAttribute('role', 'region')
  wrapper.setAttribute('aria-roledescription', 'carousel')
  wrapper.setAttribute('aria-label', resolveStr(node.label ?? 'Carousel', ctx))

  const track = el('div', 'pf-carousel-track')
  track.style.display = 'flex'
  track.style.transition = 'transform 0.3s ease'
  renderChildren(node, track, ctx)

  // Style children as slides
  let current = 0
  const slideCount = node.children?.length ?? 0

  const prev = document.createElement('button')
  prev.type = 'button'
  prev.textContent = '‹'
  prev.className = 'pf-carousel-prev'
  prev.setAttribute('aria-label', 'Previous slide')
  prev.style.position = 'absolute'
  prev.style.left = '4px'
  prev.style.top = '50%'
  prev.style.transform = 'translateY(-50%)'
  prev.style.zIndex = '10'

  const next = document.createElement('button')
  next.type = 'button'
  next.textContent = '›'
  next.className = 'pf-carousel-next'
  next.setAttribute('aria-label', 'Next slide')
  next.style.position = 'absolute'
  next.style.right = '4px'
  next.style.top = '50%'
  next.style.transform = 'translateY(-50%)'
  next.style.zIndex = '10'

  const update = (): void => {
    track.style.transform = `translateX(-${current * 100}%)`
  }

  prev.addEventListener('click', () => {
    if (slideCount === 0) return
    current = Math.max(0, current - 1)
    update()
  })

  next.addEventListener('click', () => {
    if (slideCount === 0) return
    current = Math.min(slideCount - 1, current + 1)
    update()
  })

  wrapper.appendChild(track)
  wrapper.appendChild(prev)
  wrapper.appendChild(next)
  return wrapper
}
