/**
 * Reactive state store for the prefab renderer.
 *
 * Stores key-value pairs and notifies subscribers when values change.
 * Supports dot-path access (e.g. "user.name") and array operations.
 */

export type Subscriber = () => void
export type Unsubscribe = () => void

export class Store {
  private data: Record<string, unknown> = {}
  private subscribers = new Map<string, Set<Subscriber>>()
  private globalSubscribers = new Set<Subscriber>()

  constructor(initial?: Record<string, unknown>) {
    if (initial) this.data = structuredClone(initial)
  }

  /** Get a value by dot-path key */
  get(path: string): unknown {
    return resolvePath(this.data, path)
  }

  /** Get the full state snapshot */
  getAll(): Record<string, unknown> {
    return this.data
  }

  /** Set a value by dot-path key and notify subscribers */
  set(path: string, value: unknown): void {
    setPath(this.data, path, value)
    this.notify(path)
  }

  /** Toggle a boolean value */
  toggle(path: string): void {
    const current: unknown = this.get(path)
    const falsy = current == null || current === false || current === 0 || current === ''
    this.set(path, falsy)
  }

  /** Append a value to an array at path */
  append(path: string, value: unknown, index?: number): void {
    const arr = this.get(path)
    if (!Array.isArray(arr)) {
      this.set(path, [value])
      return
    }
    if (index !== undefined) {
      arr.splice(index, 0, value)
    } else {
      arr.push(value)
    }
    this.notify(path)
  }

  /** Remove an element from an array at path by index or value */
  pop(path: string, indexOrValue: number | string): void {
    const arr = this.get(path)
    if (!Array.isArray(arr)) return
    if (typeof indexOrValue === 'number') {
      arr.splice(indexOrValue, 1)
    } else {
      const idx = arr.indexOf(indexOrValue)
      if (idx >= 0) arr.splice(idx, 1)
    }
    this.notify(path)
  }

  /** Merge a partial state object */
  merge(partial: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(partial)) {
      setPath(this.data, key, value)
    }
    // Notify all changed keys (including parent paths) + global
    for (const key of Object.keys(partial)) {
      this.notify(key)
    }
  }

  /** Subscribe to changes on a specific path */
  subscribe(path: string, fn: Subscriber): Unsubscribe {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set())
    }
    const subs = this.subscribers.get(path)
    subs?.add(fn)
    return () => this.subscribers.get(path)?.delete(fn)
  }

  /** Subscribe to any state change */
  subscribeAll(fn: Subscriber): Unsubscribe {
    this.globalSubscribers.add(fn)
    return () => this.globalSubscribers.delete(fn)
  }

  private notify(path: string): void {
    // Notify exact key and any parent paths
    const parts = path.split('.')
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('.')
      const subs = this.subscribers.get(prefix)
      if (subs) subs.forEach(fn => fn())
    }
    this.globalSubscribers.forEach(fn => fn())
  }
}

// ── Path utilities ───────────────────────────────────────────────────────────

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/** Keys that must never be traversed in state paths. */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  if (parts.some(p => BLOCKED_KEYS.has(p))) {
    console.warn(`[prefab] Blocked prototype pollution attempt: ${path}`)
    return
  }
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}
