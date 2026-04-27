/**
 * Form component renderers — Form, Input, Button, Select, Checkbox, Switch, Slider.
 */

import { registerComponent, renderChildren, renderNode, resolveStr, el, makeDispatchCtx } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'
import { dispatchActions } from '../actions.js'
import type { ActionJSON } from '../actions.js'

export function registerFormComponents(): void {
  registerComponent('Form', renderForm)
  registerComponent('Input', renderInput)
  registerComponent('Textarea', renderTextarea)
  registerComponent('Button', renderButton)
  registerComponent('ButtonGroup', renderButtonGroup)
  registerComponent('Select', renderSelect)
  registerComponent('SelectOption', renderSelectOption)
  registerComponent('SelectGroup', renderContainerDiv('pf-select-group'))
  registerComponent('SelectLabel', renderTextSpan('pf-select-label'))
  registerComponent('SelectSeparator', renderSeparatorHr)
  registerComponent('Checkbox', renderCheckbox)
  registerComponent('Switch', renderSwitch)
  registerComponent('Slider', renderSlider)
  registerComponent('Radio', renderRadio)
  registerComponent('RadioGroup', renderRadioGroup)
  registerComponent('Combobox', renderCombobox)
  registerComponent('ComboboxOption', renderComboboxOption)
  registerComponent('ComboboxGroup', renderContainerDiv('pf-combobox-group'))
  registerComponent('ComboboxLabel', renderTextSpan('pf-combobox-label'))
  registerComponent('ComboboxSeparator', renderSeparatorHr)
  registerComponent('Calendar', renderCalendar)
  registerComponent('DatePicker', renderDatePicker)
  registerComponent('Field', renderContainerDiv('pf-field'))
  registerComponent('FieldTitle', renderTextSpan('pf-field-title'))
  registerComponent('FieldDescription', renderTextSpan('pf-field-description'))
  registerComponent('FieldContent', renderContainerDiv('pf-field-content'))
  registerComponent('FieldError', renderTextSpan('pf-field-error'))
  registerComponent('ChoiceCard', renderChoiceCard)
}

function renderForm(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const form = document.createElement('form')
  form.className = 'pf-form'

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    // Collect form data into state
    const data = new FormData(form)
    const values: Record<string, unknown> = {}
    data.forEach((val, key) => { values[key] = val })

    // Merge form values into state before dispatching
    ctx.store.merge(values)

    if (node.onSubmit != null) {
      const dispCtx = makeDispatchCtx(ctx)
      // Resolve form field values into tool call arguments
      dispCtx.scope = { ...ctx.scope, ...values }
      void dispatchActions(node.onSubmit as ActionJSON | ActionJSON[], dispCtx)
    }
  })

  renderChildren(node, form, ctx)
  return form
}

function renderInput(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-input-wrapper')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.gap = '4px'

  if (node.label != null) {
    const label = document.createElement('label')
    label.className = 'pf-input-label'
    label.textContent = resolveStr(node.label, ctx)
    if (node.name != null) label.htmlFor = node.name as string
    label.style.fontSize = '14px'
    label.style.fontWeight = '500'
    wrapper.appendChild(label)
  }

  const input = document.createElement('input')
  input.className = 'pf-input'
  input.type = (node.inputType as string | undefined) ?? 'text'
  if (node.name != null) input.name = node.name as string
  if (node.name != null) input.id = `pf-input-${node.name as string}`
  if (node.placeholder != null) input.placeholder = resolveStr(node.placeholder, ctx)
  if (node.required === true) {
    input.required = true
    input.setAttribute('aria-required', 'true')
  }
  if (node.error != null) input.setAttribute('aria-invalid', 'true')

  // Bind to state
  const name = node.name as string | undefined
  if (name) {
    const stateVal = ctx.store.get(name)
    if (stateVal != null) input.value = String(stateVal as string | number)
    input.addEventListener('input', () => {
      ctx.store.set(name, input.value)
      if (node.onChange != null) {
        void dispatchActions(node.onChange as ActionJSON | ActionJSON[], { ...makeDispatchCtx(ctx), scope: { ...ctx.scope, $event: input.value } })
      }
    })
  }

  applyInputStyle(input)
  wrapper.appendChild(input)
  return wrapper
}

