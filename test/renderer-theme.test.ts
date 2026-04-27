/**
 * Renderer theme tests — verify components don't use inline styles for
 * theme-sensitive properties that should be handled by prefab.css classes.
 *
 * The renderer should rely on CSS classes (pf-card, pf-alert, etc.) for
 * background-color, color, border-color, and border-radius. Inline styles
 * override the stylesheet and prevent [data-theme] from cascading correctly.
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

/**
 * Theme-sensitive CSS properties that should NOT appear in inline styles
 * when they reference theme CSS variables.
 */
const THEME_PROPERTIES = [
  'background-color',
  'background',
  'border',
  'border-color',
  'border-top',
  'border-bottom',
  'border-left',
  'border-right',
  'border-radius',
  'color',
]

/** Theme CSS variable patterns that indicate the style should come from the stylesheet */
function hasThemeVariable(value: string): boolean {
  return /var\(--(border|card|background|foreground|primary|secondary|muted|accent|destructive|success|warning|ring|input|radius|popover|card-foreground|muted-foreground|popover-foreground|secondary-foreground|primary-bg)/.test(value)
}

function getThemeInlineStyles(element: HTMLElement): string[] {
  const violations: string[] = []
  const style = element.style

  for (const prop of THEME_PROPERTIES) {
    const value = style.getPropertyValue(prop)
    if (value && hasThemeVariable(value)) {
      violations.push(`${prop}: ${value}`)
    }
  }

  const camelMap: Record<string, string> = {
    backgroundColor: 'background-color',
    borderColor: 'border-color',
    borderRadius: 'border-radius',
    borderTop: 'border-top',
    borderBottom: 'border-bottom',
    borderBottomColor: 'border-bottom-color',
  }

  for (const [camel, css] of Object.entries(camelMap)) {
    const value = (style as unknown as Record<string, string>)[camel]
    if (value && hasThemeVariable(value)) {
      if (!violations.some(v => v.startsWith(css))) {
        violations.push(`${css}: ${value}`)
      }
    }
  }

  return violations
}

function collectAllElements(root: HTMLElement): HTMLElement[] {
  const elements: HTMLElement[] = [root]
  const walk = (el: HTMLElement) => {
    for (const child of Array.from(el.children)) {
      if (child instanceof HTMLElement) {
        elements.push(child)
        walk(child)
      }
    }
  }
  walk(root)
  return elements
}

/** Collect violations across all elements in a rendered tree */
function collectViolations(dom: HTMLElement): string[] {
  const allEls = collectAllElements(dom)
  const violations: string[] = []
  for (const el of allEls) {
    const v = getThemeInlineStyles(el)
    if (v.length) violations.push(`<${el.tagName.toLowerCase()} class="${el.className}">: ${v.join(', ')}`)
  }
  return violations
}

// ── Card ─────────────────────────────────────────────────────────────────────

describe('Theme: Card', () => {
  it('should not inline background-color with var(--card)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Card',
      children: [{ type: 'CardContent', children: [{ type: 'Text', content: 'Hello' }] }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline border with var(--border)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Card', children: [] }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.style.border).toBe('')
  })

  it('should not inline border-radius with var(--radius)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Card', children: [] }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.style.borderRadius).toBe('')
  })

  it('should have the pf-card class', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Card', children: [] }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.classList.contains('pf-card')).toBe(true)
  })
})

// ── Alert ────────────────────────────────────────────────────────────────────

