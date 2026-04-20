/**
 * Form components — Form, Input, Button, Select, Checkbox, etc.
 */

import { Component, ContainerComponent, StatefulComponent } from '../../core/component.js'
import type { ContainerProps, ComponentProps, StatefulProps, RxStr } from '../../core/component.js'
import type { Action, ActionJSON } from '../../actions/types.js'

// ── Form ─────────────────────────────────────────────────────────────────────

export interface FormProps extends ContainerProps {
  onSubmit: Action | Action[]
}

export function Form(props: FormProps): ContainerComponent {
  const c = new ContainerComponent('Form', props)
  c['getProps'] = () => ({
    onSubmit: Array.isArray(props.onSubmit)
      ? props.onSubmit.map(a => a.toJSON())
      : props.onSubmit.toJSON(),
  })
  return c
}

// ── Input ────────────────────────────────────────────────────────────────────

export interface InputProps extends StatefulProps {
  label?: string
  placeholder?: string
  inputType?: string
  required?: boolean
}

export function Input(props: InputProps): StatefulComponent {
  const c = new StatefulComponent('Input', props)
  const origGetProps = c['getProps'].bind(c)
  c['getProps'] = () => ({
    ...origGetProps(),
    ...(props.label && { label: props.label }),
    ...(props.placeholder && { placeholder: props.placeholder }),
    ...(props.inputType && { inputType: props.inputType }),
    ...(props.required && { required: true }),
  })
  return c
}

// ── Textarea ─────────────────────────────────────────────────────────────────

export interface TextareaProps extends StatefulProps {
  placeholder?: string
  rows?: number
}

export function Textarea(props: TextareaProps): StatefulComponent {
  const c = new StatefulComponent('Textarea', props)
  const origGetProps = c['getProps'].bind(c)
  c['getProps'] = () => ({
    ...origGetProps(),
    ...(props.placeholder && { placeholder: props.placeholder }),
    ...(props.rows !== undefined && { rows: props.rows }),
  })
  return c
}

// ── Button ───────────────────────────────────────────────────────────────────

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends ComponentProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  onClick?: Action | Action[]
}

export function Button(label: RxStr, props?: ButtonProps): Component {
  const c = new Component('Button', props)
  c['getProps'] = () => {
    const p: Record<string, unknown> = { label: String(label) }
    if (props?.variant) p.variant = props.variant
    if (props?.size) p.size = props.size
    if (props?.disabled) p.disabled = true
    if (props?.onClick) {
      p.onClick = Array.isArray(props.onClick)
        ? props.onClick.map((a: Action) => a.toJSON())
        : props.onClick.toJSON()
    }
    return p
  }
  return c
}

// ── ButtonGroup ──────────────────────────────────────────────────────────────

export function ButtonGroup(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('ButtonGroup', props)
}

// ── Select + SelectOption ────────────────────────────────────────────────────

export function Select(props: StatefulProps & { children?: Component[] }): ContainerComponent {
  const c = new ContainerComponent('Select', props) as ContainerComponent & StatefulComponent
  // Merge stateful props
  c['getProps'] = () => ({
    name: props.name,
    ...(props.value !== undefined && { value: props.value }),
    ...(props.onChange && {
      onChange: Array.isArray(props.onChange)
        ? props.onChange.map((a: Action) => a.toJSON())
        : props.onChange.toJSON(),
    }),
  })
  return c
}

export function SelectOption(value: string, label?: string, props?: ComponentProps): Component {
  const c = new Component('SelectOption', props)
  c['getProps'] = () => ({ value, label: label ?? value })
  return c
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

export interface CheckboxProps extends StatefulProps {
  label?: string
  checked?: boolean
}

export function Checkbox(props: CheckboxProps): StatefulComponent {
  const c = new StatefulComponent('Checkbox', props)
  const origGetProps = c['getProps'].bind(c)
  c['getProps'] = () => ({
    ...origGetProps(),
    ...(props.label && { label: props.label }),
    ...(props.checked !== undefined && { checked: props.checked }),
  })
  return c
}

// ── Switch ───────────────────────────────────────────────────────────────────

export interface SwitchProps extends StatefulProps {
  label?: string
}

export function Switch(props: SwitchProps): StatefulComponent {
  const c = new StatefulComponent('Switch', props)
  const origGetProps = c['getProps'].bind(c)
  c['getProps'] = () => ({
    ...origGetProps(),
    ...(props.label && { label: props.label }),
  })
  return c
}

// ── Slider ───────────────────────────────────────────────────────────────────

export interface SliderProps extends StatefulProps {
  min?: number
  max?: number
  step?: number
}

export function Slider(props: SliderProps): StatefulComponent {
  const c = new StatefulComponent('Slider', props)
  const origGetProps = c['getProps'].bind(c)
  c['getProps'] = () => ({
    ...origGetProps(),
    ...(props.min !== undefined && { min: props.min }),
    ...(props.max !== undefined && { max: props.max }),
    ...(props.step !== undefined && { step: props.step }),
  })
  return c
}
