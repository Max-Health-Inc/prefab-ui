/**
 * Client-side actions — executed by the prefab renderer without server roundtrip.
 */

import type { Action, ActionJSON } from './types.js'
import { serializeValue } from '../core/component.js'

// ── SetState ─────────────────────────────────────────────────────────────────

export interface SetStateOpts {
  onSuccess?: Action | Action[]
  onError?: Action | Action[]
}

export class SetState implements Action {
  constructor(
    readonly key: string,
    readonly value: unknown,
    private readonly opts?: SetStateOpts,
  ) {}

  toJSON(): ActionJSON {
    const json: ActionJSON = {
      action: 'setState',
      key: this.key,
      value: serializeValue(this.value),
    }
    if (this.opts?.onSuccess) json.onSuccess = serializeCallbacks(this.opts.onSuccess)
    if (this.opts?.onError) json.onError = serializeCallbacks(this.opts.onError)
    return json
  }
}

// ── ToggleState ──────────────────────────────────────────────────────────────

export class ToggleState implements Action {
  constructor(readonly key: string) {}

  toJSON(): ActionJSON {
    return { action: 'toggleState', key: this.key }
  }
}

// ── AppendState ──────────────────────────────────────────────────────────────

export class AppendState implements Action {
  constructor(
    readonly key: string,
    readonly value: unknown,
    readonly index?: number,
  ) {}

  toJSON(): ActionJSON {
    const json: ActionJSON = {
      action: 'appendState',
      key: this.key,
      value: serializeValue(this.value),
    }
    if (this.index !== undefined) json.index = this.index
    return json
  }
}

// ── PopState ─────────────────────────────────────────────────────────────────

export class PopState implements Action {
  constructor(
    readonly key: string,
    readonly index: number | string,
  ) {}

  toJSON(): ActionJSON {
    return { action: 'popState', key: this.key, index: this.index }
  }
}

// ── ShowToast ────────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface ShowToastOpts {
  description?: string
  variant?: ToastVariant
  duration?: number
}

export class ShowToast implements Action {
  constructor(
    readonly message: string,
    private readonly opts?: ShowToastOpts,
  ) {}

  toJSON(): ActionJSON {
    const json: ActionJSON = { action: 'showToast', message: this.message }
    if (this.opts?.description) json.description = this.opts.description
    if (this.opts?.variant) json.variant = this.opts.variant
    if (this.opts?.duration) json.duration = this.opts.duration
    return json
  }
}

// ── CloseOverlay ─────────────────────────────────────────────────────────────

export class CloseOverlay implements Action {
  toJSON(): ActionJSON {
    return { action: 'closeOverlay' }
  }
}

// ── OpenLink ─────────────────────────────────────────────────────────────────

export class OpenLink implements Action {
  constructor(
    readonly url: string,
    readonly target: string = '_blank',
  ) {}

  toJSON(): ActionJSON {
    return { action: 'openLink', url: this.url, target: this.target }
  }
}

// ── SetInterval ──────────────────────────────────────────────────────────────

export class SetInterval implements Action {
  constructor(
    readonly intervalMs: number,
    readonly onTick: Action | Action[],
  ) {}

  toJSON(): ActionJSON {
    return {
      action: 'setInterval',
      intervalMs: this.intervalMs,
      onTick: serializeCallbacks(this.onTick),
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function serializeCallbacks(actions: Action | Action[]): ActionJSON | ActionJSON[] {
  return Array.isArray(actions) ? actions.map(a => a.toJSON()) : actions.toJSON()
}