function renderTextarea(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-textarea-wrapper')

  const textarea = document.createElement('textarea')
  textarea.className = 'pf-textarea'
  if (node.name != null) textarea.name = node.name as string
  if (node.name != null) textarea.id = `pf-textarea-${node.name as string}`
  if (node.placeholder != null) textarea.placeholder = resolveStr(node.placeholder, ctx)
  if (node.rows != null) textarea.rows = node.rows as number
  if (node.required === true) textarea.setAttribute('aria-required', 'true')

  const name = node.name as string | undefined
  if (name != null) {
    const stateVal = ctx.store.get(name)
    if (stateVal != null) textarea.value = String(stateVal as string | number)
    textarea.addEventListener('input', () => {
      ctx.store.set(name, textarea.value)
      if (node.onChange != null) {
        void dispatchActions(node.onChange as ActionJSON | ActionJSON[], { ...makeDispatchCtx(ctx), scope: { ...ctx.scope, $event: textarea.value } })
      }
    })
  }

  applyInputStyle(textarea)
  wrapper.appendChild(textarea)
  return wrapper
}

function renderButton(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const btn = document.createElement('button')
  btn.className = 'pf-button'
  btn.type = node.submit === true ? 'submit' : 'button'
  btn.textContent = resolveStr(node.label, ctx)

  const variant = (node.variant as string | undefined) ?? 'default'
  btn.setAttribute('data-variant', variant)
  applyButtonStyle(btn, variant)

  if (node.size != null) btn.setAttribute('data-size', node.size as string)
  if (node.disabled === true) btn.disabled = true

  if (node.onClick != null) {
    btn.addEventListener('click', () => {
      void dispatchActions(node.onClick as ActionJSON | ActionJSON[], makeDispatchCtx(ctx))
    })
  }

  return btn
}

function renderButtonGroup(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-button-group')
  e.style.display = 'flex'
  e.style.gap = '8px'
  renderChildren(node, e, ctx)
  return e
}

function renderSelect(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-select-wrapper')

  const select = document.createElement('select')
  select.className = 'pf-select'
  if (node.name != null) select.name = node.name as string
  applyInputStyle(select)

  // Placeholder option
  if (node.placeholder != null) {
    const ph = document.createElement('option')
    ph.value = ''
    ph.textContent = resolveStr(node.placeholder as string, ctx)
    ph.disabled = true
    ph.selected = true
    ph.hidden = true
    select.appendChild(ph)
  }

  // Support shorthand `options` array: [{label, value}]
  const opts = node.options as { label?: string; value?: string }[] | undefined
  if (Array.isArray(opts)) {
    for (const o of opts) {
      const option = document.createElement('option')
      option.value = o.value ?? ''
      option.textContent = o.label ?? option.value
      select.appendChild(option)
    }
  }

  // Render SelectOption children
  if (node.children) {
    for (const child of node.children) {
      if (child.type === 'SelectOption') {
        const option = document.createElement('option')
        option.value = (child.value as string | undefined) ?? ''
        option.textContent = (child.label as string | undefined) ?? option.value
        select.appendChild(option)
      } else {
        select.appendChild(renderNode(child, ctx) as HTMLElement)
      }
    }
  }

  const name = node.name as string | undefined
  if (name) {
    const stateVal = ctx.store.get(name)
    if (stateVal != null) select.value = String(stateVal as string | number)
    select.addEventListener('change', () => {
      ctx.store.set(name, select.value)
      if (node.onChange != null) {
        void dispatchActions(node.onChange as ActionJSON | ActionJSON[], { ...makeDispatchCtx(ctx), scope: { ...ctx.scope, $event: select.value } })
      }
    })
  }

  wrapper.appendChild(select)
  return wrapper
}

function renderSelectOption(_node: ComponentNode, _ctx: RenderContext): HTMLElement {
  // Handled inline by renderSelect
  return el('span')
}

function renderCheckbox(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('label', 'pf-checkbox-wrapper')
  wrapper.style.display = 'flex'
  wrapper.style.alignItems = 'center'
  wrapper.style.gap = '8px'
  wrapper.style.cursor = 'pointer'

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.className = 'pf-checkbox'
  if (node.name != null) input.name = node.name as string
  if (node.checked === true) input.checked = true

  const name = node.name as string | undefined
  if (name) {
    const stateVal = ctx.store.get(name)
    if (typeof stateVal === 'boolean') input.checked = stateVal
    input.addEventListener('change', () => {
      ctx.store.set(name, input.checked)
      if (node.onChange != null) {
        void dispatchActions(node.onChange as ActionJSON | ActionJSON[], { ...makeDispatchCtx(ctx), scope: { ...ctx.scope, $event: input.checked } })
      }
    })
  }

  wrapper.appendChild(input)
  if (node.label != null) {
    const span = el('span')
    span.textContent = resolveStr(node.label, ctx)
    wrapper.appendChild(span)
  }

  return wrapper
}