describe('Theme: Alert', () => {
  it('should not inline theme-variable styles on default alert', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Alert',
      variant: 'default',
      children: [{ type: 'AlertTitle', content: 'Info' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline border/color on destructive alert', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Alert',
      variant: 'destructive',
      children: [{ type: 'AlertTitle', content: 'Error' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should set data-variant for styling via CSS', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Alert', variant: 'destructive', children: [] }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.getAttribute('data-variant')).toBe('destructive')
  })
})

// ── DataTable ────────────────────────────────────────────────────────────────

describe('Theme: DataTable', () => {
  it('should not inline border styles with var(--border) on cells', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'DataTable',
      columns: [{ key: 'name', header: 'Name' }],
      rows: [{ name: 'Alice' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline background on selected rows', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'DataTable',
      columns: [{ key: 'name', header: 'Name' }],
      rows: [{ name: 'Alice' }, { name: 'Bob' }],
      selectable: true,
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Badge ────────────────────────────────────────────────────────────────────

describe('Theme: Badge', () => {
  it('should not inline background/color with theme variables on default badge', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Badge', label: 'Test', variant: 'default' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline on secondary badge', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Badge', label: 'Sec', variant: 'secondary' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline on destructive badge', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Badge', label: 'Err', variant: 'destructive' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline outline badge border with var(--border)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Badge', label: 'Outline', variant: 'outline' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should set data-variant for CSS styling', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Badge', label: 'X', variant: 'secondary' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.getAttribute('data-variant')).toBe('secondary')
  })
})

// ── Separator ────────────────────────────────────────────────────────────────

describe('Theme: Separator', () => {
  it('should not inline border with var(--border)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Separator' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Button ───────────────────────────────────────────────────────────────────

describe('Theme: Button', () => {
  it('should not inline background/color with theme variables on default button', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Button', label: 'Click', variant: 'default' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline on secondary button', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Button', label: 'Sec', variant: 'secondary' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline on destructive button', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Button', label: 'Del', variant: 'destructive' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline border on outline button', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Button', label: 'Click', variant: 'outline' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline color on link button', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Button', label: 'Link', variant: 'link' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should set data-variant for CSS styling', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Button', label: 'X', variant: 'outline' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(dom.getAttribute('data-variant')).toBe('outline')
  })
})

// ── Metric ───────────────────────────────────────────────────────────────────

describe('Theme: Metric', () => {
  it('should not inline color with var(--muted-foreground) on label', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Metric', label: 'Users', value: '100' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline on metric with description', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Metric', label: 'Rev', value: '$1M', description: 'YTD' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Tabs ─────────────────────────────────────────────────────────────────────

describe('Theme: Tabs', () => {
  it('should not inline border on tab bar with var(--border)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Tabs',
      name: 'tabs',
      children: [
        { type: 'Tab', title: 'One', children: [{ type: 'Text', content: 'Content 1' }] },
        { type: 'Tab', title: 'Two', children: [{ type: 'Text', content: 'Content 2' }] },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline active tab indicator with var(--primary)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Tabs',
      name: 'tabs2',
      children: [
        { type: 'Tab', title: 'A', children: [{ type: 'Text', content: '1' }] },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const triggers = dom.querySelectorAll('.pf-tab-trigger')
    for (const trigger of triggers) {
      const violations = getThemeInlineStyles(trigger as HTMLElement)
      expect(violations).toEqual([])
    }
  })
})

// ── Progress ─────────────────────────────────────────────────────────────────

describe('Theme: Progress', () => {
  it('should not inline background with var(--muted) or var(--primary)', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Progress', value: 50 }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Table (structured) ───────────────────────────────────────────────────────

describe('Theme: Table', () => {
  it('should not inline border on TableHeader cells', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Table',
      children: [
        { type: 'TableHead', children: [
          { type: 'TableRow', children: [
            { type: 'TableHeader', content: 'Name' },
          ] },
        ] },
        { type: 'TableBody', children: [
          { type: 'TableRow', children: [
            { type: 'TableCell', children: [{ type: 'Text', content: 'Alice' }] },
          ] },
        ] },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline color on TableCaption', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Table',
      children: [
        { type: 'TableCaption', content: 'A caption' },
        { type: 'TableBody', children: [] },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Form inputs ──────────────────────────────────────────────────────────────

describe('Theme: Form inputs', () => {
  it('should not inline border on TextInput', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'TextInput', name: 'email', label: 'Email' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline border on Select', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Select',
      name: 'fruit',
      label: 'Fruit',
      options: [{ value: 'a', label: 'Apple' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })

  it('should not inline border on Textarea', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Textarea', name: 'bio', label: 'Bio' }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Dialog ───────────────────────────────────────────────────────────────────

describe('Theme: Dialog', () => {
  it('should not inline border/radius/color on dialog', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Dialog',
      title: 'Confirm',
      children: [{ type: 'Text', content: 'Are you sure?' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Popover ──────────────────────────────────────────────────────────────────

describe('Theme: Popover', () => {
  it('should not inline border/bg with theme vars on popover content', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Popover',
      children: [{ type: 'Text', content: 'Popover content' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── HoverCard ────────────────────────────────────────────────────────────────

describe('Theme: HoverCard', () => {
  it('should not inline border/bg/radius on hover card content', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'HoverCard',
      children: [{ type: 'Text', content: 'Hover content' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Accordion ────────────────────────────────────────────────────────────────

describe('Theme: Accordion', () => {
  it('should not inline border on accordion items', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Accordion',
      children: [
        { type: 'AccordionItem', title: 'Section 1', children: [{ type: 'Text', content: 'Body' }] },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Tooltip ──────────────────────────────────────────────────────────────────

describe('Theme: Tooltip', () => {
  it('should not inline bg with var(--popover) on tooltip', () => {
    const ctx = makeCtx()
    const node: ComponentNode = {
      type: 'Tooltip',
      content: 'Hint text',
      children: [{ type: 'Text', content: 'Hover me' }],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    expect(collectViolations(dom)).toEqual([])
  })
})

// ── Ring (SVG) ───────────────────────────────────────────────────────────────
// SVG presentation attributes (setAttribute) cascade correctly with CSS custom
// properties — unlike HTML inline styles, they DON'T override class selectors.
// So using var(--primary) etc. in SVG stroke attributes is the correct approach.

describe('Theme: Ring', () => {
  it('should use theme vars in SVG stroke for theme awareness', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Ring', value: 75 }
    const dom = renderNode(node, ctx) as HTMLElement
    const circles = dom.querySelectorAll('circle')
    expect(circles.length).toBe(2)
    // bg circle uses --muted, fg circle uses --primary
    expect(circles[0].getAttribute('stroke')).toContain('var(--muted')
    expect(circles[1].getAttribute('stroke')).toContain('var(--primary')
  })
})

// ── Sparkline (SVG) ──────────────────────────────────────────────────────────

describe('Theme: Sparkline', () => {
  it('should use theme vars in SVG stroke for theme awareness', () => {
    const ctx = makeCtx()
    const node: ComponentNode = { type: 'Sparkline', data: [10, 20, 30, 25, 40] }
    const dom = renderNode(node, ctx) as HTMLElement
    const polylines = dom.querySelectorAll('polyline')
    expect(polylines.length).toBe(1)
    expect(polylines[0].getAttribute('stroke')).toContain('var(--primary')
  })
})

// ── Theme Toggle ─────────────────────────────────────────────────────────────

import { createThemeToggle } from '../src/renderer/theme'

describe('Theme Toggle', () => {
  it('should inject a toggle button into the root element', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const cleanup = createThemeToggle(root)
    const btn = root.querySelector('.pf-theme-toggle')
    expect(btn).not.toBeNull()
    expect(btn?.tagName).toBe('BUTTON')
    cleanup()
    root.remove()
  })

  it('should set data-theme on root and documentElement', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const cleanup = createThemeToggle(root, { storageKey: 'test-theme-toggle-1' })
    const theme = root.getAttribute('data-theme')
    expect(theme === 'light' || theme === 'dark').toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe(theme)
    cleanup()
    root.remove()
  })

  it('should toggle between light and dark on click', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const cleanup = createThemeToggle(root, { storageKey: 'test-theme-toggle-2' })
    const btn = root.querySelector('.pf-theme-toggle') as HTMLElement
    const initial = root.getAttribute('data-theme')!
    btn.click()
    const toggled = root.getAttribute('data-theme')
    expect(toggled).toBe(initial === 'dark' ? 'light' : 'dark')
    btn.click()
    expect(root.getAttribute('data-theme')).toBe(initial)
    cleanup()
    root.remove()
  })

  it('should sync when document.documentElement data-theme changes externally', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const cleanup = createThemeToggle(root, { storageKey: 'test-theme-toggle-3' })
    // Force a known state via the built-in toggle click path
    const btn = root.querySelector('.pf-theme-toggle') as HTMLElement
    // Click until we're at dark
    while (root.getAttribute('data-theme') !== 'dark') btn.click()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    // Simulate external change on <html> — MutationObserver may be async in happy-dom
    document.documentElement.setAttribute('data-theme', 'light')
    // Wait a tick for MutationObserver
    await new Promise(r => setTimeout(r, 0))
    expect(root.getAttribute('data-theme')).toBe('light')
    cleanup()
    root.remove()
  })

  it('should not sync document when syncDocument is false', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    document.documentElement.removeAttribute('data-theme')
    const cleanup = createThemeToggle(root, { syncDocument: false, storageKey: 'test-theme-toggle-4' })
    // The toggle should set data-theme on root but NOT on documentElement
    const rootTheme = root.getAttribute('data-theme')
    expect(rootTheme === 'light' || rootTheme === 'dark').toBe(true)
    // documentElement should not have been set by the toggle
    // (it may have been set by earlier tests, so just verify the click doesn't sync)
    const btn = root.querySelector('.pf-theme-toggle') as HTMLElement
    const before = document.documentElement.getAttribute('data-theme')
    btn.click()
    expect(document.documentElement.getAttribute('data-theme')).toBe(before)
    cleanup()
    root.remove()
  })

  it('should remove button and observer on cleanup', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const cleanup = createThemeToggle(root, { storageKey: 'test-theme-toggle-5' })
    expect(root.querySelector('.pf-theme-toggle')).not.toBeNull()
    cleanup()
    expect(root.querySelector('.pf-theme-toggle')).toBeNull()
    root.remove()
  })

  it('should show moon icon for dark and sun icon for light', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const cleanup = createThemeToggle(root, { storageKey: 'test-theme-toggle-6' })
    const btn = root.querySelector('.pf-theme-toggle') as HTMLElement

    // Force dark
    root.setAttribute('data-theme', 'light')
    btn.click() // toggles from the current root theme
    // After clicking from light → dark, should show moon
    if (root.getAttribute('data-theme') === 'dark') {
      expect(btn.innerHTML).toContain('21.752') // moon path fragment
    }
    btn.click() // dark → light, should show sun
    if (root.getAttribute('data-theme') === 'light') {
      expect(btn.innerHTML).toContain('M12 3v2.25') // sun path fragment
    }

    cleanup()
    root.remove()
  })

  it('should respect position option', () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const cleanup = createThemeToggle(root, { position: 'bottom-left', storageKey: 'test-theme-toggle-7' })
    const btn = root.querySelector('.pf-theme-toggle') as HTMLElement
    expect(btn.style.bottom).toBe('8px')
    expect(btn.style.left).toBe('8px')
    cleanup()
    root.remove()
  })
})
