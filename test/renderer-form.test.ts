/**
 * Renderer tests — Form components rendering and prop coverage.
 *
 * Tests DOM output for RadioGroup, Combobox, Calendar, DatePicker, ChoiceCard,
 * Field compound, ButtonGroup, Button variants, Input props, Slider attrs, etc.
 * @happy-dom
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Store } from '../src/renderer/state'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { registerAllComponents } from '../src/renderer/components/index'
import { createNoopTransport } from '../src/renderer/transport'

beforeEach(() => { registerAllComponents() })

function makeCtx(state?: Record<string, unknown>): RenderContext & { rerendered: number } {
  const ctx = {
    store: new Store(state),
    scope: {},
    transport: createNoopTransport(),
    rerender: () => { ctx.rerendered++ },
    rerendered: 0,
  }
  return ctx
}

// ── Button variants & size ───────────────────────────────────────────────────

describe('Button rendering', () => {
  it('sets data-variant attribute', () => {
    const ctx = makeCtx()
    const btn = renderNode({ type: 'Button', label: 'Go', variant: 'destructive' } as ComponentNode, ctx) as HTMLButtonElement
    expect(btn.getAttribute('data-variant')).toBe('destructive')
  })

  it('defaults variant to default', () => {
    const ctx = makeCtx()
    const btn = renderNode({ type: 'Button', label: 'Go' } as ComponentNode, ctx) as HTMLButtonElement
    expect(btn.getAttribute('data-variant')).toBe('default')
  })

  it('sets data-size attribute', () => {
    const ctx = makeCtx()
    const btn = renderNode({ type: 'Button', label: 'Go', size: 'lg' } as ComponentNode, ctx) as HTMLButtonElement
    expect(btn.getAttribute('data-size')).toBe('lg')
  })

  it('outline variant has border style', () => {
    const ctx = makeCtx()
    const btn = renderNode({ type: 'Button', label: 'Go', variant: 'outline' } as ComponentNode, ctx) as HTMLButtonElement
    expect(btn.style.border).toContain('1px solid')
  })
})

// ── Input prop rendering ─────────────────────────────────────────────────────

describe('Input rendering', () => {
  it('renders label element linked by htmlFor', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Input', name: 'email', label: 'Email Address' } as ComponentNode, ctx) as HTMLElement
    const label = dom.querySelector('label')!
    expect(label).toBeTruthy()
    expect(label.textContent).toBe('Email Address')
    expect(label.htmlFor).toBe('email')
  })

  it('sets placeholder attribute', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Input', name: 'search', placeholder: 'Search...' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    expect(input.placeholder).toBe('Search...')
  })

  it('sets input type from inputType prop', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Input', name: 'pass', inputType: 'password' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    expect(input.type).toBe('password')
  })

  it('defaults input type to text', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Input', name: 'name' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    expect(input.type).toBe('text')
  })

  it('sets required and aria-required', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Input', name: 'email', required: true } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    expect(input.required).toBe(true)
    expect(input.getAttribute('aria-required')).toBe('true')
  })

  it('sets aria-invalid when error is present', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Input', name: 'email', error: 'Invalid email' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })
})

// ── Textarea rendering ───────────────────────────────────────────────────────

describe('Textarea rendering', () => {
  it('sets placeholder attribute', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Textarea', name: 'bio', placeholder: 'About you' } as ComponentNode, ctx) as HTMLElement
    const textarea = dom.querySelector('textarea')!
    expect(textarea.placeholder).toBe('About you')
  })

  it('sets rows attribute', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Textarea', name: 'bio', rows: 8 } as ComponentNode, ctx) as HTMLElement
    const textarea = dom.querySelector('textarea')!
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- HappyDOM returns string
    expect(Number(textarea.rows)).toBe(8)
  })
})

// ── Slider attribute rendering ───────────────────────────────────────────────

describe('Slider rendering', () => {
  it('sets min, max, step attributes', () => {
    const ctx = makeCtx({ vol: 50 })
    const dom = renderNode({ type: 'Slider', name: 'vol', min: 10, max: 200, step: 5 } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="range"]') as HTMLInputElement
    expect(input.min).toBe('10')
    expect(input.max).toBe('200')
    expect(input.step).toBe('5')
  })

  it('sets name attribute', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Slider', name: 'brightness' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="range"]') as HTMLInputElement
    expect(input.name).toBe('brightness')
  })
})

// ── Checkbox label rendering ─────────────────────────────────────────────────

describe('Checkbox rendering', () => {
  it('renders label text next to checkbox', () => {
    const ctx = makeCtx({ agree: false })
    const dom = renderNode({ type: 'Checkbox', name: 'agree', label: 'I agree to terms' } as ComponentNode, ctx) as HTMLElement
    const span = dom.querySelector('span')!
    expect(span.textContent).toBe('I agree to terms')
  })
})

// ── Switch label rendering ───────────────────────────────────────────────────

describe('Switch rendering', () => {
  it('renders label text next to switch', () => {
    const ctx = makeCtx({ notify: false })
    const dom = renderNode({ type: 'Switch', name: 'notify', label: 'Enable notifications' } as ComponentNode, ctx) as HTMLElement
    const span = dom.querySelector('span')!
    expect(span.textContent).toBe('Enable notifications')
  })
})

// ── RadioGroup ───────────────────────────────────────────────────────────────

describe('RadioGroup rendering', () => {
  const radioGroupNode: ComponentNode = {
    type: 'RadioGroup',
    name: 'size',
    label: 'Select size',
    children: [
      { type: 'Radio', value: 'sm', label: 'Small' },
      { type: 'Radio', value: 'md', label: 'Medium' },
      { type: 'Radio', value: 'lg', label: 'Large' },
    ],
  }

  it('renders as fieldset with legend', () => {
    const ctx = makeCtx({})
    const dom = renderNode(radioGroupNode, ctx) as HTMLElement
    expect(dom.tagName).toBe('FIELDSET')
    const legend = dom.querySelector('legend')!
    expect(legend.textContent).toBe('Select size')
  })

  it('child radios share name attribute', () => {
    const ctx = makeCtx({})
    const dom = renderNode(radioGroupNode, ctx) as HTMLElement
    const radios = dom.querySelectorAll('input[type="radio"]')
    expect(radios.length).toBe(3)
    for (const radio of Array.from(radios)) {
      expect((radio as HTMLInputElement).name).toBe('size')
    }
  })

  it('syncs selection to store on change', () => {
    const ctx = makeCtx({ size: '' })
    const dom = renderNode(radioGroupNode, ctx) as HTMLElement
    const radio = dom.querySelectorAll('input[type="radio"]')[1] as HTMLInputElement

    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('size')).toBe('md')
  })

  it('dispatches onChange action', () => {
    const ctx = makeCtx({ size: '', changed: false })
    const node: ComponentNode = {
      ...radioGroupNode,
      onChange: { action: 'setState', key: 'changed', value: true },
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const radio = dom.querySelectorAll('input[type="radio"]')[0] as HTMLInputElement

    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('changed')).toBe(true)
  })
})

// ── Radio rendering ──────────────────────────────────────────────────────────

describe('Radio rendering', () => {
  it('renders as label with radio input and text', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'Radio', value: 'yes', label: 'Yes' } as ComponentNode, ctx) as HTMLElement
    expect(dom.tagName).toBe('LABEL')
    const input = dom.querySelector('input[type="radio"]') as HTMLInputElement
    expect(input.value).toBe('yes')
    const span = dom.querySelector('span')!
    expect(span.textContent).toBe('Yes')
  })
})

// ── Combobox ─────────────────────────────────────────────────────────────────

describe('Combobox rendering', () => {
  const comboboxNode: ComponentNode = {
    type: 'Combobox',
    name: 'country',
    placeholder: 'Select country',
    searchable: true,
    children: [
      { type: 'ComboboxOption', value: 'us', label: 'United States' },
      { type: 'ComboboxOption', value: 'de', label: 'Germany' },
      { type: 'ComboboxOption', value: 'fr', label: 'France' },
    ],
  }

  it('renders input with placeholder', () => {
    const ctx = makeCtx({})
    const dom = renderNode(comboboxNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    expect(input.placeholder).toBe('Select country')
    expect(input.name).toBe('country')
  })

  it('dropdown is hidden by default', () => {
    const ctx = makeCtx({})
    const dom = renderNode(comboboxNode, ctx) as HTMLElement
    const dropdown = dom.querySelector('.pf-combobox-dropdown') as HTMLElement
    expect(dropdown.style.display).toBe('none')
  })

  it('dropdown shows on focus', () => {
    const ctx = makeCtx({})
    const dom = renderNode(comboboxNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    input.dispatchEvent(new Event('focus', { bubbles: true }))
    const dropdown = dom.querySelector('.pf-combobox-dropdown') as HTMLElement
    expect(dropdown.style.display).toBe('block')
  })

  it('renders all options', () => {
    const ctx = makeCtx({})
    const dom = renderNode(comboboxNode, ctx) as HTMLElement
    const options = dom.querySelectorAll('.pf-combobox-option')
    expect(options.length).toBe(3)
    expect((options[0] as HTMLElement).textContent).toBe('United States')
    expect((options[0] as HTMLElement).dataset.value).toBe('us')
  })

  it('filters options on input when searchable', () => {
    const ctx = makeCtx({})
    const dom = renderNode(comboboxNode, ctx) as HTMLElement
    const input = dom.querySelector('input')!

    input.value = 'ger'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const options = dom.querySelectorAll('.pf-combobox-option')
    expect((options[0] as HTMLElement).style.display).toBe('none') // United States
    expect((options[1] as HTMLElement).style.display).toBe('')     // Germany
    expect((options[2] as HTMLElement).style.display).toBe('none') // France
  })

  it('mousedown on option syncs to store', () => {
    const ctx = makeCtx({})
    const dom = renderNode(comboboxNode, ctx) as HTMLElement
    // Append to document so .closest() works
    document.body.appendChild(dom)

    const option = dom.querySelectorAll('.pf-combobox-option')[1] as HTMLElement
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ctx.store.get('country')).toBe('de')

    document.body.removeChild(dom)
  })
})

// ── Calendar ─────────────────────────────────────────────────────────────────

describe('Calendar rendering', () => {
  it('renders date input with min/max constraints', () => {
    const ctx = makeCtx({})
    const dom = renderNode({
      type: 'Calendar', name: 'start', minDate: '2026-01-01', maxDate: '2026-12-31',
    } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement
    expect(input.name).toBe('start')
    expect(input.min).toBe('2026-01-01')
    expect(input.max).toBe('2026-12-31')
  })

  it('syncs date value to store on change', () => {
    const ctx = makeCtx({ start: '' })
    const dom = renderNode({ type: 'Calendar', name: 'start' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement

    input.value = '2026-06-15'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('start')).toBe('2026-06-15')
  })

  it('dispatches onChange action', () => {
    const ctx = makeCtx({ start: '', changed: false })
    const dom = renderNode({
      type: 'Calendar', name: 'start',
      onChange: { action: 'setState', key: 'changed', value: true },
    } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement

    input.value = '2026-03-01'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('changed')).toBe(true)
  })
})

// ── DatePicker ───────────────────────────────────────────────────────────────

describe('DatePicker rendering', () => {
  it('renders date input with placeholder and constraints', () => {
    const ctx = makeCtx({})
    const dom = renderNode({
      type: 'DatePicker', name: 'dob', placeholder: 'YYYY-MM-DD',
      minDate: '1900-01-01', maxDate: '2026-12-31',
    } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement
    expect(input.name).toBe('dob')
    expect(input.placeholder).toBe('YYYY-MM-DD')
    expect(input.min).toBe('1900-01-01')
    expect(input.max).toBe('2026-12-31')
  })

  it('syncs value to store on change', () => {
    const ctx = makeCtx({ dob: '' })
    const dom = renderNode({ type: 'DatePicker', name: 'dob' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement

    input.value = '1990-05-20'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('dob')).toBe('1990-05-20')
  })

  it('dispatches onChange action', () => {
    const ctx = makeCtx({ dob: '', changed: false })
    const dom = renderNode({
      type: 'DatePicker', name: 'dob',
      onChange: { action: 'setState', key: 'changed', value: true },
    } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement

    input.value = '2000-01-01'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('changed')).toBe(true)
  })
})

// ── ChoiceCard ───────────────────────────────────────────────────────────────

describe('ChoiceCard rendering', () => {
  it('renders with value, label, and description', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'ChoiceCard', value: 'pro', label: 'Pro Plan', description: '$29/mo',
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.className).toBe('pf-choice-card')
    expect(dom.dataset.value).toBe('pro')
    const label = dom.querySelector('.pf-choice-card-label')!
    expect(label.textContent).toBe('Pro Plan')
    const desc = dom.querySelector('.pf-choice-card-description')!
    expect(desc.textContent).toBe('$29/mo')
  })

  it('sets data-selected when selected', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'ChoiceCard', value: 'pro', label: 'Pro', selected: true,
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.dataset.selected).toBe('true')
  })

  it('does not set data-selected when not selected', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'ChoiceCard', value: 'basic',
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.dataset.selected).toBeUndefined()
  })

  it('does not apply selected styling when selected=false', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'ChoiceCard', value: 'basic', selected: false,
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.dataset.selected).toBeUndefined()
  })

  it('dispatches onClick action', async () => {
    const ctx = makeCtx({ plan: '' })
    const dom = renderNode({
      type: 'ChoiceCard', value: 'pro',
      onClick: { action: 'setState', key: 'plan', value: 'pro' },
    } as ComponentNode, ctx) as HTMLElement

    dom.click()
    await new Promise(r => queueMicrotask(r))
    expect(ctx.store.get('plan')).toBe('pro')
  })
})

// ── Field compound ───────────────────────────────────────────────────────────

describe('Field compound rendering', () => {
  it('renders title, description, content, and error spans', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'Field',
      children: [
        { type: 'FieldTitle', content: 'Email' },
        { type: 'FieldDescription', content: 'Your work email address' },
        { type: 'FieldContent', children: [{ type: 'Input', name: 'email' }] },
        { type: 'FieldError', content: 'Required field' },
      ],
    } as ComponentNode, ctx) as HTMLElement

    expect(dom.className).toBe('pf-field')
    expect(dom.querySelector('.pf-field-title')!.textContent).toBe('Email')
    expect(dom.querySelector('.pf-field-description')!.textContent).toBe('Your work email address')
    expect(dom.querySelector('.pf-field-content')!.querySelector('input')).toBeTruthy()
    expect(dom.querySelector('.pf-field-error')!.textContent).toBe('Required field')
  })
})

// ── ButtonGroup ──────────────────────────────────────────────────────────────

describe('ButtonGroup rendering', () => {
  it('renders as flex container with child buttons', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'ButtonGroup',
      children: [
        { type: 'Button', label: 'Save' },
        { type: 'Button', label: 'Cancel' },
      ],
    } as ComponentNode, ctx) as HTMLElement

    expect(dom.className).toBe('pf-button-group')
    expect(dom.style.display).toBe('flex')
    const buttons = dom.querySelectorAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].textContent).toBe('Save')
    expect(buttons[1].textContent).toBe('Cancel')
  })
})

// ── SelectGroup / SelectLabel / SelectSeparator ──────────────────────────────

describe('Select sub-components rendering', () => {
  it('SelectLabel renders text span', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'SelectLabel', content: 'Category' } as ComponentNode, ctx) as HTMLElement
    expect(dom.tagName).toBe('SPAN')
    expect(dom.className).toBe('pf-select-label')
    expect(dom.textContent).toBe('Category')
  })

  it('SelectSeparator renders hr', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'SelectSeparator' } as ComponentNode, ctx) as HTMLElement
    expect(dom.tagName).toBe('HR')
    expect(dom.className).toBe('pf-separator')
  })

  it('SelectGroup renders container div', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'SelectGroup',
      children: [{ type: 'SelectLabel', content: 'Fruits' }],
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.className).toBe('pf-select-group')
    expect(dom.querySelector('.pf-select-label')!.textContent).toBe('Fruits')
  })
})

// ── ComboboxGroup / ComboboxLabel / ComboboxSeparator ────────────────────────

describe('Combobox sub-components rendering', () => {
  it('ComboboxLabel renders text span', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'ComboboxLabel', content: 'Popular' } as ComponentNode, ctx) as HTMLElement
    expect(dom.tagName).toBe('SPAN')
    expect(dom.className).toBe('pf-combobox-label')
    expect(dom.textContent).toBe('Popular')
  })

  it('ComboboxSeparator renders hr', () => {
    const ctx = makeCtx()
    const dom = renderNode({ type: 'ComboboxSeparator' } as ComponentNode, ctx) as HTMLElement
    expect(dom.tagName).toBe('HR')
    expect(dom.className).toBe('pf-separator')
  })

  it('ComboboxGroup renders container div', () => {
    const ctx = makeCtx()
    const dom = renderNode({
      type: 'ComboboxGroup',
      children: [{ type: 'ComboboxLabel', content: 'Top' }],
    } as ComponentNode, ctx) as HTMLElement
    expect(dom.className).toBe('pf-combobox-group')
    expect(dom.querySelector('.pf-combobox-label')!.textContent).toBe('Top')
  })
})

// ── Form with array onSubmit ─────────────────────────────────────────────────

describe('Form array onSubmit', () => {
  it('dispatches multiple actions on submit', async () => {
    const ctx = makeCtx({ submitted: false, count: 0 })
    const node: ComponentNode = {
      type: 'Form',
      onSubmit: [
        { action: 'setState', key: 'submitted', value: true },
        { action: 'setState', key: 'count', value: 1 },
      ],
      children: [
        { type: 'Button', label: 'Submit', submit: true },
      ],
    }
    const form = renderNode(node, ctx) as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise(r => queueMicrotask(r))
    expect(ctx.store.get('submitted')).toBe(true)
    expect(ctx.store.get('count')).toBe(1)
  })
})

// ── Bug: missing onChange dispatch ───────────────────────────────────────────
// These tests verify that onChange actions fire for all stateful components.
// Input has onChange; Textarea, Checkbox, Switch, Slider were missing it.

describe('Textarea onChange action', () => {
  it('dispatches onChange action on input', () => {
    const ctx = makeCtx({ bio: '', lastEvent: '' })
    const node: ComponentNode = {
      type: 'Textarea', name: 'bio',
      onChange: { action: 'setState', key: 'lastEvent', value: 'changed' },
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const textarea = dom.querySelector('textarea')!
    textarea.value = 'Hello'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    expect(ctx.store.get('lastEvent')).toBe('changed')
  })
})

describe('Checkbox onChange action', () => {
  it('dispatches onChange action on change', () => {
    const ctx = makeCtx({ agree: false, lastEvent: '' })
    const node: ComponentNode = {
      type: 'Checkbox', name: 'agree', label: 'I agree',
      onChange: { action: 'setState', key: 'lastEvent', value: 'toggled' },
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input[type="checkbox"]') as HTMLInputElement
    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('lastEvent')).toBe('toggled')
  })
})

describe('Switch onChange action', () => {
  it('dispatches onChange action on change', () => {
    const ctx = makeCtx({ darkMode: false, lastEvent: '' })
    const node: ComponentNode = {
      type: 'Switch', name: 'darkMode', label: 'Dark mode',
      onChange: { action: 'setState', key: 'lastEvent', value: 'switched' },
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input')!
    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(ctx.store.get('lastEvent')).toBe('switched')
  })
})

describe('Slider onChange action', () => {
  it('dispatches onChange action on input', () => {
    const ctx = makeCtx({ vol: 50, lastEvent: '' })
    const node: ComponentNode = {
      type: 'Slider', name: 'vol', min: 0, max: 100,
      onChange: { action: 'setState', key: 'lastEvent', value: 'slid' },
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const input = dom.querySelector('input[type="range"]') as HTMLInputElement
    input.value = '80'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(ctx.store.get('lastEvent')).toBe('slid')
  })
})

describe('Combobox onChange action', () => {
  it('dispatches onChange action on option select', () => {
    const ctx = makeCtx({ lastEvent: '' })
    const node: ComponentNode = {
      type: 'Combobox', name: 'country',
      onChange: { action: 'setState', key: 'lastEvent', value: 'selected' },
      children: [
        { type: 'ComboboxOption', value: 'us', label: 'United States' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    document.body.appendChild(dom)
    const option = dom.querySelector('.pf-combobox-option') as HTMLElement
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ctx.store.get('lastEvent')).toBe('selected')
    document.body.removeChild(dom)
  })
})

// ── Bug: missing initial state for RadioGroup ────────────────────────────────

describe('RadioGroup initial state', () => {
  it('pre-selects radio matching state value', () => {
    const ctx = makeCtx({ size: 'md' })
    const node: ComponentNode = {
      type: 'RadioGroup', name: 'size', label: 'Size',
      children: [
        { type: 'Radio', value: 'sm', label: 'Small' },
        { type: 'Radio', value: 'md', label: 'Medium' },
        { type: 'Radio', value: 'lg', label: 'Large' },
      ],
    }
    const dom = renderNode(node, ctx) as HTMLElement
    const radios = dom.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>
    expect(radios[0].checked).toBe(false)
    expect(radios[1].checked).toBe(true)  // 'md' should be pre-selected
    expect(radios[2].checked).toBe(false)
  })
})

// ── Bug: Calendar/DatePicker don't read initial value from state ─────────────

describe('Calendar initial state', () => {
  it('reads initial value from store', () => {
    const ctx = makeCtx({ appt: '2026-06-15' })
    const dom = renderNode({ type: 'Calendar', name: 'appt' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement
    expect(input.value).toBe('2026-06-15')
  })
})

describe('DatePicker initial state', () => {
  it('reads initial value from store', () => {
    const ctx = makeCtx({ dob: '1990-05-20' })
    const dom = renderNode({ type: 'DatePicker', name: 'dob' } as ComponentNode, ctx) as HTMLElement
    const input = dom.querySelector('input[type="date"]') as HTMLInputElement
    expect(input.value).toBe('1990-05-20')
  })
})
