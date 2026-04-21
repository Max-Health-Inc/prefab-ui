/**
 * Renderer tests — Interactive components (Tabs, Accordion, Dialog, Tooltip, etc.)
 *
 * @happy-dom
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Store } from '../src/renderer/state'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { registerAllComponents } from '../src/renderer/components/index'
import { createNoopTransport } from '../src/renderer/transport'

beforeEach(() => { registerAllComponents() })

function makeCtx(state?: Record<string, unknown>): RenderContext {
  return {
    store: new Store(state),
    scope: {},
    transport: createNoopTransport(),
    rerender: () => {},
  }
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

describe('Tabs', () => {
  function makeTabs(): ComponentNode {
    return {
      type: 'Tabs',
      children: [
        { type: 'Tab', title: 'Tab 1', children: [{ type: 'Text', content: 'Content 1' }] },
        { type: 'Tab', title: 'Tab 2', children: [{ type: 'Text', content: 'Content 2' }] },
        { type: 'Tab', title: 'Tab 3', children: [{ type: 'Text', content: 'Content 3' }] },
      ],
    }
  }

  it('renders tab bar with role=tablist', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tablist = dom.querySelector('[role="tablist"]')
    expect(tablist).toBeTruthy()
  })

  it('renders tab buttons with role=tab', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tabs = dom.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(3)
  })

  it('first tab is selected by default', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tabs = dom.querySelectorAll('[role="tab"]')
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(tabs[1].getAttribute('aria-selected')).toBe('false')
  })

  it('first panel is visible, others hidden', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const panels = dom.querySelectorAll('[role="tabpanel"]')
    expect((panels[0] as HTMLElement).style.display).toBe('block')
    expect((panels[1] as HTMLElement).style.display).toBe('none')
    expect((panels[2] as HTMLElement).style.display).toBe('none')
  })

  it('clicking second tab activates it', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tabs = dom.querySelectorAll('[role="tab"]')
    const panels = dom.querySelectorAll('[role="tabpanel"]')

    ;(tabs[1] as HTMLElement).click()

    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
    expect(tabs[0].getAttribute('aria-selected')).toBe('false')
    expect((panels[1] as HTMLElement).style.display).toBe('block')
    expect((panels[0] as HTMLElement).style.display).toBe('none')
  })

  it('ArrowRight moves to next tab', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tablist = dom.querySelector('[role="tablist"]')!
    const tabs = dom.querySelectorAll('[role="tab"]')

    // Focus on first tab, press ArrowRight
    tablist.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
    }))
    // Note: keydown target needs to be the button itself
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    Object.defineProperty(event, 'target', { value: tabs[0] })
    tablist.dispatchEvent(event)

    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
  })

  it('ArrowLeft wraps to last tab', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tablist = dom.querySelector('[role="tablist"]')!
    const tabs = dom.querySelectorAll('[role="tab"]')

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    Object.defineProperty(event, 'target', { value: tabs[0] })
    tablist.dispatchEvent(event)

    expect(tabs[2].getAttribute('aria-selected')).toBe('true')
  })

  it('Home key activates first tab', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tablist = dom.querySelector('[role="tablist"]')!
    const tabs = dom.querySelectorAll('[role="tab"]')

    // First activate tab 2
    ;(tabs[2] as HTMLElement).click()
    expect(tabs[2].getAttribute('aria-selected')).toBe('true')

    // Press Home
    const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
    Object.defineProperty(event, 'target', { value: tabs[2] })
    tablist.dispatchEvent(event)

    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('End key activates last tab', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tablist = dom.querySelector('[role="tablist"]')!
    const tabs = dom.querySelectorAll('[role="tab"]')

    const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true })
    Object.defineProperty(event, 'target', { value: tabs[0] })
    tablist.dispatchEvent(event)

    expect(tabs[2].getAttribute('aria-selected')).toBe('true')
  })

  it('panels have aria-labelledby pointing to tab button', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tabs = dom.querySelectorAll('[role="tab"]')
    const panels = dom.querySelectorAll('[role="tabpanel"]')

    expect(panels[0].getAttribute('aria-labelledby')).toBe(tabs[0].id)
    expect(panels[1].getAttribute('aria-labelledby')).toBe(tabs[1].id)
  })

  it('tab buttons have aria-controls pointing to panel', () => {
    const dom = renderNode(makeTabs(), makeCtx()) as HTMLElement
    const tabs = dom.querySelectorAll('[role="tab"]')
    const panels = dom.querySelectorAll('[role="tabpanel"]')

    expect(tabs[0].getAttribute('aria-controls')).toBe(panels[0].id)
    expect(tabs[1].getAttribute('aria-controls')).toBe(panels[1].id)
  })
})

// ── Accordion ────────────────────────────────────────────────────────────────

describe('Accordion', () => {
  function makeAccordion(): ComponentNode {
    return {
      type: 'Accordion',
      children: [
        { type: 'AccordionItem', title: 'Section 1', children: [{ type: 'Text', content: 'Body 1' }] },
        { type: 'AccordionItem', title: 'Section 2', children: [{ type: 'Text', content: 'Body 2' }] },
      ],
    }
  }

  it('renders accordion items collapsed by default', () => {
    const dom = renderNode(makeAccordion(), makeCtx()) as HTMLElement
    const contents = dom.querySelectorAll('.pf-accordion-content')
    for (const content of Array.from(contents)) {
      expect((content as HTMLElement).style.display).toBe('none')
    }
  })

  it('trigger buttons have aria-expanded=false', () => {
    const dom = renderNode(makeAccordion(), makeCtx()) as HTMLElement
    const triggers = dom.querySelectorAll('.pf-accordion-trigger')
    for (const trigger of Array.from(triggers)) {
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    }
  })

  it('clicking trigger expands content', () => {
    const dom = renderNode(makeAccordion(), makeCtx()) as HTMLElement
    const triggers = dom.querySelectorAll('.pf-accordion-trigger')
    const contents = dom.querySelectorAll('.pf-accordion-content')

    ;(triggers[0] as HTMLElement).click()

    expect((contents[0] as HTMLElement).style.display).toBe('block')
    expect(triggers[0].getAttribute('aria-expanded')).toBe('true')
    // Second item stays collapsed
    expect((contents[1] as HTMLElement).style.display).toBe('none')
  })

  it('clicking again collapses content', () => {
    const dom = renderNode(makeAccordion(), makeCtx()) as HTMLElement
    const triggers = dom.querySelectorAll('.pf-accordion-trigger')
    const contents = dom.querySelectorAll('.pf-accordion-content')

    ;(triggers[0] as HTMLElement).click() // expand
    ;(triggers[0] as HTMLElement).click() // collapse

    expect((contents[0] as HTMLElement).style.display).toBe('none')
    expect(triggers[0].getAttribute('aria-expanded')).toBe('false')
  })

  it('trigger has aria-controls pointing to content', () => {
    const dom = renderNode(makeAccordion(), makeCtx()) as HTMLElement
    const triggers = dom.querySelectorAll('.pf-accordion-trigger')
    const contents = dom.querySelectorAll('.pf-accordion-content')

    const controlsId = triggers[0].getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(contents[0].id).toBe(controlsId!)
  })
})

// ── Dialog ───────────────────────────────────────────────────────────────────

describe('Dialog', () => {
  it('renders dialog element with aria-modal', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Dialog',
      title: 'Confirm',
      children: [{ type: 'Text', content: 'Are you sure?' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const dialog = dom.querySelector('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog!.getAttribute('aria-modal')).toBe('true')
  })

  it('has aria-labelledby pointing to title', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Dialog',
      title: 'My Dialog',
      children: [{ type: 'Text', content: 'Content' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const dialog = dom.querySelector('dialog') as HTMLElement
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const titleEl = dom.querySelector(`#${labelId}`)
    expect(titleEl).toBeTruthy()
    expect(titleEl!.textContent).toBe('My Dialog')
  })

  it('renders trigger button that opens dialog', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Dialog',
      title: 'Test',
      trigger: { type: 'Button', label: 'Open' },
      children: [{ type: 'Text', content: 'Inside' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const btn = dom.querySelector('button')
    expect(btn).toBeTruthy()
    expect(btn!.textContent).toBe('Open')
  })
})

// ── Tooltip ──────────────────────────────────────────────────────────────────

describe('Tooltip', () => {
  it('renders trigger and hidden content', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Tooltip',
      content: 'Tooltip text',
      children: [{ type: 'Button', label: 'Hover me' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.textContent).toContain('Hover me')
  })
})

// ── Carousel ─────────────────────────────────────────────────────────────────

describe('Carousel', () => {
  it('renders carousel with navigation buttons', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Carousel',
      children: [
        { type: 'Text', content: 'Slide 1' },
        { type: 'Text', content: 'Slide 2' },
        { type: 'Text', content: 'Slide 3' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.className).toContain('pf-carousel')
    // Should have prev/next buttons
    const buttons = dom.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })
})

// ── ExpandableRow ────────────────────────────────────────────────────────────

describe('ExpandableRow', () => {
  it('renders collapsed by default', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'ExpandableRow',
      summary: [{ type: 'Text', content: 'Row title' }],
      children: [{ type: 'Text', content: 'Detail content' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const detail = dom.querySelector('.pf-expandable-row-detail') as HTMLElement
    expect(detail.style.display).toBe('none')
  })

  it('clicking summary expands detail', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'ExpandableRow',
      summary: [{ type: 'Text', content: 'Row title' }],
      children: [{ type: 'Text', content: 'Detail content' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const summary = dom.querySelector('.pf-expandable-row-summary') as HTMLElement
    const detail = dom.querySelector('.pf-expandable-row-detail') as HTMLElement

    summary.click()
    expect(detail.style.display).toBe('block')
  })

  it('clicking again collapses detail', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'ExpandableRow',
      summary: [{ type: 'Text', content: 'Row title' }],
      children: [{ type: 'Text', content: 'Detail content' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const summary = dom.querySelector('.pf-expandable-row-summary') as HTMLElement
    const detail = dom.querySelector('.pf-expandable-row-detail') as HTMLElement

    summary.click() // expand
    summary.click() // collapse
    expect(detail.style.display).toBe('none')
  })
})
