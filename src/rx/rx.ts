/**
 * Rx — Reactive expression builder.
 *
 * Builds template expressions like "{{ count + 1 }}" or "{{ user.name }}"
 * that are evaluated client-side by the prefab renderer.
 *
 * Usage:
 *   rx('count')                    → "{{ count }}"
 *   rx('count').add(1)             → "{{ count + 1 }}"
 *   rx('user').dot('name')         → "{{ user.name }}"
 *   rx('items').length()           → "{{ items | length }}"
 *   rx('price').currency('USD')    → "{{ price | currency:'USD' }}"
 *   rx('active').then('Yes', 'No') → "{{ active ? 'Yes' : 'No' }}"
 */

export class Rx {
  private readonly expr: string

  constructor(expression: string) {
    this.expr = expression
  }

  // ── Core ─────────────────────────────────────────────────────────────────

  /** Raw expression string without {{ }} wrapper */
  get expression(): string {
    return this.expr
  }

  /** Serialize to "{{ expression }}" template string */
  toString(): string {
    return `{{ ${this.expr} }}`
  }

  toJSON(): string {
    return this.toString()
  }

  // ── Property access ──────────────────────────────────────────────────────

  /** Dot-path access: rx('user').dot('name') → "{{ user.name }}" */
  dot(key: string): Rx {
    return new Rx(`${this.expr}.${key}`)
  }

  /** Index access: rx('items').at(0) → "{{ items.0 }}" */
  at(index: number | Rx): Rx {
    const idx = index instanceof Rx ? `{{ ${index.expr} }}` : String(index)
    return new Rx(`${this.expr}.${idx}`)
  }

  // ── Arithmetic ───────────────────────────────────────────────────────────

  add(other: number | string | Rx): Rx {
    return new Rx(`${this.expr} + ${formatOperand(other)}`)
  }

  sub(other: number | string | Rx): Rx {
    return new Rx(`${this.expr} - ${formatOperand(other)}`)
  }

  mul(other: number | string | Rx): Rx {
    return new Rx(`${this.expr} * ${formatOperand(other)}`)
  }

  div(other: number | string | Rx): Rx {
    return new Rx(`${this.expr} / ${formatOperand(other)}`)
  }

  mod(other: number | string | Rx): Rx {
    return new Rx(`${this.expr} % ${formatOperand(other)}`)
  }

  // ── Comparison ───────────────────────────────────────────────────────────

  eq(other: unknown): Rx {
    return new Rx(`${this.expr} === ${formatOperand(other)}`)
  }

  neq(other: unknown): Rx {
    return new Rx(`${this.expr} !== ${formatOperand(other)}`)
  }

  gt(other: number | Rx): Rx {
    return new Rx(`${this.expr} > ${formatOperand(other)}`)
  }

  gte(other: number | Rx): Rx {
    return new Rx(`${this.expr} >= ${formatOperand(other)}`)
  }

  lt(other: number | Rx): Rx {
    return new Rx(`${this.expr} < ${formatOperand(other)}`)
  }

  lte(other: number | Rx): Rx {
    return new Rx(`${this.expr} <= ${formatOperand(other)}`)
  }

  // ── Logical ──────────────────────────────────────────────────────────────

  and(other: Rx): Rx {
    return new Rx(`${this.expr} && ${other.expr}`)
  }

  or(other: Rx): Rx {
    return new Rx(`${this.expr} || ${other.expr}`)
  }

  not(): Rx {
    return new Rx(`!${this.expr}`)
  }

  // ── Ternary ──────────────────────────────────────────────────────────────

  then(ifTrue: unknown, ifFalse: unknown): Rx {
    return new Rx(`${this.expr} ? ${formatOperand(ifTrue)} : ${formatOperand(ifFalse)}`)
  }

  // ── Pipe methods (format filters) ────────────────────────────────────────

  currency(code?: string): Rx {
    return this.pipe('currency', code)
  }

  percent(decimals?: number): Rx {
    return this.pipe('percent', decimals)
  }

  number(decimals?: number): Rx {
    return this.pipe('number', decimals)
  }

  round(decimals = 0): Rx {
    return this.pipe('round', decimals)
  }

  compact(decimals?: number): Rx {
    return this.pipe('compact', decimals)
  }

  abs(): Rx {
    return this.pipe('abs')
  }

  date(format?: string): Rx {
    return this.pipe('date', format)
  }

  time(): Rx {
    return this.pipe('time')
  }

  datetime(): Rx {
    return this.pipe('datetime')
  }

  upper(): Rx {
    return this.pipe('upper')
  }

  lower(): Rx {
    return this.pipe('lower')
  }

  truncate(maxLength: number): Rx {
    return this.pipe('truncate', maxLength)
  }

  pluralize(word?: string): Rx {
    return this.pipe('pluralize', word)
  }

  length(): Rx {
    return this.pipe('length')
  }

  join(separator?: string): Rx {
    return this.pipe('join', separator)
  }

  first(): Rx {
    return this.pipe('first')
  }

  last(): Rx {
    return this.pipe('last')
  }

  selectattr(attr: string): Rx {
    return this.pipe('selectattr', attr)
  }

  rejectattr(attr: string): Rx {
    return this.pipe('rejectattr', attr)
  }

  default(value: unknown): Rx {
    return this.pipe('default', value)
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private pipe(name: string, arg?: unknown): Rx {
    const pipeStr = arg !== undefined ? `${name}:${formatPipeArg(arg)}` : name
    return new Rx(`${this.expr} | ${pipeStr}`)
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/** Create an Rx expression referencing a state key */
export function rx(key: string): Rx {
  return new Rx(key)
}

// ── Built-in reactive variables ──────────────────────────────────────────────

/** Current item in a ForEach loop */
export const ITEM = new Rx('$item')

/** Current index in a ForEach loop */
export const INDEX = new Rx('$index')

/** Value from an interaction event (input value, checkbox state, etc.) */
export const EVENT = new Rx('$event')

/** Error message available in on_error callbacks */
export const ERROR = new Rx('$error')

/** Return value available in on_success callbacks */
export const RESULT = new Rx('$result')

/**
 * STATE proxy — convenience for accessing state keys.
 * Usage: STATE.foo → rx('foo'), STATE.user.name → rx('user.name')
 */
export const STATE: Record<string, Rx> = new Proxy({} as Record<string, Rx>, {
  get(_target, prop: string) {
    return rx(prop)
  },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatOperand(v: unknown): string {
  if (v instanceof Rx) return v.expression
  if (typeof v === 'string') return `'${v}'`
  return String(v)
}

function formatPipeArg(v: unknown): string {
  if (typeof v === 'string') return `'${v}'`
  return String(v)
}
