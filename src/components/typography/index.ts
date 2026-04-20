/**
 * Typography components — Heading, Text, Muted, Code, Link, Markdown, etc.
 */

import { Component } from '../../core/component.js'
import type { ComponentProps, RxStr } from '../../core/component.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

class TextComponent extends Component {
  constructor(type: string, readonly content: RxStr, props?: ComponentProps) {
    super(type, props)
  }
  getProps(): Record<string, unknown> {
    return { content: String(this.content) }
  }
}

// ── Heading ──────────────────────────────────────────────────────────────────

export interface HeadingProps extends ComponentProps {
  level?: 1 | 2 | 3 | 4
}

export function Heading(content: RxStr, props?: HeadingProps): Component {
  const c = new TextComponent('Heading', content, props)
  const origGetProps = c.getProps.bind(c)
  c.getProps = () => ({ ...origGetProps(), level: props?.level ?? 1 })
  return c
}

// ── Shorthand headings ───────────────────────────────────────────────────────

export function H1(content: RxStr, props?: ComponentProps): Component {
  return Heading(content, { ...props, level: 1 })
}

export function H2(content: RxStr, props?: ComponentProps): Component {
  return Heading(content, { ...props, level: 2 })
}

export function H3(content: RxStr, props?: ComponentProps): Component {
  return Heading(content, { ...props, level: 3 })
}

export function H4(content: RxStr, props?: ComponentProps): Component {
  return Heading(content, { ...props, level: 4 })
}

// ── Text variants ────────────────────────────────────────────────────────────

export interface TextProps extends ComponentProps {
  bold?: boolean
  code?: boolean
}

export function Text(content: RxStr, props?: TextProps): Component {
  const c = new TextComponent('Text', content, props)
  if (props?.bold || props?.code) {
    const origGetProps = c.getProps.bind(c)
    c.getProps = () => ({
      ...origGetProps(),
      ...(props.bold && { bold: true }),
      ...(props.code && { code: true }),
    })
  }
  return c
}

export function P(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('P', content, props)
}

export function Lead(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('Lead', content, props)
}

export function Large(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('Large', content, props)
}

export function Small(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('Small', content, props)
}

export function Muted(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('Muted', content, props)
}

export function BlockQuote(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('BlockQuote', content, props)
}

export function Label(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('Label', content, props)
}

// ── Link ─────────────────────────────────────────────────────────────────────

export interface LinkProps extends ComponentProps {
  href: string
  target?: string
}

export function Link(content: RxStr, props: LinkProps): Component {
  const c = new TextComponent('Link', content, props)
  const origGetProps = c.getProps.bind(c)
  c.getProps = () => ({
    ...origGetProps(),
    href: props.href,
    ...(props.target && { target: props.target }),
  })
  return c
}

// ── Code ─────────────────────────────────────────────────────────────────────

export function Code(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('Code', content, props)
}

// ── Markdown ─────────────────────────────────────────────────────────────────

export function Markdown(content: RxStr, props?: ComponentProps): Component {
  return new TextComponent('Markdown', content, props)
}

// ── Kbd ──────────────────────────────────────────────────────────────────────

export function Kbd(label: string, props?: ComponentProps): Component {
  const c = new TextComponent('Kbd', label, props)
  const origGetProps = c.getProps.bind(c)
  c.getProps = () => ({ ...origGetProps(), label })
  return c
}
