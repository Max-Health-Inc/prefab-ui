/**
 * Control flow components — ForEach, If, Elif, Else
 */

import { ContainerComponent } from '../../core/component.js'
import type { ContainerProps, RxStr } from '../../core/component.js'

// ── ForEach ──────────────────────────────────────────────────────────────────

export interface ForEachProps extends ContainerProps {
  expression: RxStr
  let?: Record<string, unknown>
}

export function ForEach(props: ForEachProps): ContainerComponent {
  const c = new ContainerComponent('ForEach', props)
  c['getProps'] = () => ({
    expression: String(props.expression),
    ...(props.let && { let: props.let }),
  })
  return c
}

// ── If / Elif / Else ─────────────────────────────────────────────────────────

export interface ConditionProps extends ContainerProps {
  condition: RxStr
}

export function If(props: ConditionProps): ContainerComponent {
  const c = new ContainerComponent('If', props)
  c['getProps'] = () => ({ condition: String(props.condition) })
  return c
}

export function Elif(props: ConditionProps): ContainerComponent {
  const c = new ContainerComponent('Elif', props)
  c['getProps'] = () => ({ condition: String(props.condition) })
  return c
}

export function Else(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Else', props)
}
