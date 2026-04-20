/**
 * Alert components — Alert, AlertTitle, AlertDescription
 */

import { ContainerComponent, Component } from '../../core/component.js'
import type { ContainerProps, ComponentProps, RxStr } from '../../core/component.js'

export type AlertVariant = 'default' | 'destructive'

export interface AlertProps extends ContainerProps {
  variant?: AlertVariant
  icon?: string
}

export function Alert(props?: AlertProps): ContainerComponent {
  const c = new ContainerComponent('Alert', props)
  if (props?.variant || props?.icon) {
    c['getProps'] = () => ({
      ...(props.variant && { variant: props.variant }),
      ...(props.icon && { icon: props.icon }),
    })
  }
  return c
}

class AlertTextComponent extends Component {
  constructor(type: string, readonly content: RxStr, props?: ComponentProps) {
    super(type, props)
  }
  protected getProps() {
    return { content: String(this.content) }
  }
}

export function AlertTitle(content: RxStr, props?: ComponentProps): Component {
  return new AlertTextComponent('AlertTitle', content, props)
}

export function AlertDescription(content: RxStr, props?: ComponentProps): Component {
  return new AlertTextComponent('AlertDescription', content, props)
}
