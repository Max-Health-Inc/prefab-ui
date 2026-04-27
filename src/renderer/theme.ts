/**
 * Theme application — CSS custom properties from theme field.
 */

export interface ThemeConfig {
  light?: Record<string, string>
  dark?: Record<string, string>
}

/**
 * Apply theme CSS custom properties to the root element.
 * Light theme props go on :root, dark on [data-theme="dark"].
 */
/** Strip characters that could break out of a CSS property name. */
function sanitizeCssIdent(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '')
}

/** Strip characters/patterns that could escape CSS value context. */
function sanitizeCssValue(value: string): string {
  // Remove braces, semicolons, url()/expression() to prevent injection
  return value.replace(/[{}<>;]/g, '').replace(/\b(url|expression)\s*\(/gi, '')
}

export function applyTheme(root: HTMLElement, theme?: ThemeConfig): void {
  if (!theme) return

  if (theme.light) {
    for (const [key, value] of Object.entries(theme.light)) {
      root.style.setProperty(`--${sanitizeCssIdent(key)}`, sanitizeCssValue(value))
    }
  }

  if (theme.dark) {
    // Create a style element for dark mode
    const styleId = 'prefab-dark-theme'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    const props = Object.entries(theme.dark)
      .map(([key, value]) => `  --${sanitizeCssIdent(key)}: ${sanitizeCssValue(value)};`)
      .join('\n')
    styleEl.textContent = `[data-theme="dark"] {\n${props}\n}\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${props}\n  }\n}`
  }
}

/**
 * Apply keyboard shortcuts.
 */
export function applyKeyBindings(
  bindings: Record<string, unknown> | undefined,
  dispatch: (actions: unknown) => Promise<void>,
): (() => void) | undefined {
  if (!bindings || typeof document === 'undefined') return undefined

  const handler = (e: KeyboardEvent): void => {
    for (const [combo, actions] of Object.entries(bindings)) {
      if (matchCombo(combo, e)) {
        e.preventDefault()
        void dispatch(actions)
      }
    }
  }

  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}

function matchCombo(combo: string, e: KeyboardEvent): boolean {
  const parts = combo.toLowerCase().split('+').map(s => s.trim())
  const key = parts[parts.length - 1]
  const mods = new Set(parts.slice(0, -1))

  if (mods.has('ctrl') !== (e.ctrlKey || e.metaKey)) return false
  if (mods.has('shift') !== e.shiftKey) return false
  if (mods.has('alt') !== e.altKey) return false

  return e.key.toLowerCase() === key
}
