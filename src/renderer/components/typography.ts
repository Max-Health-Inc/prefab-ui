/**
 * Typography component renderers — Heading, Text, Muted, Code, Markdown, etc.
 */

import { registerComponent, resolveStr, el, text } from '../engine.js'
import type { ComponentNode, RenderContext } from '../engine.js'

export function registerTypographyComponents(): void {
  registerComponent('Heading', renderHeading)
  registerComponent('H1', (n, c) => renderHx(n, c, 'h1'))
  registerComponent('H2', (n, c) => renderHx(n, c, 'h2'))
  registerComponent('H3', (n, c) => renderHx(n, c, 'h3'))
  registerComponent('H4', (n, c) => renderHx(n, c, 'h4'))
  registerComponent('Text', renderText)
  registerComponent('P', renderP)
  registerComponent('Lead', (n, c) => renderStyled(n, c, 'p', 'pf-lead'))
  registerComponent('Large', (n, c) => renderStyled(n, c, 'span', 'pf-large'))
  registerComponent('Small', (n, c) => renderStyled(n, c, 'small', 'pf-small'))
  registerComponent('Muted', (n, c) => renderStyled(n, c, 'p', 'pf-muted'))
  registerComponent('BlockQuote', (n, c) => renderStyled(n, c, 'blockquote', 'pf-blockquote'))
  registerComponent('Label', (n, c) => renderStyled(n, c, 'label', 'pf-label'))
  registerComponent('Link', renderLink)
  registerComponent('Code', renderCode)
  registerComponent('Markdown', renderMarkdown)
  registerComponent('Kbd', renderKbd)
}

function renderHeading(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const level = (node.level as number | undefined) ?? 2
  const tag = `h${Math.min(Math.max(level, 1), 6)}`
  const e = document.createElement(tag)
  e.className = `pf-heading pf-${tag}`
  e.textContent = resolveStr(node.content, ctx)
  return e
}

function renderHx(node: ComponentNode, ctx: RenderContext, tag: string): HTMLElement {
  const e = document.createElement(tag)
  e.className = `pf-heading pf-${tag}`
  e.textContent = resolveStr(node.content, ctx)
  return e
}

function renderText(node: ComponentNode, ctx: RenderContext): HTMLElement {
  return text(el('span', 'pf-text'), resolveStr(node.content, ctx))
}

function renderP(node: ComponentNode, ctx: RenderContext): HTMLElement {
  return text(el('p', 'pf-p'), resolveStr(node.content, ctx))
}

function renderStyled(node: ComponentNode, ctx: RenderContext, tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag)
  e.className = cls
  e.textContent = resolveStr(node.content, ctx)
  return e
}

/** Blocked URL schemes that can execute code. */
const UNSAFE_SCHEMES = /^\s*(javascript|vbscript|data):/i

function renderLink(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const a = document.createElement('a')
  a.className = 'pf-link'
  a.textContent = resolveStr(node.content, ctx)
  if (node.href != null) {
    const href = resolveStr(node.href, ctx)
    if (!UNSAFE_SCHEMES.test(href)) {
      a.href = href
    }
  }
  if (node.target != null) a.target = resolveStr(node.target, ctx)
  return a
}

function renderCode(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const pre = el('pre', 'pf-code')
  const code = el('code')
  code.textContent = resolveStr(node.content, ctx)
  if (node.language != null) code.setAttribute('data-language', node.language as string)
  pre.appendChild(code)
  return pre
}

function renderMarkdown(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = el('div', 'pf-markdown')
  const content = resolveStr(node.content, ctx)
  e.innerHTML = renderMarkdownToHtml(content)
  e.setAttribute('data-markdown', 'true')
  return e
}

// ── Lightweight Markdown → HTML ──────────────────────────────────────────────

/** Blocked URL schemes that can execute code (reused from renderLink). */
const MD_UNSAFE_SCHEMES = /^\s*(javascript|vbscript|data):/i

/** Escape HTML special chars to prevent XSS from raw markdown content. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Render inline markdown: bold, italic, code, links, images, strikethrough. */
function renderInline(line: string): string {
  let out = escapeHtml(line)

  // Extract inline code spans first to protect their contents from formatting.
  // Replace with placeholders, process other inline formatting, then restore.
  const codeSpans: string[] = []
  out = out.replace(/`([^`]+)`/g, (_m, content: string) => {
    codeSpans.push(`<code>${content}</code>`)
    return `\x00CODE${codeSpans.length - 1}\x00`
  })

  // Images: ![alt](src)
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, src: string) => {
    if (MD_UNSAFE_SCHEMES.test(src)) return escapeHtml(alt)
    return `<img src="${src}" alt="${alt}" />`
  })

  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
    if (MD_UNSAFE_SCHEMES.test(href)) return text
    return `<a href="${href}">${text}</a>`
  })

  // Bold + italic: ***text*** or ___text___
  out = out.replace(/\*{3}(.+?)\*{3}/g, '<strong><em>$1</em></strong>')
  out = out.replace(/_{3}(.+?)_{3}/g, '<strong><em>$1</em></strong>')

  // Bold: **text** or __text__
  out = out.replace(/\*{2}(.+?)\*{2}/g, '<strong>$1</strong>')
  out = out.replace(/_{2}(.+?)_{2}/g, '<strong>$1</strong>')

  // Italic: *text* or _text_
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>')
  out = out.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>')

  // Strikethrough: ~~text~~
  out = out.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Restore inline code spans
  out = out.replace(/\x00CODE(\d+)\x00/g, (_m, idx: string) => codeSpans[parseInt(idx)])

  return out
}

/** Convert a markdown string to sanitized HTML. */
function renderMarkdownToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block: ```
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      i++ // skip closing ```
      const langAttr = lang ? ` data-language="${escapeHtml(lang)}"` : ''
      html.push(`<pre class="pf-code"><code${langAttr}>${codeLines.join('\n')}</code></pre>`)
      continue
    }

    // Horizontal rule: ---, ***, ___
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      html.push('<hr />')
      i++
      continue
    }

    // Heading: # ... ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`)
      i++
      continue
    }

    // Blockquote: > text
    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      html.push(`<blockquote>${renderMarkdownToHtml(quoteLines.join('\n'))}</blockquote>`)
      continue
    }

    // Unordered list: - item, * item, + item
    if (/^[\s]*[-*+]\s+/.test(line)) {
      html.push('<ul>')
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        html.push(`<li>${renderInline(lines[i].replace(/^[\s]*[-*+]\s+/, ''))}</li>`)
        i++
      }
      html.push('</ul>')
      continue
    }

    // Ordered list: 1. item
    if (/^[\s]*\d+\.\s+/.test(line)) {
      html.push('<ol>')
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        html.push(`<li>${renderInline(lines[i].replace(/^[\s]*\d+\.\s+/, ''))}</li>`)
        i++
      }
      html.push('</ol>')
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph — collect consecutive non-empty lines
    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,6}\s/.test(lines[i]) && !/^[-*+]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && !lines[i].startsWith('> ') && !lines[i].trimStart().startsWith('```') && !/^(\s*[-*_]\s*){3,}$/.test(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    html.push(`<p>${paraLines.map(renderInline).join('<br />')}</p>`)
  }

  return html.join('\n')
}

function renderKbd(node: ComponentNode, ctx: RenderContext): HTMLElement {
  const e = document.createElement('kbd')
  e.className = 'pf-kbd'
  e.textContent = resolveStr(node.content, ctx)
  return e
}