function renderSwitch(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('label', 'pf-switch-wrapper')
  wrapper.style.display = 'flex'
  wrapper.style.alignItems = 'center'
  wrapper.style.gap = '8px'
  wrapper.style.cursor = 'pointer'

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.className = 'pf-switch'
  input.setAttribute('role', 'switch')
  if (node.name != null) input.name = node.name as string

  const name = node.name as string | undefined
  if (name) {
    const stateVal = ctx.store.get(name)
    if (typeof stateVal === 'boolean') input.checked = stateVal
    input.addEventListener('change', () => {
      ctx.store.set(name, input.checked)
      if (node.onChange != null) {
        void dispatchActions(node.onChange as ActionJSON | ActionJSON[], { ...makeDispatchCtx(ctx), scope: { ...ctx.scope, $event: input.checked } })
      }
    })
  }

  wrapper.appendChild(input)
  if (node.label != null) {
    const span = el('span')
    span.textContent = resolveStr(node.label, ctx)
    wrapper.appendChild(span)
  }

  return wrapper
}

function renderSlider(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-slider-wrapper')

  const input = document.createElement('input')
  input.type = 'range'
  input.className = 'pf-slider'
  if (node.name != null) input.name = node.name as string
  if (node.min != null) input.min = String(node.min as string | number)
  if (node.max != null) input.max = String(node.max as string | number)
  if (node.step != null) input.step = String(node.step as string | number)

  const name = node.name as string | undefined
  if (name) {
    const stateVal = ctx.store.get(name)
    if (stateVal != null) input.value = String(stateVal as string | number)
    input.addEventListener('input', () => {
      ctx.store.set(name, Number(input.value))
      if (node.onChange != null) {
        void dispatchActions(node.onChange as ActionJSON | ActionJSON[], { ...makeDispatchCtx(ctx), scope: { ...ctx.scope, $event: Number(input.value) } })
      }
    })
  }

  wrapper.appendChild(input)
  return wrapper
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyInputStyle(e: HTMLElement): void {
  e.style.padding = '8px 12px'
  e.style.border = '1px solid var(--border, #d1d5db)'
  e.style.borderRadius = 'var(--radius, 6px)'
  e.style.fontSize = '14px'
  e.style.width = '100%'
  e.style.boxSizing = 'border-box'
}

function applyButtonStyle(btn: HTMLButtonElement, variant: string): void {
  btn.style.padding = '8px 16px'
  btn.style.borderRadius = 'var(--radius, 6px)'
  btn.style.fontSize = '14px'
  btn.style.fontWeight = '500'
  btn.style.cursor = 'pointer'
  btn.style.border = 'none'

  const styles: Record<string, { bg: string; fg: string }> = {
    default: { bg: 'var(--primary, #3b82f6)', fg: '#fff' },
    secondary: { bg: 'var(--secondary, #f3f4f6)', fg: 'var(--secondary-foreground, #1f2937)' },
    destructive: { bg: 'var(--destructive, #ef4444)', fg: '#fff' },
    outline: { bg: 'transparent', fg: 'inherit' },
    ghost: { bg: 'transparent', fg: 'inherit' },
    link: { bg: 'transparent', fg: 'var(--primary, #3b82f6)' },
  }
  const s = styles[variant] ?? styles.default
  btn.style.backgroundColor = s.bg
  btn.style.color = s.fg
  if (variant === 'outline') btn.style.border = '1px solid var(--border, #d1d5db)'
}

// ── Generic helpers for simple container/text renderers ──────────────────────

function renderContainerDiv(className: string): (node: ComponentNode, ctx: RenderContext) => HTMLElement {
  return (node, ctx) => {
    const e = el('div', className)
    renderChildren(node, e, ctx)
    return e
  }
}

function renderTextSpan(className: string): (node: ComponentNode, ctx: RenderContext) => HTMLElement {
  return (node, ctx) => {
    const e = el('span', className)
    e.textContent = resolveStr(node.content, ctx)
    return e
  }
}

function renderSeparatorHr(): HTMLElement {
  const hr = document.createElement('hr')
  hr.className = 'pf-separator'
  hr.style.border = 'none'
  hr.style.borderTop = '1px solid var(--border, #e5e7eb)'
  hr.style.margin = '4px 0'
  return hr
}

// ── Radio ────────────────────────────────────────────────────────────────────

function renderRadio(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const label = el('label', 'pf-radio')
  label.style.display = 'flex'
  label.style.alignItems = 'center'
  label.style.gap = '8px'
  label.style.cursor = 'pointer'

  const input = document.createElement('input')
  input.type = 'radio'
  input.value = resolveStr(node.value, ctx)
  label.appendChild(input)

  if (node.label != null) {
    const text = el('span', 'pf-radio-label')
    text.textContent = resolveStr(node.label, ctx)
    label.appendChild(text)
  }

  return label
}

// ── RadioGroup ───────────────────────────────────────────────────────────────

function renderRadioGroup(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('fieldset', 'pf-radio-group')
  e.style.border = 'none'
  e.style.padding = '0'
  e.style.display = 'flex'
  e.style.flexDirection = 'column'
  e.style.gap = '8px'

  if (node.label != null) {
    const legend = document.createElement('legend')
    legend.textContent = resolveStr(node.label, ctx)
    legend.style.fontWeight = '500'
    legend.style.marginBottom = '4px'
    e.appendChild(legend)
  }

  renderChildren(node, e, ctx)

  // Wire up name attribute on child radios and pre-select from state
  const name = resolveStr(node.name, ctx)
  const stateVal = ctx.store.get(name)
  for (const radio of Array.from(e.querySelectorAll('input[type="radio"]'))) {
    ;(radio as HTMLInputElement).name = name
    if (stateVal != null && (radio as HTMLInputElement).value === String(stateVal as string | number)) {
      ;(radio as HTMLInputElement).checked = true
    }
  }

  e.addEventListener('change', (evt) => {
    const target = evt.target as HTMLInputElement
    if (target.type === 'radio') {
      ctx.store.set(name, target.value)
      if (node.onChange != null) {
        void dispatchActions(node.onChange as ActionJSON | ActionJSON[], makeDispatchCtx(ctx))
      }
    }
  })

  return e
}

// ── Combobox ─────────────────────────────────────────────────────────────────

function renderCombobox(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-combobox')
  const input = document.createElement('input')
  input.className = 'pf-combobox-input'
  input.type = 'text'
  input.name = resolveStr(node.name, ctx)
  if (node.placeholder != null) input.placeholder = resolveStr(node.placeholder, ctx)
  if (node.value !== undefined) input.value = resolveStr(node.value, ctx)
  // Read initial value from state
  const cbName = input.name
  const cbStateVal = ctx.store.get(cbName)
  if (cbStateVal != null) input.value = String(cbStateVal as string | number)

  input.style.padding = '6px 12px'
  input.style.borderRadius = '6px'
  input.style.border = '1px solid var(--border, #d1d5db)'
  input.style.width = '100%'
  input.style.boxSizing = 'border-box'

  const dropdown = el('div', 'pf-combobox-dropdown')
  dropdown.style.display = 'none'
  dropdown.style.position = 'absolute'
  dropdown.style.background = 'var(--popover, #fff)'
  dropdown.style.border = '1px solid var(--border, #d1d5db)'
  dropdown.style.borderRadius = '6px'
  dropdown.style.maxHeight = '200px'
  dropdown.style.overflowY = 'auto'
  dropdown.style.zIndex = '50'
  renderChildren(node, dropdown, ctx)

  input.addEventListener('focus', () => { dropdown.style.display = 'block' })
  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none' }, 150)
  })
  if (node.searchable !== false) {
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase()
      for (const opt of Array.from(dropdown.querySelectorAll('.pf-combobox-option'))) {
        const text = (opt as HTMLElement).textContent.toLowerCase()
        ;(opt as HTMLElement).style.display = text.includes(q) ? '' : 'none'
      }
    })
  }

  // Listen for option selection (custom event from ComboboxOption)
  if (node.onChange != null) {
    e.addEventListener('pf-combobox-select', () => {
      void dispatchActions(node.onChange as ActionJSON | ActionJSON[], { ...makeDispatchCtx(ctx), scope: { ...ctx.scope, $event: input.value } })
    })
  }

  e.style.position = 'relative'
  e.appendChild(input)
  e.appendChild(dropdown)
  return e
}

