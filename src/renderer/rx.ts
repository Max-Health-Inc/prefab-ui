/**
 * Rx expression evaluator — parse and evaluate {{ expr }} at runtime.
 *
 * Handles:
 * - State references: {{ count }}, {{ user.name }}
 * - Arithmetic: {{ count + 1 }}, {{ price * quantity }}
 * - Comparisons: {{ count > 0 }}, {{ status === 'active' }}
 * - Ternary: {{ active ? 'Yes' : 'No' }}
 * - Logical: {{ a && b }}, {{ !loading }}
 * - Pipe filters: {{ price | currency:'USD' }}, {{ name | upper }}
 * - Built-in vars: $item, $index, $event, $error, $result, $state
 */

import type { Store } from './state.js'

/** Scope for expression evaluation (loop variables, event data, etc.) */
export interface EvalScope {
  $item?: unknown
  $index?: number
  $event?: unknown
  $error?: unknown
  $result?: unknown
  [key: string]: unknown
}

const RX_PATTERN = /\{\{\s*(.+?)\s*\}\}/g

/**
 * Check if a string contains {{ }} expressions.
 */
export function isRxExpression(value: unknown): value is string {
  return typeof value === 'string' && value.includes('{{') && value.includes('}}')
}

/**
 * Evaluate a string that may contain {{ expr }} templates.
 * If the entire string is a single {{ expr }}, returns the raw value (not stringified).
 * If mixed with text, interpolates as string.
 */
export function evaluateTemplate(
  template: string,
  store: Store,
  scope?: EvalScope,
): unknown {
  // Fast path: entire string is a single expression
  const trimmed = template.trim()
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}') && countOccurrences(trimmed, '{{') === 1) {
    const expr = trimmed.slice(2, -2).trim()
    return evaluateExpression(expr, store, scope)
  }

  // Mixed template: interpolate all {{ }} blocks as strings
  return template.replace(RX_PATTERN, (_, expr: string) => {
    const val = evaluateExpression(expr.trim(), store, scope)
    return val == null ? '' : String(val as string | number | boolean)
  })
}

/**
 * Evaluate a raw expression string (without {{ }}).
 */
export function evaluateExpression(
  expr: string,
  store: Store,
  scope?: EvalScope,
): unknown {
  // Handle pipe filters: split on | that's not inside quotes
  const [baseExpr, ...pipes] = splitPipes(expr)

  let value = evaluateCore(baseExpr.trim(), store, scope)

  // Apply pipe filters
  for (const pipe of pipes) {
    value = applyFilter(pipe.trim(), value)
  }

  return value
}

// ── Core expression evaluator ────────────────────────────────────────────────

