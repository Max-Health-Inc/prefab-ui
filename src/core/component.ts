/**
 * Core component base classes.
 *
 * Every UI component inherits from Component. Container components
 * (Column, Row, Card, etc.) extend ContainerComponent which adds children.
 * StatefulMixin adds name/value tracking for form elements.
 *
 * Serialization: Components produce a flat JSON tree matching the
 * Python prefab-ui wire format:
 *   { type: "Button", label: "Hi", variant: "default" }
 *   { type: "Column", gap: 4, children: [...] }
 */

import type { Action, ActionJSON } from '../actions/types.js'
import type { Rx } from '../rx/rx.js'
import type { Ref } from '../rx/collection.js'

// ── Types ────────────────────────────────────────────────────────────────────

/** Any value that can be a plain string, a reactive Rx expression, or a Ref */
export type RxStr = string | Rx | Ref

/** Serialized component JSON */
export interface ComponentJSON {
  type: string
  id?: string
  cssClass?: string
  onMount?: ActionJSON | ActionJSON[]
  children?: ComponentJSON[]
  [key: string]: unknown
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert snake_case or camelCase prop name to JSON camelCase */
export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** Serialize a value for JSON output */
export function serializeValue(v: unknown): unknown {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
  if (v instanceof Component) return v.toJSON()
  if (typeof v === 'object' && 'toJSON' in v && typeof (v as { toJSON: () => unknown }).toJSON === 'function') {
    return (v as { toJSON: () => unknown }).toJSON()
  }
  if (Array.isArray(v)) return v.map(serializeValue)
  if (typeof v === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const serialized = serializeValue(val)
      if (serialized !== undefined) result[toCamelCase(k)] = serialized
    }
    return result
  }
  return v
}

// ── Component ────────────────────────────────────────────────────────────────

export interface ComponentProps {
  id?: string
  cssClass?: string
  onMount?: Action | Action[]
}

export class Component {
  readonly componentType: string
  id?: string
  cssClass?: string
  onMount?: Action | Action[]

  constructor(type: string, props?: ComponentProps) {
    this.componentType = type
    if (props?.id) this.id = props.id
    if (props?.cssClass) this.cssClass = props.cssClass
    if (props?.onMount) this.onMount = props.onMount
  }

  /** Override in subclasses to add component-specific props */
  getProps(): Record<string, unknown> {
    return {}
  }

  toJSON(): ComponentJSON {
    const json: ComponentJSON = { type: this.componentType }

    if (this.id) json.id = this.id
    if (this.cssClass) json.cssClass = this.cssClass
    if (this.onMount) {
      json.onMount = Array.isArray(this.onMount)
        ? this.onMount.map(a => a.toJSON())
        : this.onMount.toJSON()
    }

    // Merge component-specific props
    const props = this.getProps()
    for (const [key, value] of Object.entries(props)) {
      const serialized = serializeValue(value)
      if (serialized !== undefined) {
        json[toCamelCase(key)] = serialized
      }
    }

    return json
  }
}

// ── ContainerComponent ───────────────────────────────────────────────────────

export interface ContainerProps extends ComponentProps {
  children?: Component[]
}

export class ContainerComponent extends Component {
  children: Component[]

  constructor(type: string, props?: ContainerProps) {
    super(type, props)
    this.children = props?.children ?? []
  }

  toJSON(): ComponentJSON {
    const json = super.toJSON()
    if (this.children.length > 0) {
      json.children = this.children.map(c => c.toJSON())
    }
    return json
  }
}

// ── StatefulMixin ────────────────────────────────────────────────────────────

export interface StatefulProps extends ComponentProps {
  name: string
  value?: unknown
  onChange?: Action | Action[]
}

/**
 * Base class for stateful form components (Input, Checkbox, Select, etc.).
 * Provides a `name` for state binding and an optional `onChange` action.
 */
export class StatefulComponent extends Component {
  name: string
  value?: unknown
  onChange?: Action | Action[]

  constructor(type: string, props: StatefulProps) {
    super(type, props)
    this.name = props.name
    this.value = props.value
    this.onChange = props.onChange
  }

  getProps(): Record<string, unknown> {
    return {
      name: this.name,
      ...(this.value !== undefined && { value: this.value }),
      ...(this.onChange && {
        onChange: Array.isArray(this.onChange)
          ? this.onChange.map(a => a.toJSON())
          : this.onChange.toJSON(),
      }),
    }
  }
}