function renderComboboxOption(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-combobox-option')
  e.style.padding = '6px 12px'
  e.style.cursor = 'pointer'
  e.textContent = resolveStr(node.label ?? node.value, ctx)
  e.dataset.value = resolveStr(node.value, ctx)
  e.addEventListener('mousedown', () => {
    const combobox = e.closest('.pf-combobox')
    const input = combobox?.querySelector('input') as HTMLInputElement | null
    if (input) {
      input.value = e.dataset.value ?? ''
      ctx.store.set(input.name, input.value)
      combobox?.dispatchEvent(new CustomEvent('pf-combobox-select', { bubbles: false }))
    }
  })
  return e
}

// ── Calendar ─────────────────────────────────────────────────────────────────

function renderCalendar(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-calendar')
  const input = document.createElement('input')
  input.type = 'date'
  input.name = resolveStr(node.name, ctx)
  if (node.value !== undefined) input.value = resolveStr(node.value, ctx)
  // Read initial value from state
  const calName = input.name
  const calStateVal = ctx.store.get(calName)
  if (calStateVal != null) input.value = String(calStateVal as string | number)
  if (node.minDate != null) input.min = resolveStr(node.minDate, ctx)
  if (node.maxDate != null) input.max = resolveStr(node.maxDate, ctx)
  input.style.padding = '6px 12px'
  input.style.borderRadius = '6px'
  input.style.border = '1px solid var(--border, #d1d5db)'

  input.addEventListener('change', () => {
    ctx.store.set(input.name, input.value)
    if (node.onChange != null) {
      void dispatchActions(node.onChange as ActionJSON | ActionJSON[], makeDispatchCtx(ctx))
    }
  })

  e.appendChild(input)
  return e
}