function evaluateCore(expr: string, store: Store, scope?: EvalScope): unknown {
  // Ternary: a ? b : c
  const ternaryIdx = findTernary(expr)
  if (ternaryIdx >= 0) {
    const condition = expr.slice(0, ternaryIdx).trim()
    const rest = expr.slice(ternaryIdx + 1)
    const colonIdx = findColon(rest)
    if (colonIdx >= 0) {
      const ifTrue = rest.slice(0, colonIdx).trim()
      const ifFalse = rest.slice(colonIdx + 1).trim()
      const condResult = evaluateCore(condition, store, scope)
      return condResult !== null && condResult !== undefined && condResult !== false && condResult !== 0 && condResult !== ''
        ? evaluateCore(ifTrue, store, scope)
        : evaluateCore(ifFalse, store, scope)
    }
  }

  // Logical OR: a || b
  const orIdx = expr.indexOf('||')
  if (orIdx >= 0) {
    const left = evaluateCore(expr.slice(0, orIdx).trim(), store, scope)
    return left !== null && left !== undefined && left !== false && left !== 0 && left !== ''
      ? left
      : evaluateCore(expr.slice(orIdx + 2).trim(), store, scope)
  }

  // Logical AND: a && b
  const andIdx = expr.indexOf('&&')
  if (andIdx >= 0) {
    const left = evaluateCore(expr.slice(0, andIdx).trim(), store, scope)
    if (left === null || left === undefined || left === false || left === 0 || left === '') return left
    return evaluateCore(expr.slice(andIdx + 2).trim(), store, scope)
  }

  // Comparisons
  for (const [op, fn] of COMPARISONS) {
    const idx = expr.indexOf(op)
    if (idx >= 0) {
      const left = evaluateCore(expr.slice(0, idx).trim(), store, scope)
      const right = evaluateCore(expr.slice(idx + op.length).trim(), store, scope)
      return fn(left, right)
    }
  }

  // Negation: !expr
  if (expr.startsWith('!')) {
    const negResult = evaluateCore(expr.slice(1).trim(), store, scope)
    return negResult === null || negResult === undefined || negResult === false || negResult === 0 || negResult === ''
  }

  // Arithmetic: +, -, *, /, %
  for (const [op, fn] of ARITHMETIC) {
    const idx = findArithOp(expr, op)
    if (idx >= 0) {
      const left = evaluateCore(expr.slice(0, idx).trim(), store, scope)
      const right = evaluateCore(expr.slice(idx + op.length).trim(), store, scope)
      return fn(Number(left), Number(right))
    }
  }

  // Literal values
  if (expr === 'true') return true
  if (expr === 'false') return false
  if (expr === 'null' || expr === 'undefined') return null
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr)
  if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
    return expr.slice(1, -1)
  }

  // Scope variables ($item, $index, etc.)
  if (scope && expr.startsWith('$')) {
    const dotIdx = expr.indexOf('.')
    if (dotIdx >= 0) {
      const varName = expr.slice(0, dotIdx)
      const rest = expr.slice(dotIdx + 1)
      const base = scope[varName]
      return resolveDeep(base, rest)
    }
    return scope[expr]
  }

  // State reference (dot-path)
  if (scope) {
    // Check scope first for overrides
    const topKey = expr.split('.')[0]
    if (topKey in scope) {
      return resolveDeep(scope[topKey], expr.includes('.') ? expr.slice(topKey.length + 1) : '')
    }
  }
  return store.get(expr)
}

// ── Pipe filters ─────────────────────────────────────────────────────────────

