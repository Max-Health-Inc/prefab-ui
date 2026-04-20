/**
 * autoForm — Generates a Form from field definitions that submits to an MCP tool.
 *
 * Ported from mcp-generator-3.x display_tools.py → show_form.
 */

import { type Component, type ContainerComponent } from '../core/component.js'
import { Column } from '../components/layout/index.js'
import { Heading, Muted } from '../components/typography/index.js'
import { Card, CardContent } from '../components/card/index.js'
import { Form, Input, Button } from '../components/form/index.js'
import { CallTool } from '../actions/mcp.js'
import { ShowToast } from '../actions/client.js'
import type { Action } from '../actions/types.js'

export interface AutoFormField {
  /** Field name (used as the key in submitted data). */
  name: string
  /** Display label. Defaults to humanized name. */
  label?: string
  /** Input type: 'text', 'email', 'number', 'password', 'url', etc. */
  type?: string
  /** Placeholder text. */
  placeholder?: string
  /** Whether the field is required. */
  required?: boolean
}

export interface AutoFormOptions {
  /** Form heading. */
  title?: string
  /** Optional subtitle. */
  subtitle?: string
  /** Submit button text. Default 'Submit'. */
  submitLabel?: string
  /** Custom onSubmit action. Overrides submitTool. */
  onSubmit?: Action | Action[]
  /** Success toast message. */
  successMessage?: string
  /** Error toast message. */
  errorMessage?: string
}

/**
 * Auto-generate a Form that submits to an MCP tool.
 *
 * @example
 * ```ts
 * autoForm(
 *   [
 *     { name: 'email', label: 'Email', type: 'email', required: true },
 *     { name: 'name', label: 'Full Name', required: true },
 *   ],
 *   'create_user',
 *   { title: 'Create User', submitLabel: 'Create' },
 * )
 * ```
 */
export function autoForm(
  fields: AutoFormField[],
  submitTool: string,
  options?: AutoFormOptions,
): ContainerComponent {
  const submitLabel = options?.submitLabel ?? 'Submit'
  const successMsg = options?.successMessage ?? 'Success!'
  const errorMsg = options?.errorMessage ?? 'Something went wrong'

  const onSubmit = options?.onSubmit ?? new CallTool(submitTool, {
    onSuccess: new ShowToast(successMsg, { variant: 'success' }),
    onError: new ShowToast(errorMsg, { variant: 'error' }),
  })

  const inputComponents: Component[] = fields.map(f => Input({
    name: f.name,
    label: f.label ?? humanizeFieldName(f.name),
    ...(f.type && { inputType: f.type }),
    ...(f.placeholder && { placeholder: f.placeholder }),
    ...(f.required && { required: true }),
  }))

  const formChildren = [
    Column({ gap: 4, children: [
      ...inputComponents,
      Button(submitLabel, { submit: true, cssClass: 'w-full' }),
    ] }),
  ]

  const children: Component[] = []
  if (options?.title) children.push(Heading(options.title))
  if (options?.subtitle) children.push(Muted(options.subtitle))

  children.push(Card({ children: [
    CardContent({ cssClass: 'py-4', children: [
      Form({ onSubmit, children: formChildren }),
    ] }),
  ] }))

  return Column({ gap: 5, cssClass: 'p-6 max-w-2xl', children })
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}