// ── DatePicker ───────────────────────────────────────────────────────────────

function renderDatePicker(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-datepicker')
  const input = document.createElement('input')
  input.type = 'date'
  input.name = resolveStr(node.name, ctx)
  if (node.placeholder != null) input.placeholder = resolveStr(node.placeholder, ctx)
  if (node.value !== undefined) input.value = resolveStr(node.value, ctx)
  // Read initial value from state
  const dpName = input.name
  const dpStateVal = ctx.store.get(dpName)
  if (dpStateVal != null) input.value = String(dpStateVal as string | number)
  if (node.minDate != null) input.min = resolveStr(node.minDate, ctx)
  if (node.maxDate != null) input.max = resolveStr(node.maxDate, ctx)
  input.style.padding = '6px 12px'
  input.style.borderRadius = '6px'
  input.style.border = '1px solid var(--border, #d1d5db)'
  input.style.width = '100%'
  input.style.boxSizing = 'border-box'

  input.addEventListener('change', () => {
    ctx.store.set(input.name, input.value)
    if (node.onChange != null) {
      void dispatchActions(node.onChange as ActionJSON | ActionJSON[], makeDispatchCtx(ctx))
    }
  })

  e.appendChild(input)
  return e
}

// ── ChoiceCard ───────────────────────────────────────────────────────────────

function renderChoiceCard(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-choice-card')
  e.style.border = '2px solid var(--border, #d1d5db)'
  e.style.borderRadius = '8px'
  e.style.padding = '16px'
  e.style.cursor = 'pointer'
  e.style.transition = 'border-color 0.2s'
  e.dataset.value = resolveStr(node.value, ctx)

  if (node.selected === true) {
    e.dataset.selected = 'true'
    e.style.borderColor = 'var(--primary, #3b82f6)'
    e.style.backgroundColor = 'var(--accent, #eff6ff)'
  }

  if (node.label != null) {
    const title = el('div', 'pf-choice-card-label')
    title.textContent = resolveStr(node.label, ctx)
    title.style.fontWeight = '600'
    e.appendChild(title)
  }
  if (node.description != null) {
    const desc = el('div', 'pf-choice-card-description')
    desc.textContent = resolveStr(node.description, ctx)
    desc.style.fontSize = '14px'
    desc.style.color = 'var(--muted-foreground, #6b7280)'
    e.appendChild(desc)
  }

  renderChildren(node, e, ctx)

  if (node.onClick != null) {
    e.addEventListener('click', () => {
      void dispatchActions(node.onClick as ActionJSON | ActionJSON[], makeDispatchCtx(ctx))
    })
  }

  return e
}
