/**
 * Card components — Card, CardHeader, CardTitle, CardContent, CardFooter, etc.
 */

import { ContainerComponent, Component } from '../../core/component.js'
import type { ContainerProps, ComponentProps, RxStr } from '../../core/component.js'

class CardTextComponent extends Component {
  constructor(type: string, readonly content: RxStr, props?: ComponentProps) {
    super(type, props)
  }
  protected getProps() {
    return { content: String(this.content) }
  }
}

export function Card(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Card', props)
}

export function CardHeader(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('CardHeader', props)
}

export function CardTitle(content: RxStr, props?: ComponentProps): Component {
  return new CardTextComponent('CardTitle', content, props)
}

export function CardDescription(content: RxStr, props?: ComponentProps): Component {
  return new CardTextComponent('CardDescription', content, props)
}

export function CardContent(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('CardContent', props)
}

export function CardFooter(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('CardFooter', props)
}
