# prefab

[![CI](https://github.com/Max-Health-Inc/prefab-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/Max-Health-Inc/prefab-ui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@max-health-inc/prefab)](https://www.npmjs.com/package/@max-health-inc/prefab)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript declarative UI component library for MCP apps. Wire-compatible with PrefectHQ's Python [prefab-ui](https://github.com/PrefectHQ/prefab) — **same `$prefab` JSON, two languages**.

Write MCP servers in **TypeScript/Bun** and generate the exact same wire format that Python servers produce. Render the output in **any web app** with the included vanilla DOM renderer. Full circle: server-side DSL → JSON → browser UI.

- **100+ components** — layout, form, data, charts, media, interactive, control flow
- **Reactive state** — `rx()` expressions, `SetState`/`ToggleState`/`AppendState` actions
- **MCP-native** — `display()`, `display_form()`, `CallTool`, `SendMessage` built in
- **Browser renderer** — 54KB IIFE bundle, zero dependencies, vanilla DOM
- **ext-apps bridge** — `app()` factory with PostMessage transport, host theme, lifecycle hooks
- **Auto-renderers** — `autoTable()`, `autoChart()`, `autoForm()`, `autoMetrics()` and more

## Works Everywhere

The renderer is **vanilla DOM** — no framework dependency. Drop it into any web app:

- **React** — mount into a `ref` div
- **Vue / Svelte / Angular** — same, it's just DOM
- **Plain HTML** — single `<script>` tag
- **Electron / Tauri** — desktop apps with web views
- **Any iframe** — ext-apps, embedded widgets, sandboxed UIs

Any app that connects to MCP servers can render `$prefab` tool output as rich interactive UI — tables, charts, forms, badges — with zero custom code.

## Install

```bash
npm install @max-health-inc/prefab
# or
bun add @max-health-inc/prefab
```

## Quick Start

### Server-side (MCP tool handler)

```ts
import { display, autoTable, H1, Column } from '@max-health-inc/prefab'

async function listUsers(args: any) {
  const users = await db.query('SELECT * FROM users')
  return display(
    Column(
      H1('Users'),
      autoTable(users),
    ),
    { title: 'User List' }
  )
}
```

### Client-side (browser ext-app)

```html
<script src="https://cdn.jsdelivr.net/npm/@max-health-inc/prefab/dist/renderer.min.js"></script>
<script>
  const ui = await prefab.app();

  ui.onToolInput((args) => {
    ui.render('#root',
      prefab.Column(
        prefab.H1('Results'),
        prefab.autoTable(args.data),
      )
    );
  });
</script>
```

## Components

### Layout
`Column`, `Row`, `Grid`, `GridItem`, `Container`, `Div`, `Span`, `Dashboard`, `DashboardItem`, `Pages`, `Page`

### Typography
`Heading`, `H1`–`H4`, `Text`, `P`, `Lead`, `Large`, `Small`, `Muted`, `BlockQuote`, `Label`, `Link`, `Code`, `Markdown`, `Kbd`

### Card
`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

### Data Display
`DataTable`, `col`, `Badge`, `Dot`, `Metric`, `Ring`, `Progress`, `Separator`, `Loader`, `Icon`

### Table
`Table`, `TableHead`, `TableBody`, `TableFooter`, `TableRow`, `TableHeader`, `TableCell`, `TableCaption`, `ExpandableRow`

### Form
`Form`, `Input`, `Textarea`, `Button`, `ButtonGroup`, `Select`, `SelectOption`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `Checkbox`, `Switch`, `Slider`, `Radio`, `RadioGroup`, `Combobox`, `ComboboxOption`, `ComboboxGroup`, `ComboboxLabel`, `ComboboxSeparator`, `Calendar`, `DatePicker`, `Field`, `FieldTitle`, `FieldDescription`, `FieldContent`, `FieldError`, `ChoiceCard`

### Interactive
`Tabs`, `Tab`, `Accordion`, `AccordionItem`, `Dialog`, `Popover`, `Tooltip`, `HoverCard`, `Carousel`

### Charts
`BarChart`, `LineChart`, `AreaChart`, `PieChart`, `RadarChart`, `ScatterChart`, `Sparkline`, `RadialChart`, `Histogram`

### Media
`Image`, `Audio`, `Video`, `Embed`, `Svg`, `DropZone`, `Mermaid`

### Alert
`Alert`, `AlertTitle`, `AlertDescription`

### Control Flow
`ForEach`, `If`, `Elif`, `Else`, `Define`, `Use`, `Slot`

## Reactive Expressions

Use `rx()` to create reactive expressions that update when state changes:

```ts
import { rx, ITEM, INDEX, STATE } from '@max-health-inc/prefab'

// String interpolation
Text(rx`Hello, ${STATE}.name!`)

// Ternary
Badge(rx`${STATE}.status == 'active' ? 'Online' : 'Offline'`)

// Pipes (filters)
Text(rx`${STATE}.amount | currency`)
Text(rx`${STATE}.items | length`)
Text(rx`${STATE}.name | upper | truncate:20`)
```

**Built-in pipes:** `upper`, `lower`, `capitalize`, `truncate`, `currency`, `number`, `percent`, `date`, `time`, `datetime`, `length`, `default`, `json`, `keys`, `values`, `first`, `last`

## Actions

Actions are triggered by user interactions (`onClick`, `onChange`, `onSubmit`) or lifecycle events (`onMount`):

```ts
import { SetState, CallTool, ShowToast, rx } from '@max-health-inc/prefab'

// Client-side state mutation
Button('Increment', { onClick: SetState('count', rx`${STATE}.count + 1`) })

// MCP tool call
Button('Refresh', { onClick: CallTool('get_data', { id: rx`${STATE}.selectedId` }) })

// Toast notification
Button('Save', { onClick: ShowToast('Saved!', { variant: 'success' }) })
```

**Client actions:** `SetState`, `ToggleState`, `AppendState`, `PopState`, `ShowToast`, `CloseOverlay`, `OpenLink`, `SetInterval`, `Fetch`, `OpenFilePicker`, `CallHandler`

**MCP actions:** `CallTool`, `SendMessage`, `UpdateContext`, `RequestDisplayMode`

## Auto-Renderers

Generate complete UIs from raw data — no manual component wiring:

```ts
import { autoTable, autoChart, autoForm, autoMetrics } from '@max-health-inc/prefab'

// Table from array of objects
autoTable(users, { title: 'Users', searchable: true })

// Chart from data (auto-selects best chart type)
autoChart(salesData, { title: 'Revenue', type: 'bar' })

// Form from field definitions
autoForm([
  { name: 'email', type: 'email', required: true },
  { name: 'role', type: 'select', options: ['admin', 'user'] },
], { submitTool: 'create_user' })

// Metric cards from numeric data
autoMetrics([
  { label: 'Revenue', value: 125000, format: 'currency' },
  { label: 'Users', value: 3420, change: 12.5 },
])
```

**Auto-renderers:** `autoDetail`, `autoTable`, `autoChart`, `autoForm`, `autoComparison`, `autoMetrics`, `autoTimeline`, `autoProgress`

## MCP Display Helpers

Return UIs from MCP tool handlers:

```ts
import { display, display_form, display_update, display_error } from '@max-health-inc/prefab/mcp'

// Full UI
return display(Column(H1('Dashboard'), autoMetrics(kpis)), { title: 'Dashboard' })

// Form that submits back to a tool
return display_form('update_user', [
  { name: 'name', type: 'text', required: true },
  { name: 'email', type: 'email' },
], { title: 'Edit User' })

// Partial state update (no full re-render)
return display_update({ count: 42, status: 'complete' })

// Error display
return display_error('User not found', { code: 404 })
```

## Browser Renderer

The renderer is a 54KB IIFE bundle with zero external dependencies:

```html
<script src="renderer.min.js"></script>
<script>
  // Mount from wire format data
  const app = PrefabRenderer.mount(document.getElementById('root'), wireData);

  // Or auto-mount from embedded data
  // (set window.__PREFAB_DATA__ before loading the script)
</script>
```

### ext-apps Bridge

For MCP ext-apps running in iframes:

```js
const ui = await prefab.app();

// Receive tool input from host
ui.onToolInput((args) => {
  ui.render('#root', buildUI(args));
});

// Call tools on the host
const result = await ui.callTool('get_data', { query: 'active users' });

// Request display mode change
ui.requestMode('fullscreen');

// Access host context
console.log(ui.host);        // { name, version, ... }
console.log(ui.capabilities); // { toast, clipboard, ... }
console.log(ui.theme);       // host CSS variables
```

## Wire Format

All UIs serialize to the `$prefab` wire format (JSON):

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Column",
    "children": [
      { "type": "H1", "content": "Hello" },
      { "type": "Text", "content": "{{ state.message }}" }
    ]
  },
  "state": {
    "message": "Welcome to prefab"
  },
  "theme": {
    "light": { "primary": "#3b82f6" },
    "dark": { "primary": "#60a5fa" }
  }
}
```

### Wire Format Fields

| Field | Type | Description |
|---|---|---|
| `$prefab` | `{ version: string }` | Format identifier and version |
| `view` | `ComponentJSON` | Root component tree |
| `state` | `Record<string, unknown>` | Initial reactive state |
| `theme` | `{ light?, dark? }` | CSS custom property overrides |
| `defs` | `Record<string, ComponentJSON>` | Reusable component templates |
| `keyBindings` | `Record<string, ActionJSON>` | Keyboard shortcut → action mappings |

### Component JSON Shape

```json
{
  "type": "Button",
  "content": "Click me",
  "variant": "default",
  "onClick": {
    "type": "SetState",
    "key": "count",
    "value": "{{ state.count + 1 }}"
  },
  "children": []
}
```

## Subpath Exports

```ts
import { ... } from '@max-health-inc/prefab'           // Everything
import { ... } from '@max-health-inc/prefab/actions'    // Actions only
import { ... } from '@max-health-inc/prefab/rx'         // Rx expressions only
import { ... } from '@max-health-inc/prefab/charts'     // Chart components only
import { ... } from '@max-health-inc/prefab/mcp'        // MCP display helpers
import { ... } from '@max-health-inc/prefab/renderer'   // Browser renderer
```

## Development

```bash
bun install          # Install dependencies
bun test             # Run tests (362 passing)
bun run build        # TypeScript compile + IIFE bundle
bun run lint         # ESLint
bun run typecheck    # Type check without emitting
```

## License

MIT
