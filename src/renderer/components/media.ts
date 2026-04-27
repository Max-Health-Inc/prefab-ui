/**
 * Media component renderers — Image, Audio, Video, Embed, Svg, DropZone, Mermaid
 */

import { registerComponent, resolveStr, el } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerMediaComponents(): void {
  registerComponent('Image', renderImage)
  registerComponent('Audio', renderAudio)
  registerComponent('Video', renderVideo)
  registerComponent('Embed', renderEmbed)
  registerComponent('Svg', renderSvg)
  registerComponent('DropZone', renderDropZone)
  registerComponent('Mermaid', renderMermaid)
}

function renderImage(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const img = document.createElement('img')
  img.className = 'pf-image'
  img.src = resolveStr(node.src, ctx)
  if (node.alt != null) img.alt = resolveStr(node.alt, ctx)
  if (node.width != null) img.width = node.width as number
  if (node.height != null) img.height = node.height as number
  img.style.maxWidth = '100%'
  return img
}

function renderAudio(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const audio = document.createElement('audio')
  audio.className = 'pf-audio'
  audio.src = resolveStr(node.src, ctx)
  audio.controls = true
  return audio
}

function renderVideo(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const video = document.createElement('video')
  video.className = 'pf-video'
  video.src = resolveStr(node.src, ctx)
  video.controls = true
  if (node.width != null) video.width = node.width as number
  if (node.height != null) video.height = node.height as number
  video.style.maxWidth = '100%'
  return video
}

function renderEmbed(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-embed')
  const iframe = document.createElement('iframe')
  iframe.src = resolveStr(node.src, ctx)
  iframe.style.width = '100%'
  iframe.style.height = node.height != null ? `${node.height as number}px` : '400px'
  iframe.style.border = 'none'
  iframe.setAttribute('sandbox', 'allow-scripts')
  wrapper.appendChild(iframe)
  return wrapper
}

/** SVG element/attribute allowlist for sanitization. */
const SVG_ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline',
  'polygon', 'text', 'tspan', 'textpath', 'defs', 'use', 'symbol',
  'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient',
  'stop', 'filter', 'fegaussianblur', 'feoffset', 'femerge',
  'femergenode', 'fecolormatrix', 'feblend', 'title', 'desc',
])

function renderSvg(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const wrapper = el('div', 'pf-svg')
  const content = resolveStr(node.content, ctx)
  if (!content.includes('<svg')) return wrapper

  // Parse via DOMParser to avoid innerHTML XSS
  const doc = new DOMParser().parseFromString(content, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return wrapper

  sanitizeSvgNode(svg)
  wrapper.appendChild(document.importNode(svg, true))
  return wrapper
}

function sanitizeSvgNode(node: Element): void {
  // Remove disallowed elements
  const children = Array.from(node.children)
  for (const child of children) {
    if (!SVG_ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
      child.remove()
      continue
    }
    // Strip event handler attributes (on*) and dangerous attrs
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on') || name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        child.removeAttribute(attr.name)
      }
    }
    sanitizeSvgNode(child)
  }
}

function renderDropZone(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-dropzone')
  e.style.padding = '32px'
  e.style.textAlign = 'center'
  e.style.cursor = 'pointer'
  e.textContent = resolveStr(node.label ?? 'Drop files here', ctx)

  e.addEventListener('dragover', (ev) => {
    ev.preventDefault()
    e.classList.add('pf-dropzone-active')
  })

  e.addEventListener('dragleave', () => {
    e.classList.remove('pf-dropzone-active')
  })

  e.addEventListener('drop', (ev) => {
    ev.preventDefault()
    e.classList.remove('pf-dropzone-active')
    // File handling would go here
  })

  return e
}

function renderMermaid(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-mermaid')
  e.setAttribute('data-mermaid', 'true')
  const content = resolveStr(node.content, ctx)
  // Store raw mermaid content; actual rendering requires mermaid.js
  e.textContent = content

  // Attempt to render if mermaid is available globally
  if (typeof (globalThis as Record<string, unknown>).mermaid !== 'undefined') {
    e.classList.add('mermaid')
    e.textContent = content
  }

  return e
}