function applyFilter(filterStr: string, value: unknown): unknown {
  const colonIdx = filterStr.indexOf(':')
  const name = colonIdx >= 0 ? filterStr.slice(0, colonIdx).trim() : filterStr
  const argStr = colonIdx >= 0 ? filterStr.slice(colonIdx + 1).trim() : undefined
  const arg = argStr ? parseLiteral(argStr) : undefined

  switch (name) {
    case 'length':
      return Array.isArray(value) ? value.length : typeof value === 'string' ? value.length : 0
    case 'upper':
      return typeof value === 'string' ? value.toUpperCase() : value
    case 'lower':
      return typeof value === 'string' ? value.toLowerCase() : value
    case 'truncate':
      if (typeof value === 'string' && typeof arg === 'number') return value.slice(0, arg)
      return value
    case 'join':
      return Array.isArray(value) ? value.join(typeof arg === 'string' ? arg : ', ') : value
    case 'first':
      return Array.isArray(value) ? value[0] : value
    case 'last':
      return Array.isArray(value) ? value[value.length - 1] : value
    case 'abs':
      return Math.abs(Number(value))
    case 'round':
      return typeof arg === 'number' ? Number(Number(value).toFixed(arg)) : Math.round(Number(value))
    case 'number':
      return typeof arg === 'number' ? Number(Number(value).toFixed(arg)) : Number(value)
    case 'currency': {
      const code = typeof arg === 'string' ? arg : 'USD'
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value))
      } catch { return value }
    }
    case 'percent':
      return typeof arg === 'number'
        ? `${(Number(value) * 100).toFixed(arg)}%`
        : `${Math.round(Number(value) * 100)}%`
    case 'compact': {
      const digits = typeof arg === 'number' ? arg : 1
      try {
        return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: digits }).format(Number(value))
      } catch { return value }
    }
    case 'date':
      try { return new Date(value as string).toLocaleDateString() } catch { return value }
    case 'time':
      try { return new Date(value as string).toLocaleTimeString() } catch { return value }
    case 'datetime':
      try { return new Date(value as string).toLocaleString() } catch { return value }
    case 'pluralize': {
      const n = Number(value)
      const word = typeof arg === 'string' ? arg : ''
      return n === 1 ? word : `${word}s`
    }
    case 'default':
      return value == null || value === '' ? arg : value
    case 'selectattr':
      return Array.isArray(value) && typeof arg === 'string'
        ? value.filter(item => item != null && typeof item === 'object' && Boolean((item as Record<string, unknown>)[arg]))
        : value
    case 'rejectattr':
      return Array.isArray(value) && typeof arg === 'string'
        ? value.filter(item => {
          if (item == null || typeof item !== 'object') return false
          const attr = (item as Record<string, unknown>)[arg]
          return attr == null || attr === false || attr === 0 || attr === ''
        })
        : value
    default:
      return value
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const COMPARISONS: [string, (a: unknown, b: unknown) => boolean][] = [
  ['!==', (a, b) => a !== b],
  ['===', (a, b) => a === b],
  ['>=', (a, b) => Number(a) >= Number(b)],
  ['<=', (a, b) => Number(a) <= Number(b)],
  ['>', (a, b) => Number(a) > Number(b)],
  ['<', (a, b) => Number(a) < Number(b)],
]

const ARITHMETIC: [string, (a: number, b: number) => number][] = [
  [' + ', (a, b) => a + b],
  [' - ', (a, b) => a - b],
  [' * ', (a, b) => a * b],
  [' / ', (a, b) => b !== 0 ? a / b : 0],
  [' % ', (a, b) => a % b],
]

function findArithOp(expr: string, op: string): number {
  // Find operator not inside quotes
  let inQuote: string | null = null
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === "'" || ch === '"') {
      inQuote = inQuote === ch ? null : (inQuote ?? ch)
    }
    if (!inQuote && expr.slice(i, i + op.length) === op) return i
  }
  return -1
}

function findTernary(expr: string): number {
  let depth = 0
  let inQuote: string | null = null
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === "'" || ch === '"') {
      inQuote = inQuote === ch ? null : (inQuote ?? ch)
    }
    if (!inQuote) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === '?' && depth === 0) return i
    }
  }
  return -1
}

function findColon(expr: string): number {
  let depth = 0
  let inQuote: string | null = null
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === "'" || ch === '"') {
      inQuote = inQuote === ch ? null : (inQuote ?? ch)
    }
    if (!inQuote) {
      if (ch === '?' || ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ':' && depth === 0) return i
    }
  }
  return -1
}

function splitPipes(expr: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuote: string | null = null
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === "'" || ch === '"') {
      inQuote = inQuote === ch ? null : (inQuote ?? ch)
    }
    if (ch === '|' && !inQuote) {
      // Skip || (logical OR) — not a pipe
      if (expr[i + 1] === '|') {
        current += '||'
        i++ // consume second |
      } else {
        parts.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts
}

function parseLiteral(s: string): string | number | boolean {
  const trimmed = s.replace(/^['"]|['"]$/g, '')
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const n = Number(trimmed)
  return isNaN(n) ? trimmed : n
}

function resolveDeep(obj: unknown, path: string): unknown {
  if (!path) return obj
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function countOccurrences(s: string, sub: string): number {
  let count = 0
  let idx = 0
  while ((idx = s.indexOf(sub, idx)) !== -1) {
    count++
    idx += sub.length
  }
  return count
}
