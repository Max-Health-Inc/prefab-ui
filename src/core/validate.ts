/**
 * Wire format validation — runtime schema checks for $prefab wire data.
 *
 * Validates that incoming JSON conforms to the $prefab wire format
 * and returns structured error information.
 */

import type { PrefabWireFormat } from '../app.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ── Known component types (all registered) ───────────────────────────────────

const KNOWN_TYPES = new Set([
  // Layout
  'Column', 'Row', 'Grid', 'GridItem', 'Container', 'Div', 'Span',
  'Dashboard', 'DashboardItem', 'Pages', 'Page',
  // Typography
  'Heading', 'H1', 'H2', 'H3', 'H4', 'Text', 'P', 'Lead', 'Large',
  'Small', 'Muted', 'BlockQuote', 'Label', 'Link', 'Code', 'Markdown', 'Kbd',
  // Card
  'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter',
  // Data
  'DataTable', 'Badge', 'Dot', 'Metric', 'Ring', 'Progress', 'Separator', 'Loader', 'Icon',
  // Table
  'Table', 'TableHead', 'TableBody', 'TableFooter', 'TableRow',
  'TableHeader', 'TableCell', 'TableCaption', 'ExpandableRow',
  // Form
  'Form', 'Input', 'Textarea', 'Button', 'ButtonGroup',
  'Select', 'SelectOption', 'SelectGroup', 'SelectLabel', 'SelectSeparator',
  'Checkbox', 'Switch', 'Slider',
  'Radio', 'RadioGroup',
  'Combobox', 'ComboboxOption', 'ComboboxGroup', 'ComboboxLabel', 'ComboboxSeparator',
  'Calendar', 'DatePicker',
  'Field', 'FieldTitle', 'FieldDescription', 'FieldContent', 'FieldError', 'ChoiceCard',
  // Interactive
  'Tabs', 'Tab', 'Accordion', 'AccordionItem', 'Dialog', 'Popover',
  'Tooltip', 'HoverCard', 'Carousel',
  // Control
  'ForEach', 'If', 'Elif', 'Else', 'Define', 'Use', 'Slot',
  // Alert
  'Alert', 'AlertTitle', 'AlertDescription',
  // Media
  'Image', 'Audio', 'Video', 'Embed', 'Svg', 'DropZone', 'Mermaid',
  // Charts
  'BarChart', 'LineChart', 'AreaChart', 'PieChart', 'RadarChart',
  'ScatterChart', 'Sparkline', 'RadialChart', 'Histogram',
])

// ── Validator ────────────────────────────────────────────────────────────────

/**
 * Validate a wire format payload. Returns `{ valid: true, errors: [] }` if OK,
 * or `{ valid: false, errors: [...] }` with details about what's wrong.
 *
 * @param data - The raw parsed JSON to validate
 * @param opts - Optional: `strict` mode warns on unknown component types
 */
