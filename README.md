# prefab

[![CI](https://github.com/Max-Health-Inc/prefab/actions/workflows/ci.yml/badge.svg)](https://github.com/Max-Health-Inc/prefab/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@maxhealth.tech/prefab)](https://www.npmjs.com/package/@maxhealth.tech/prefab)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript declarative UI component library for MCP apps. Wire-compatible with PrefectHQ's Python [prefab-ui](https://github.com/PrefectHQ/prefab) — **same `$prefab` v0.2 wire protocol**.

Write MCP servers in **TypeScript/Bun** and generate the same wire format that Python servers produce. Render the output in **any web app** with the included vanilla DOM renderer. Full circle: server-side DSL → JSON → browser UI.

> **Note:** This library is a superset of the Python `prefab-ui` (v0.19.1). Core components and the wire protocol are identical. Chart formatting features (`xAxisFormat`, `tooltipXFormat`, `tooltipXKey`, per-series `tooltipFormat`, dual Y-axis) are TS-only extensions — the Python lib does not yet emit them. The renderer handles both payloads seamlessly.

- **115+ components** — layout, form, data, charts, media, interactive, control flow
- **Reactive state** — `rx()` expressions, `SetState`/`ToggleState`/`AppendState` actions
- **MCP-native** — `display()`, `display_form()`, `CallTool`, `SendMessage` built in
- **Browser renderer** — zero dependencies, vanilla DOM (optional separate import)
- **PostMessage bridge** — `app()` factory with dual-protocol handshake, host theme, lifecycle hooks
- **Auto-renderers** — `autoTable()`, `autoChart()`, `autoForm()`, `autoMetrics()` and more

## Works Everywhere

The renderer is **vanilla DOM** — no framework dependency. Drop it into any web app:

- **React** — mount into a `ref` div
- **Vue / Svelte / Angular** — same, it's just DOM
- **Plain HTML** — single `<script>` tag
- **Electron / Tauri** — desktop apps with web views
- **Any iframe** — MCP Apps, embedded widgets, sandboxed UIs

Any app that connects to MCP servers can render `$prefab` tool output as rich interactive UI — tables, charts, forms, badges — with zero custom code.

## Install

```bash
npm install @maxhealth.tech/prefab
# or
bun add @maxhealth.tech/prefab
```

## Quick Start

### Server-side (MCP tool handler)

```ts
import { display, autoTable, H1, Column } from '@maxhealth.tech/prefab'

async function listUsers(args: any) {
  const users = await db.query('SELECT * FROM users')
  return display(
    Column({ children: [
      H1('Users'),
      autoTable(users),
    ]}),
    { title: 'User List' }
  )
}
```

### Client-side (browser ext-app)

The auto-mount bundle handles the full lifecycle — bridge handshake,
tool-result rendering, and DOM mounting — with a single `<script>` tag:

```html
<div id="root"></div>
<script src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab/dist/renderer.auto.min.js"></script>
```

Works in VS Code, Claude Desktop, ChatGPT, and any MCP Apps host.

For manual control, use `renderer.min.js` instead:

```html
<script src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab/dist/renderer.min.js"></script>
<script>
  const ui = await prefab.app();

  ui.onToolInput((args) => {
    // Render wire-format JSON received from the MCP host
    ui.mount('#root', args);
  });
</script>
```

## Components

### Layout
`Column`, `Row`, `Grid`, `GridItem`, `Container`, `Div`, `Span`, `Dashboard`, `DashboardItem`, `Pages`, `Page`, `Detail`, `MasterDetail`

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

#### Chart Formatting (Pipe Integration)

> **TS-only extension** — these props are not yet supported by the Python `prefab-ui` library. The renderer gracefully ignores them if absent, so Python-generated charts still render fine.

Charts use the same pipe system as `{{ value | pipe }}` expressions — all formatting is declarative JSON:

| Prop | Level | Effect |
|---|---|---|
| `xAxisFormat` | chart | Pipe applied to x-axis tick labels |
| `tooltipXFormat` | chart | Pipe applied to tooltip category label |
| `tooltipXKey` | chart | Read tooltip label from a different data key |
| `tooltipFormat` | per-series | Pipe applied to that series' value in tooltip |

```ts
// Same timestamp field, two presentations:
LineChart({
  data: timeseries,
  xAxis: 'timestamp',
  xAxisFormat: 'date',          // axis: "4/25/2026"
  tooltipXFormat: 'datetime',   // tooltip: "4/25/2026, 2:30:00 PM"
  series: [
    { dataKey: 'revenue', label: 'Revenue', tooltipFormat: 'currency' },
    { dataKey: 'growth', label: 'Growth', tooltipFormat: 'percent' },
  ],
})
```

All built-in pipes work: `upper`, `lower`, `truncate`, `currency`, `percent`, `compact`, `date`, `time`, `datetime`, `number`, `round`, plus custom wire pipes.

### Media
`Image`, `Audio`, `Video`, `Embed`, `Svg`, `DropZone`, `Mermaid`

### Alert
`Alert`, `AlertTitle`, `AlertDescription`

### Control Flow
`ForEach`, `If`, `Elif`, `Else`, `Define`, `Use`, `Slot`

## Reactive Expressions

Use `rx()` to create reactive expressions that update when state changes:

```ts
import { rx, STATE } from '@maxhealth.tech/prefab'

// Simple state reference
Text(rx('count'))                    // → "{{ count }}"

// Arithmetic
Text(rx('count').add(1))             // → "{{ count + 1 }}"

// Dot-path access
Text(rx('user').dot('name'))         // → "{{ user.name }}"

// Direct template string
Text('Hello, {{ user.name }}!')      // interpolated at render time

// Ternary
Badge(rx('status').eq('active').then('Online', 'Offline'))

// Pipes (filters)
Text(rx('amount').currency())        // → "{{ amount | currency }}"
Text(rx('items').length())           // → "{{ items | length }}"
Text(rx('name').upper().truncate(20)) // → "{{ name | upper | truncate:20 }}"

// STATE proxy (single-level shorthand: STATE.key → rx('key'))
Text(STATE.count)                    // → "{{ count }}"
```

**Built-in pipes:** `upper`, `lower`, `capitalize`, `truncate`, `currency`, `number`, `percent`, `date`, `time`, `datetime`, `length`, `default`, `json`, `keys`, `values`, `first`, `last`, `find`, `dot`, `join`, `abs`, `round`, `compact`, `pluralize`, `selectattr`, `rejectattr`

## Signals, Collections & Selection

Type-safe reactive primitives for master-detail patterns:

```ts
import {
  signal, collection, DataTable, col, Detail, MasterDetail,
  Heading, Text, Badge, PrefabApp,
} from '@maxhealth.tech/prefab'

const patients = collection('patients', data, { key: 'id' })
const sel = signal('selectedPatientId', patients.firstKey())
const ref = patients.by(sel)

const app = new PrefabApp({
  title: 'Patient Browser',
  view: MasterDetail({
    masterWidth: '350px',
    children: [
      DataTable({
        from: patients,
        selected: sel,
        columns: [
          col({ key: 'name', header: 'Name', format: 'humanName' }),
          col('gender'),
        ],
      }),
      Detail({
        of: ref,
        empty: Text('Select a patient'),
        children: [
          Heading(ref.dot('name')),
          Badge(ref.dot('gender')),
        ],
      }),
    ],
  }),
  // state auto-collected from signal() and collection() — no manual wiring
})
```

- **`signal(key, initial)`** — named reactive scalar, auto-registers state
- **`collection(key, rows, { key })`** — named keyed array with O(1) lookup
- **`ref.dot(field)`** — typed property access (`Ref<T[K]>`)
- **`ref.formatted(field, pipe)`** — dot + pipe shorthand for codegen
- **Auto state collection** — `PrefabApp` gathers state from signal/collection factories

## Custom Pipes

Extend the pipe system for domain-specific formatting:

```ts
import { registerPipe } from '@maxhealth.tech/prefab'

registerPipe('humanName', (names) => {
  const hn = (names as { family: string; given: string[] }[])[0]
  return hn ? `${hn.family}, ${hn.given.join(' ')}` : ''
})

registerPipe('quantity', (v, unit) => `${v} ${unit ?? ''}`)

// Now usable in expressions: {{ patient.name | humanName }}
// And in col descriptors:   col({ key: 'name', format: 'humanName' })
```

Built-in pipes always take precedence. Re-registration warns and overwrites (HMR-friendly).

## Actions

Actions are triggered by user interactions (`onClick`, `onChange`, `onSubmit`) or lifecycle events (`onMount`):

```ts
import { SetState, ToggleState, CallTool, ShowToast, OpenLink, rx } from '@maxhealth.tech/prefab'

// Client-side state mutation
Button('Increment', { onClick: new SetState('count', rx('count').add(1)) })

// Toggle boolean
Button('Toggle', { onClick: new ToggleState('expanded') })

// MCP tool call
Button('Refresh', { onClick: new CallTool('get_data', { arguments: { id: '{{ selectedId }}' } }) })

// Toast notification
Button('Save', { onClick: new ShowToast('Saved!', { variant: 'success' }) })
```

**Client actions:** `SetState`, `ToggleState`, `AppendState`, `PopState`, `ShowToast`, `CloseOverlay`, `OpenLink`, `SetInterval`, `Fetch`, `OpenFilePicker`, `CallHandler`

**MCP actions:** `CallTool`, `SendMessage`, `UpdateContext`, `RequestDisplayMode`

## Auto-Renderers

Generate complete UIs from raw data — no manual component wiring:

```ts
import { autoTable, autoChart, autoForm, autoMetrics } from '@maxhealth.tech/prefab'

// Table from array of objects
autoTable(users, { title: 'Users', search: true })

// Chart from data + series definitions
autoChart(
  salesData,
  [{ dataKey: 'revenue', label: 'Revenue', color: '#3b82f6' }],
  { title: 'Revenue', chartType: 'bar', xAxis: 'month' },
)

// Form that submits to an MCP tool
autoForm(
  [
    { name: 'email', type: 'email', required: true },
    { name: 'name', label: 'Full Name', required: true },
  ],
  'create_user',
  { title: 'New User', submitLabel: 'Create' },
)

// KPI metric cards
autoMetrics([
  { label: 'Revenue', value: '$42K', delta: '+12%', trend: 'up', trendSentiment: 'positive' },
  { label: 'Users', value: '3,420', delta: '+5%', trend: 'up', trendSentiment: 'positive' },
])
```

**Auto-renderers:** `autoDetail`, `autoTable`, `autoChart`, `autoForm`, `autoComparison`, `autoMetrics`, `autoTimeline`, `autoProgress`

## MCP Display Helpers

Return UIs from MCP tool handlers:

```ts
import { display, display_form, display_update, display_error } from '@maxhealth.tech/prefab'
import { Column, H1 } from '@maxhealth.tech/prefab'

// Full UI
return display(Column({ children: [H1('Dashboard'), autoMetrics(kpis)] }), { title: 'Dashboard' })

// Form that submits back to a tool (fields, toolName, options)
return display_form(
  [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email' },
  ],
  'update_user',
  { title: 'Edit User' },
)

// Partial state update (no full re-render)
return display_update({ count: 42, status: 'complete' })

// Error display
return display_error('User not found', { code: 404 })
```

## Browser Renderer

Two bundles, zero external dependencies:

| Bundle | Size | Use case |
|--------|------|----------|
| `renderer.auto.min.js` | ~80KB | **Recommended.** Self-boots bridge, mounts `$prefab` into `#root` automatically |
| `renderer.min.js` | ~80KB | Library only — defines `window.prefab`, you wire the bridge yourself |

### Auto-mount (recommended)

```html
<div id="root"></div>
<script src="renderer.auto.min.js"></script>
```

Races both bridge protocols (`prefab:*` and `ui/*` JSON-RPC) in parallel.
First host to respond wins. Buffers tool results that arrive before the handler is wired.

### Manual mount

```html
<script src="renderer.min.js"></script>
<script>
  // Mount from wire format data
  const app = PrefabRenderer.mount(document.getElementById('root'), wireData);
</script>
```

### PostMessage Bridge

For MCP Apps running in iframes:

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
      { "type": "Text", "content": "{{ message }}" }
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
    "action": "setState",
    "key": "count",
    "value": "{{ count + 1 }}"
  }
}
```

## Subpath Exports

```ts
import { ... } from '@maxhealth.tech/prefab'           // Everything
import { ... } from '@maxhealth.tech/prefab/actions'    // Actions only
import { ... } from '@maxhealth.tech/prefab/rx'         // Rx expressions only
import { ... } from '@maxhealth.tech/prefab/charts'     // Chart components only
import { ... } from '@maxhealth.tech/prefab/auto'       // Auto-renderers
import { ... } from '@maxhealth.tech/prefab/mcp'        // MCP display helpers
import { ... } from '@maxhealth.tech/prefab/renderer'   // Browser renderer
import '@maxhealth.tech/prefab/prefab.css'              // Default stylesheet
```

## Development

```bash
bun install          # Install dependencies
bun test             # Run tests (996 passing)
bun run build        # TypeScript compile + IIFE bundle
bun run lint         # ESLint
bun run typecheck    # Type check without emitting
```

## License

MIT
