/**
 * Media components — Image, Audio, Video, Embed, Svg, DropZone, Mermaid
 */

import { Component } from '../../core/component.js'
import type { ComponentProps, RxStr } from '../../core/component.js'

export interface ImageProps extends ComponentProps {
  src: string
  alt?: string
}

export function Image(props: ImageProps): Component {
  const c = new Component('Image', props)
  c['getProps'] = () => ({
    src: props.src,
    ...(props.alt && { alt: props.alt }),
  })
  return c
}

export function Audio(src: string, props?: ComponentProps): Component {
  const c = new Component('Audio', props)
  c['getProps'] = () => ({ src })
  return c
}

export function Video(src: string, props?: ComponentProps): Component {
  const c = new Component('Video', props)
  c['getProps'] = () => ({ src })
  return c
}

export function Embed(src: string, props?: ComponentProps): Component {
  const c = new Component('Embed', props)
  c['getProps'] = () => ({ src })
  return c
}

export function Svg(content: string, props?: ComponentProps): Component {
  const c = new Component('Svg', props)
  c['getProps'] = () => ({ content })
  return c
}

export function DropZone(props?: ComponentProps): Component {
  return new Component('DropZone', props)
}

export function Mermaid(content: string, props?: ComponentProps): Component {
  const c = new Component('Mermaid', props)
  c['getProps'] = () => ({ content })
  return c
}
