/**
 * TDD edge-case tests for the Markdown renderer.
 *
 * Written FIRST — then we fix the renderer to make them pass.
 *
 * @happy-dom
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Store } from '../src/renderer/state'
import { renderNode } from '../src/renderer/engine'
import type { ComponentNode, RenderContext } from '../src/renderer/engine'
import { registerAllComponents } from '../src/renderer/components/index'
import { createNoopTransport } from '../src/renderer/transport'

beforeEach(() => { registerAllComponents() })

function makeCtx(state?: Record<string, unknown>): RenderContext {
  return {
    store: new Store(state),
    scope: {},
    transport: createNoopTransport(),
    rerender: () => {},
  }
}

function md(content: string): HTMLElement {
  const node: ComponentNode = { type: 'Markdown', content }
  return renderNode(node, makeCtx()) as HTMLElement
}

// ── Empty / whitespace input ─────────────────────────────────────────────────

describe('Markdown: empty/whitespace', () => {
  it('empty string produces no content', () => {
    const dom = md('')
    expect(dom.innerHTML.trim()).toBe('')
  })

  it('whitespace-only produces no content', () => {
    const dom = md('   \n  \n   ')
    expect(dom.innerHTML.trim()).toBe('')
  })

  it('single newline produces no content', () => {
    const dom = md('\n')
    expect(dom.innerHTML.trim()).toBe('')
  })
})

// ── Windows line endings ─────────────────────────────────────────────────────

describe('Markdown: CRLF line endings', () => {
  it('handles \\r\\n line breaks', () => {
    const dom = md('# Title\r\n\r\nParagraph text')
    expect(dom.querySelector('h1')?.textContent).toBe('Title')
    expect(dom.querySelector('p')?.textContent).toBe('Paragraph text')
  })

  it('handles \\r\\n in lists', () => {
    const dom = md('- A\r\n- B\r\n- C')
    expect(dom.querySelectorAll('li').length).toBe(3)
  })

  it('handles \\r\\n in code blocks', () => {
    const dom = md('```\r\nline 1\r\nline 2\r\n```')
    const code = dom.querySelector('code')!
    expect(code.textContent).toContain('line 1')
    expect(code.textContent).toContain('line 2')
  })
})

// ── Heading edge cases ───────────────────────────────────────────────────────

describe('Markdown: heading edges', () => {
  it('all six heading levels', () => {
    const dom = md('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6')
    for (let i = 1; i <= 6; i++) {
      expect(dom.querySelector(`h${i}`)?.textContent).toBe(`H${i}`)
    }
  })

  it('heading with inline bold', () => {
    const dom = md('# **Bold** heading')
    const h1 = dom.querySelector('h1')!
    expect(h1.querySelector('strong')?.textContent).toBe('Bold')
    expect(h1.textContent).toContain('heading')
  })

  it('heading with inline code', () => {
    const dom = md('## Use `npm install`')
    const h2 = dom.querySelector('h2')!
    expect(h2.querySelector('code')?.textContent).toBe('npm install')
  })

  it('# without space is not a heading', () => {
    const dom = md('#notaheading')
    expect(dom.querySelector('h1')).toBeNull()
    expect(dom.querySelector('p')?.textContent).toBe('#notaheading')
  })

  it('####### (7 hashes) is not a heading', () => {
    const dom = md('####### Too many')
    expect(dom.querySelector('h7' as string)).toBeNull()
    // should be a paragraph
    expect(dom.querySelector('p')).toBeTruthy()
  })

  it('consecutive headings without blank lines', () => {
    const dom = md('# First\n## Second\n### Third')
    expect(dom.querySelector('h1')?.textContent).toBe('First')
    expect(dom.querySelector('h2')?.textContent).toBe('Second')
    expect(dom.querySelector('h3')?.textContent).toBe('Third')
  })
})

// ── Inline formatting edge cases ─────────────────────────────────────────────

describe('Markdown: inline edges', () => {
  it('bold inside italic: *foo **bar** baz*', () => {
    const dom = md('*foo **bar** baz*')
    expect(dom.querySelector('em')).toBeTruthy()
    expect(dom.querySelector('strong')).toBeTruthy()
  })

  it('multiple bold segments in one line', () => {
    const dom = md('**a** and **b** and **c**')
    const strongs = dom.querySelectorAll('strong')
    expect(strongs.length).toBe(3)
  })

  it('multiple inline codes in one line', () => {
    const dom = md('Use `foo` and `bar` together')
    const codes = dom.querySelectorAll('code')
    expect(codes.length).toBe(2)
    expect(codes[0].textContent).toBe('foo')
    expect(codes[1].textContent).toBe('bar')
  })

  it('underscores inside words are NOT italic: foo_bar_baz', () => {
    const dom = md('foo_bar_baz')
    expect(dom.querySelector('em')).toBeNull()
    expect(dom.textContent).toContain('foo_bar_baz')
  })

  it('asterisk italic inside a sentence', () => {
    const dom = md('This is *very* important')
    expect(dom.querySelector('em')?.textContent).toBe('very')
  })

  it('unclosed bold is not rendered as bold', () => {
    const dom = md('**unclosed bold')
    expect(dom.querySelector('strong')).toBeNull()
    // Should still have the asterisks as text
    expect(dom.textContent).toContain('**unclosed bold')
  })

  it('unclosed italic is not rendered as italic', () => {
    const dom = md('*unclosed italic')
    expect(dom.querySelector('em')).toBeNull()
    expect(dom.textContent).toContain('*unclosed italic')
  })

  it('inline code protects its contents from formatting', () => {
    const dom = md('Use `**not bold**` here')
    const code = dom.querySelector('code')!
    expect(code.textContent).toContain('**not bold**')
    // The bold markers inside code should NOT produce <strong>
    expect(code.querySelector('strong')).toBeNull()
  })

  it('empty bold ** ** does not crash', () => {
    const dom = md('before ** ** after')
    expect(dom.textContent).toBeTruthy()
  })
})

// ── Link edge cases ──────────────────────────────────────────────────────────

describe('Markdown: link edges', () => {
  it('link with parentheses in URL', () => {
    const dom = md('[wiki](https://en.wikipedia.org/wiki/Foo_(bar))')
    const a = dom.querySelector('a')
    expect(a).toBeTruthy()
    expect(a?.textContent).toBe('wiki')
  })

  it('link with bold text: [**bold link**](url)', () => {
    const dom = md('[**bold link**](https://example.com)')
    const a = dom.querySelector('a')!
    expect(a.querySelector('strong')?.textContent).toBe('bold link')
  })

  it('multiple links in one line', () => {
    const dom = md('[a](https://a.com) and [b](https://b.com)')
    const links = dom.querySelectorAll('a')
    expect(links.length).toBe(2)
  })

  it('data: URL in image is blocked', () => {
    const dom = md('![xss](data:text/html,<script>alert(1)</script>)')
    expect(dom.querySelector('img')).toBeNull()
  })

  it('vbscript: URL in link is blocked', () => {
    const dom = md('[click](vbscript:alert(1))')
    expect(dom.querySelector('a')).toBeNull()
  })

  it('autolink-style bare URL is rendered as text (not auto-linked)', () => {
    const dom = md('Visit https://example.com today')
    // Our lightweight parser doesn't auto-link bare URLs — just text
    expect(dom.querySelector('a')).toBeNull()
    expect(dom.textContent).toContain('https://example.com')
  })
})

// ── List edge cases ──────────────────────────────────────────────────────────

describe('Markdown: list edges', () => {
  it('list items with inline formatting', () => {
    const dom = md('- **bold** item\n- *italic* item\n- `code` item')
    const items = dom.querySelectorAll('li')
    expect(items.length).toBe(3)
    expect(items[0].querySelector('strong')).toBeTruthy()
    expect(items[1].querySelector('em')).toBeTruthy()
    expect(items[2].querySelector('code')).toBeTruthy()
  })

  it('list with + marker', () => {
    const dom = md('+ Item A\n+ Item B')
    expect(dom.querySelectorAll('li').length).toBe(2)
  })

  it('list with * marker (not confused with HR)', () => {
    const dom = md('* Item 1\n* Item 2')
    expect(dom.querySelector('ul')).toBeTruthy()
    expect(dom.querySelectorAll('li').length).toBe(2)
  })

  it('ordered list preserves text', () => {
    const dom = md('1. First\n2. Second\n3. Third')
    const items = dom.querySelectorAll('li')
    expect(items.length).toBe(3)
    expect(items[2].textContent).toBe('Third')
  })

  it('list followed by paragraph', () => {
    const dom = md('- Item\n\nParagraph after')
    expect(dom.querySelector('ul')).toBeTruthy()
    expect(dom.querySelector('p')?.textContent).toBe('Paragraph after')
  })

  it('unordered list then ordered list as separate lists', () => {
    const dom = md('- A\n- B\n\n1. One\n2. Two')
    expect(dom.querySelector('ul')).toBeTruthy()
    expect(dom.querySelector('ol')).toBeTruthy()
  })
})

// ── Code block edge cases ────────────────────────────────────────────────────

describe('Markdown: code block edges', () => {
  it('code block without language tag', () => {
    const dom = md('```\nplain code\n```')
    const code = dom.querySelector('code')!
    expect(code.textContent).toBe('plain code')
    expect(code.getAttribute('data-language')).toBeNull()
  })

  it('code block with empty lines inside', () => {
    const dom = md('```\nline 1\n\nline 3\n```')
    const code = dom.querySelector('code')!
    expect(code.textContent).toBe('line 1\n\nline 3')
  })

  it('code block preserves indentation', () => {
    const dom = md('```\n  indented\n    more\n```')
    const code = dom.querySelector('code')!
    expect(code.textContent).toBe('  indented\n    more')
  })

  it('HTML in code block is escaped', () => {
    const dom = md('```\n<script>alert("xss")</script>\n```')
    const code = dom.querySelector('code')!
    expect(code.textContent).toContain('<script>')
    // Should be escaped in the raw HTML
    expect(dom.querySelector('script')).toBeNull()
  })

  it('unclosed code block treats rest as code', () => {
    const dom = md('```\nno closing fence')
    const code = dom.querySelector('code')!
    expect(code.textContent).toContain('no closing fence')
  })

  it('markdown inside code block is not parsed', () => {
    const dom = md('```\n# Not a heading\n**Not bold**\n```')
    const code = dom.querySelector('code')!
    expect(code.textContent).toContain('# Not a heading')
    expect(dom.querySelectorAll('h1').length).toBe(0)
  })
})

// ── Blockquote edge cases ────────────────────────────────────────────────────

describe('Markdown: blockquote edges', () => {
  it('multi-line blockquote', () => {
    const dom = md('> Line 1\n> Line 2\n> Line 3')
    const bq = dom.querySelector('blockquote')!
    expect(bq.textContent).toContain('Line 1')
    expect(bq.textContent).toContain('Line 3')
  })

  it('blockquote with inline formatting', () => {
    const dom = md('> **Important**: do this')
    const bq = dom.querySelector('blockquote')!
    expect(bq.querySelector('strong')?.textContent).toBe('Important')
  })

  it('empty blockquote line (just >)', () => {
    const dom = md('> First\n>\n> Third')
    const bq = dom.querySelector('blockquote')!
    expect(bq.textContent).toContain('First')
    expect(bq.textContent).toContain('Third')
  })

  it('nested blockquotes: >> text', () => {
    const dom = md('> Outer\n> > Inner')
    const outer = dom.querySelector('blockquote')!
    expect(outer).toBeTruthy()
    // Inner blockquote should be nested
    const inner = outer.querySelector('blockquote')
    expect(inner).toBeTruthy()
    expect(inner?.textContent).toContain('Inner')
  })
})

// ── Horizontal rule edge cases ───────────────────────────────────────────────

describe('Markdown: horizontal rule edges', () => {
  it('--- with spaces: - - -', () => {
    const dom = md('Above\n\n- - -\n\nBelow')
    expect(dom.querySelector('hr')).toBeTruthy()
  })

  it('*** as horizontal rule', () => {
    const dom = md('Above\n\n***\n\nBelow')
    expect(dom.querySelector('hr')).toBeTruthy()
  })

  it('___ as horizontal rule', () => {
    const dom = md('Above\n\n___\n\nBelow')
    expect(dom.querySelector('hr')).toBeTruthy()
  })

  it('-- (only two dashes) is NOT a rule', () => {
    const dom = md('--')
    expect(dom.querySelector('hr')).toBeNull()
  })
})

// ── XSS / security edge cases ────────────────────────────────────────────────

describe('Markdown: XSS prevention', () => {
  it('script tag in inline text', () => {
    const dom = md('Hello <script>alert(1)</script> world')
    expect(dom.querySelector('script')).toBeNull()
    expect(dom.innerHTML).toContain('&lt;script&gt;')
  })

  it('on-event attribute injection via image', () => {
    const dom = md('![alt](x" onerror="alert(1))')
    // Should not produce a working onerror handler
    const img = dom.querySelector('img')
    if (img) {
      expect(img.getAttribute('onerror')).toBeNull()
    }
  })

  it('nested HTML tag attempt', () => {
    const dom = md('<div onmouseover="alert(1)">hover me</div>')
    expect(dom.querySelector('div[onmouseover]')).toBeNull()
  })

  it('javascript URL with mixed case: JaVaScRiPt:', () => {
    const dom = md('[click](JaVaScRiPt:alert(1))')
    expect(dom.querySelector('a')).toBeNull()
  })

  it('data URL in image with base64 payload', () => {
    const dom = md('![x](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4=)')
    expect(dom.querySelector('img')).toBeNull()
  })
})

// ── Mixed content / complex documents ────────────────────────────────────────

describe('Markdown: complex documents', () => {
  it('paragraph immediately after heading (no blank line)', () => {
    const dom = md('# Title\nParagraph text')
    expect(dom.querySelector('h1')?.textContent).toBe('Title')
    expect(dom.querySelector('p')?.textContent).toBe('Paragraph text')
  })

  it('heading immediately after paragraph', () => {
    const dom = md('Some text\n# Heading')
    expect(dom.querySelector('p')?.textContent).toBe('Some text')
    expect(dom.querySelector('h1')?.textContent).toBe('Heading')
  })

  it('code block immediately after list', () => {
    const dom = md('- Item 1\n- Item 2\n\n```\ncode\n```')
    expect(dom.querySelector('ul')).toBeTruthy()
    expect(dom.querySelector('pre')).toBeTruthy()
  })

  it('blockquote followed by list', () => {
    const dom = md('> Quote\n\n- List item')
    expect(dom.querySelector('blockquote')).toBeTruthy()
    expect(dom.querySelector('ul')).toBeTruthy()
  })

  it('long document with all element types', () => {
    const doc = `# Main Title

A paragraph with **bold**, *italic*, and \`code\`.

## Section 1

- Item A
- Item B
- Item C

1. First
2. Second

> A blockquote with **emphasis**

---

### Code Example

\`\`\`python
def hello():
    print("world")
\`\`\`

[Link](https://example.com) and ~~deleted~~.

![Image](https://example.com/img.png)`

    const dom = md(doc)
    expect(dom.querySelector('h1')).toBeTruthy()
    expect(dom.querySelector('h2')).toBeTruthy()
    expect(dom.querySelector('h3')).toBeTruthy()
    expect(dom.querySelector('ul')).toBeTruthy()
    expect(dom.querySelector('ol')).toBeTruthy()
    expect(dom.querySelector('blockquote')).toBeTruthy()
    expect(dom.querySelector('hr')).toBeTruthy()
    expect(dom.querySelector('pre')).toBeTruthy()
    expect(dom.querySelector('a')).toBeTruthy()
    expect(dom.querySelector('del')).toBeTruthy()
    expect(dom.querySelector('img')).toBeTruthy()
    expect(dom.querySelector('strong')).toBeTruthy()
    expect(dom.querySelector('em')).toBeTruthy()
    expect(dom.querySelector('code')).toBeTruthy()
  })
})
