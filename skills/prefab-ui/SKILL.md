---
name: prefab-ui
description: Generate rich, interactive UIs as JSON using the prefab wire format. Use when building MCP tool UIs, dashboards, forms, data tables, charts, patient cards, settings panels, or any structured UI that an LLM should return as JSON. Covers the prefab v0.2 protocol, components, actions, reactive state, expressions, and theming.
---

# Prefab UI — Wire Format Skill

> **Package:** `@maxhealth.tech/prefab` - protocol v0.2 | **Compatibility:** Any MCP-compatible host (VS Code, Claude Desktop, custom clients). The renderer is included in the npm package.

Generate valid `$prefab` wire-format JSON that renders into themed, interactive UIs.

## Quick Start — Envelope

Every prefab UI is a JSON object with this shape:

```json
{
  "$prefab": { "version": "0.2" },
  "view": { "type": "Column", "children": [...] },
  "state": { "count": 0 },
  "theme": { "light": { "primary": "#3b82f6" }, "dark": { "primary": "#60a5fa" } }
}
```

Only `$prefab` and `view` are required. Add `state` when you need reactive values, `theme` for custom colors.

## Component JSON

Every component is an object with `"type"` (PascalCase) plus type-specific props:

```json
{ "type": "Button", "label": "Save", "variant": "default", "onClick": { "action": "showToast", "message": "Saved!" } }
```

Use `"children"` for nesting. Use `"content"` for text content.

## Essential Rules

1. **Always wrap in envelope** — `{ "$prefab": { "version": "0.2" }, "view": { ... } }`
2. **PascalCase types** — `Column`, not `column`
3. **Layout first** — Use `Column` (vertical) or `Row` (horizontal) as root containers
4. **`gap` for spacing** — `{ "type": "Column", "gap": 16, "children": [...] }`
5. **Cards for grouping** — Wrap related content in `Card > CardHeader + CardContent + CardFooter`
6. **State for interactivity** — Declare initial values in `"state"`, reference via `{{ state.key }}`
7. **Actions on events** — `onClick`, `onChange`, `onSubmit` take action objects or arrays

## Component Quick Reference

### Layout
| Type | Purpose | Key Props |
|------|---------|-----------|
| `Column` | Vertical stack | `gap`, `align`, `justify` |
| `Row` | Horizontal stack | `gap`, `align`, `justify` |
| `Grid` | CSS grid | `columns`, `gap` |
| `GridItem` | Grid child | `span` |
| `Container` | Max-width wrapper | — |

### Typography
| Type | Purpose | Key Props |
|------|---------|-----------|
| `Heading` | Section heading | `content`, `level` (1-4) |
| `Text` | Body text | `content` |
| `Muted` | Secondary text | `content` |
| `Markdown` | Rich markdown | `content` |
| `Code` | Code block | `content` |
| `Link` | Hyperlink | `content`, `href`, `target` |

### Card
| Type | Purpose |
|------|---------|
| `Card` | Container with border + shadow |
| `CardHeader` | Top section (title area) |
| `CardTitle` | Card heading |
| `CardDescription` | Card subtitle |
| `CardContent` | Main content area |
| `CardFooter` | Bottom section (actions) |

### Data Display
| Type | Purpose | Key Props |
|------|---------|-----------|
| `DataTable` | Sortable/searchable table | `columns`, `rows`, `search`, `paginated` |
| `Badge` | Status pill | `label`, `variant` |
| `Metric` | KPI display | `label`, `value`, `change` |
| `Progress` | Progress bar | `value`, `max` |
| `Separator` | Divider line | — |

### Form
| Type | Purpose | Key Props |
|------|---------|-----------|
| `Input` | Text input | `name`, `inputType`, `placeholder`, `label` |
| `Textarea` | Multi-line input | `name`, `placeholder`, `rows` |
| `Button` | Action button | `label`, `variant`, `onClick` |
| `Select` | Dropdown (children: `SelectOption`) | `name` |
| `SelectOption` | Dropdown option | `label`, `value` |
| `Checkbox` | Boolean toggle | `name`, `label` |
| `Switch` | Toggle switch | `name`, `label` |
| `Slider` | Range input | `name`, `min`, `max`, `step` |

### Charts
| Type | Key Props |
|------|-----------|
| `BarChart` | `data`, `series`, `xAxis`, `height`, `showLegend` |
| `LineChart` | same |
| `AreaChart` | same |
| `PieChart` | `data`, `series`, `height` |
| `Sparkline` | `data`, `color`, `height` |

### Interactive
| Type | Purpose | Key Props |
|------|---------|-----------|
| `Tabs` / `Tab` | Tabbed view | `title` (on Tab) |
| `Accordion` / `AccordionItem` | Collapsible | `title` |
| `Dialog` | Modal | `title`, `trigger` |
| `Alert` | Banner message | `variant` (+ `AlertTitle`, `AlertDescription`) |

### Control Flow
| Type | Purpose | Key Props |
|------|---------|-----------|
| `ForEach` | Loop over array | `each`, `as` |
| `If` / `Elif` / `Else` | Conditional render | `condition` |

## Actions Quick Reference

```json
{ "action": "setState", "key": "name", "value": "Alice" }
{ "action": "toggleState", "key": "darkMode" }
{ "action": "appendState", "key": "items", "item": "{{ newItem }}" }
{ "action": "popState", "key": "items", "index": 0 }
{ "action": "showToast", "title": "Done!", "description": "Saved successfully." }
{ "action": "toolCall", "tool": "get_data", "arguments": { "id": "{{ state.selectedId }}" }, "resultKey": "data" }
{ "action": "openLink", "url": "https://example.com", "target": "_blank" }
{ "action": "fetch", "url": "/api/data", "method": "GET", "resultKey": "apiData" }
```

Multiple actions: use an array `[{ "action": "setState", ... }, { "action": "showToast", ... }]`

## Reactive Expressions

Use `{{ }}` in any string value to make it reactive:

```json
{ "type": "Text", "content": "Hello, {{ state.name }}!" }
{ "type": "Text", "content": "{{ state.count }} {{ state.count | pluralize:'item' }}" }
{ "type": "Badge", "label": "{{ state.active ? 'Online' : 'Offline' }}", "variant": "{{ state.active ? 'success' : 'secondary' }}" }
```

### Key Pipes
`upper`, `lower`, `truncate:N`, `currency:'USD'`, `number`, `percent`, `date`, `time`, `datetime`, `length`, `default:'fallback'`, `round:N`, `join:','`, `pluralize:'word'`

## Badge & Alert Variants

`default`, `secondary`, `outline`, `success`, `warning`, `destructive`, `info`

## Button Variants

`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`

## Additional Resources

For the complete wire format spec, see [references/wire-format.md](references/wire-format.md).
For all component props and examples, see [references/components.md](references/components.md).
For common UI patterns with full JSON, see [references/patterns.md](references/patterns.md).