export function validateWireFormat(
  data: unknown,
  opts: { strict?: boolean } = {},
): ValidationResult {
  const errors: ValidationError[] = []
  const strict = opts.strict ?? false

  if (data == null || typeof data !== 'object') {
    errors.push({ path: '$', message: 'Wire data must be a non-null object' })
    return { valid: false, errors }
  }

  const obj = data as Record<string, unknown>

  // $prefab header
  if (obj.$prefab == null || typeof obj.$prefab !== 'object') {
    errors.push({ path: '$.$prefab', message: 'Missing or invalid $prefab header' })
  } else {
    const header = obj.$prefab as Record<string, unknown>
    if (typeof header.version !== 'string') {
      errors.push({ path: '$.$prefab.version', message: 'version must be a string' })
    }
  }

  // view (required)
  if (obj.view == null) {
    errors.push({ path: '$.view', message: 'Missing required "view" field' })
  } else {
    validateComponent(obj.view, '$.view', errors, strict)
  }

  // state (optional)
  if (obj.state !== undefined) {
    if (obj.state === null || typeof obj.state !== 'object' || Array.isArray(obj.state)) {
      errors.push({ path: '$.state', message: 'state must be a plain object' })
    }
  }

  // theme (optional)
  if (obj.theme !== undefined) {
    validateTheme(obj.theme, errors)
  }

  // defs (optional)
  if (obj.defs !== undefined) {
    if (obj.defs === null || typeof obj.defs !== 'object' || Array.isArray(obj.defs)) {
      errors.push({ path: '$.defs', message: 'defs must be a plain object' })
    } else {
      for (const [name, def] of Object.entries(obj.defs as Record<string, unknown>)) {
        validateComponent(def, `$.defs.${name}`, errors, strict)
      }
    }
  }

  // keyBindings (optional)
  if (obj.keyBindings !== undefined) {
    if (obj.keyBindings === null || typeof obj.keyBindings !== 'object' || Array.isArray(obj.keyBindings)) {
      errors.push({ path: '$.keyBindings', message: 'keyBindings must be a plain object' })
    } else {
      for (const [key, action] of Object.entries(obj.keyBindings as Record<string, unknown>)) {
        validateAction(action, `$.keyBindings.${key}`, errors)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Quick boolean check — returns true if data looks like valid $prefab wire format.
 */
export function isValidWireFormat(data: unknown): data is PrefabWireFormat {
  return validateWireFormat(data).valid
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function validateComponent(
  node: unknown,
  path: string,
  errors: ValidationError[],
  strict: boolean,
): void {
  if (node == null || typeof node !== 'object' || Array.isArray(node)) {
    errors.push({ path, message: 'Component must be a plain object' })
    return
  }

  const comp = node as Record<string, unknown>

  if (typeof comp.type !== 'string' || comp.type.length === 0) {
    errors.push({ path: `${path}.type`, message: 'Component must have a non-empty "type" string' })
    return
  }

  if (strict && !KNOWN_TYPES.has(comp.type)) {
    errors.push({ path: `${path}.type`, message: `Unknown component type: "${comp.type}"` })
  }

  // Validate children recursively
  if (comp.children !== undefined) {
    if (!Array.isArray(comp.children)) {
      errors.push({ path: `${path}.children`, message: 'children must be an array' })
    } else {
      for (let i = 0; i < comp.children.length; i++) {
        validateComponent(comp.children[i], `${path}.children[${i}]`, errors, strict)
      }
    }
  }

  // Validate action props
  for (const prop of ['onClick', 'onChange', 'onSubmit', 'onMount', 'onClose']) {
    if (comp[prop] !== undefined) {
      validateAction(comp[prop], `${path}.${prop}`, errors)
    }
  }
}

function validateAction(action: unknown, path: string, errors: ValidationError[]): void {
  if (Array.isArray(action)) {
    for (let i = 0; i < action.length; i++) {
      validateAction(action[i], `${path}[${i}]`, errors)
    }
    return
  }

  if (action == null || typeof action !== 'object') {
    errors.push({ path, message: 'Action must be an object or array of objects' })
    return
  }

  const act = action as Record<string, unknown>
  const hasType = typeof act.type === 'string' && act.type.length > 0
  const hasAction = typeof act.action === 'string' && act.action.length > 0
  if (!hasType && !hasAction) {
    errors.push({ path: `${path}.type`, message: 'Action must have a non-empty "type" or "action" string' })
  }
}

function validateTheme(theme: unknown, errors: ValidationError[]): void {
  if (theme === null || typeof theme !== 'object' || Array.isArray(theme)) {
    errors.push({ path: '$.theme', message: 'theme must be a plain object' })
    return
  }

  const t = theme as Record<string, unknown>
  for (const mode of ['light', 'dark']) {
    if (t[mode] !== undefined) {
      if (t[mode] === null || typeof t[mode] !== 'object' || Array.isArray(t[mode])) {
        errors.push({ path: `$.theme.${mode}`, message: `theme.${mode} must be a plain object` })
      }
    }
  }
}
