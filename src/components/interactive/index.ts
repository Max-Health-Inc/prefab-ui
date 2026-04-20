/**
 * Interactive components — Tabs, Accordion, Dialog, Popover, Tooltip, etc.
 */

import { ContainerComponent, Component } from '../../core/component.js'
import type { ContainerProps, ComponentProps, RxStr } from '../../core/component.js'

// ── Tabs + Tab ───────────────────────────────────────────────────────────────

export function Tabs(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Tabs', props)
}

export interface TabProps extends ContainerProps {
  title: string
}

export function Tab(props: TabProps): ContainerComponent {
  const c = new ContainerComponent('Tab', props)
  c['getProps'] = () => ({ title: props.title })
  return c
}

// ── Accordion + AccordionItem ────────────────────────────────────────────────

export function Accordion(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Accordion', props)
}

export interface AccordionItemProps extends ContainerProps {
  title: string
}

export function AccordionItem(props: AccordionItemProps): ContainerComponent {
  const c = new ContainerComponent('AccordionItem', props)
  c['getProps'] = () => ({ title: props.title })
  return c
}

// ── Dialog ───────────────────────────────────────────────────────────────────

export interface DialogProps extends ContainerProps {
  title?: string
  description?: string
  trigger?: Component
  name?: string
  dismissible?: boolean
}

export function Dialog(props: DialogProps): ContainerComponent {
  const c = new ContainerComponent('Dialog', props)
  c['getProps'] = () => ({
    ...(props.title && { title: props.title }),
    ...(props.description && { description: props.description }),
    ...(props.trigger && { trigger: props.trigger.toJSON() }),
    ...(props.name && { name: props.name }),
    ...(props.dismissible !== undefined && { dismissible: props.dismissible }),
  })
  return c
}

// ── Popover ──────────────────────────────────────────────────────────────────

export interface PopoverProps extends ContainerProps {
  title?: string
  description?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Popover(props: PopoverProps): ContainerComponent {
  const c = new ContainerComponent('Popover', props)
  c['getProps'] = () => ({
    ...(props.title && { title: props.title }),
    ...(props.description && { description: props.description }),
    ...(props.side && { side: props.side }),
  })
  return c
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip(content: RxStr, props?: ContainerProps): ContainerComponent {
  const c = new ContainerComponent('Tooltip', props)
  c['getProps'] = () => ({ content: String(content) })
  return c
}

// ── HoverCard ────────────────────────────────────────────────────────────────

export function HoverCard(content: RxStr, props?: ContainerProps): ContainerComponent {
  const c = new ContainerComponent('HoverCard', props)
  c['getProps'] = () => ({ content: String(content) })
  return c
}

// ── Carousel ─────────────────────────────────────────────────────────────────

export function Carousel(props?: ContainerProps): ContainerComponent {
  return new ContainerComponent('Carousel', props)
}
