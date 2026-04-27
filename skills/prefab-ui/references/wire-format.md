# Wire Format Reference

Complete specification for the `$prefab` v0.2 wire format.

## Envelope

```json
{
  "$prefab": { "version": "0.2" },
  "view": { ... },
  "state": { ... },
  "theme": { ... },
  "defs": { ... },
  "keyBindings": { ... },
  "stylesheets": [ ... ],
  "onMount": { ... }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$prefab` | `{ version: string }` | **Yes** | Format identifier. Current: `"0.2"` |
| `view` | `ComponentJSON` | **Yes** | Root component tree |
| `state` | `Record<string, unknown>` | No | Initial reactive state |
| `theme` | `ThemeJSON` | No | CSS custom property overrides |
| `defs` | `Record<string, ComponentJSON>` | No | Reusable component templates |
| `keyBindings` | `Record<string, ActionJSON>` | No | Keyboard shortcut → action map |
| `stylesheets` | `string[]` | No | Custom CSS injected as `<style>` tags |
| `onMount` | `ActionJSON \| ActionJSON[]` | No | Action(s) to run when UI renders |

## Component JSON

Every component is a flat JSON object:

```json
{
  "type": "Button",
  "label": "Click me",
  "variant": "default",
  "onClick": { "action": "setState", "key": "count", "value": "{{ state.count + 1 }}" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | **Required.** PascalCase component type |
| `content` | `string` | Text content (supports `{{ }}` expressions) |
| `children` | `ComponentJSON[]` | Child components |
| `cssClass` | `string` | Extra CSS class |
| `*` | any | Type-specific props |

### All Type Names

```
Layout:       Column, Row, Grid, GridItem, Container, Div, Span,
              Dashboard, DashboardItem, Pages, Page, MasterDetail, Detail
Typography:   Heading, H1, H2, H3, H4, Text, P, Lead, Large, Small, Muted,
              BlockQuote, Label, Link, Code, Markdown, Kbd
Card:         Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
Data:         DataTable, Badge, Dot, Metric, Ring, Progress, Separator, Loader, Icon
Table:        Table, TableHead, TableBody, TableFooter, TableRow,
              TableHeader, TableCell, TableCaption, ExpandableRow
Form:         Form, Input, Textarea, Button, ButtonGroup,
              Select, SelectOption, SelectGroup, SelectLabel, SelectSeparator,
              Checkbox, Switch, Slider, Radio, RadioGroup,
              Combobox, ComboboxOption, ComboboxGroup, ComboboxLabel, ComboboxSeparator,
              Calendar, DatePicker, Field, FieldTitle, FieldDescription,
              FieldContent, FieldError, ChoiceCard
Interactive:  Tabs, Tab, Accordion, AccordionItem, Dialog, Popover, Tooltip,
              HoverCard, Carousel
Charts:       BarChart, LineChart, AreaChart, PieChart, RadarChart, ScatterChart,
              Sparkline, RadialChart, Histogram
Media:        Image, Audio, Video, Embed, Svg, DropZone, Mermaid
Alert:        Alert, AlertTitle, AlertDescription
Control:      ForEach, If, Elif, Else, Define, Use, Slot
```

## Action JSON

Actions are objects with an `"action"` field, attached to `onClick`, `onChange`, `onSubmit`, `onMount`, `onSuccess`, `onError`:

| Action | Key Fields | Description |
|--------|------------|-------------|
| `setState` | `key`, `value` | Set a state value |
| `toggleState` | `key` | Toggle boolean state |
| `appendState` | `key`, `item` | Append to state array |
| `popState` | `key`, `index` | Remove from state array |
| `showToast` | `title`, `description?`, `variant?`, `duration?` | Show toast notification |
| `closeOverlay` | — | Close current dialog/popover |
| `openLink` | `url`, `target?` | Navigate to URL |
| `setInterval` | `intervalMs`, `onTick` | Start periodic timer |
| `fetch` | `url`, `method?`, `body?`, `resultKey?` | HTTP request |
| `openFilePicker` | `accept?`, `multiple?`, `resultKey?` | Open file picker |
| `callHandler` | `handler`, `arguments?` | Call client-side handler |
| `toolCall` | `tool`, `arguments?`, `resultKey?` | MCP tool call |
| `sendMessage` | `message` | Send chat message |
| `updateContext` | `context` | Update host context |
| `requestDisplayMode` | `mode` | Request display mode change |

All actions support `onSuccess` and `onError` callbacks (action or action array).

Multiple actions on one event: use an array.

```json
"onClick": [
  { "action": "setState", "key": "saved", "value": true },
  { "action": "showToast", "title": "Saved!" }
]
```

## Reactive Expressions

String values containing `{{ }}` are evaluated reactively and update when state changes.

### Syntax

```
{{ state.count }}                    — state access
{{ state.count + 1 }}                — arithmetic
{{ state.name | upper }}             — pipe
{{ state.active ? 'Yes' : 'No' }}   — ternary
{{ state.a && state.b }}             — logical
{{ state.count > 0 }}                — comparison
{{ !state.loading }}                 — negation
```

### Operator Precedence (high to low)

`!` → `* / %` → `+ -` → `> >= < <=` → `=== !==` → `&&` → `||` → `? :`

### Pipes

| Pipe | Example | Description |
|------|---------|-------------|
| `upper` | `{{ name \| upper }}` | Uppercase |
| `lower` | `{{ name \| lower }}` | Lowercase |
| `truncate:N` | `{{ desc \| truncate:50 }}` | Truncate to N chars |
| `currency` | `{{ price \| currency:'EUR' }}` | Format currency |
| `number` | `{{ count \| number }}` | Format number |
| `percent` | `{{ rate \| percent }}` | Format percentage |
| `date` | `{{ ts \| date }}` | Format date |
| `time` | `{{ ts \| time }}` | Format time |
| `datetime` | `{{ ts \| datetime }}` | Format date+time |
| `length` | `{{ items \| length }}` | Array/string length |
| `default:'x'` | `{{ name \| default:'N/A' }}` | Fallback if null |
| `first` / `last` | `{{ items \| first }}` | First/last element |
| `round:N` | `{{ val \| round:2 }}` | Round decimals |
| `compact` | `{{ val \| compact }}` | Compact number (1.2K) |
| `abs` | `{{ val \| abs }}` | Absolute value |
| `pluralize:'w'` | `{{ n \| pluralize:'item' }}` | Pluralize word |
| `join:','` | `{{ arr \| join:', ' }}` | Join array |
| `selectattr:'k'` | `{{ items \| selectattr:'active' }}` | Filter by truthy attr |
| `rejectattr:'k'` | `{{ items \| rejectattr:'deleted' }}` | Filter by falsy attr |
| `find:'f',ref` | `{{ rows \| find:'id',selectedId }}` | Find object by key match |
| `dot:'f'` | `{{ obj \| dot:'name' }}` | Extract property |

Pipes chain: `{{ name | upper | truncate:20 }}`

### Scope Variables

| Variable | Available In | Description |
|----------|-------------|-------------|
| `state.*` | Everywhere | Reactive state store |
| `item` | `ForEach` body | Current iteration item |
| `index` | `ForEach` body | Current iteration index |
| `event` | `onChange`/`onSubmit` | Event data |
| `error` | `onError` callback | Error value |
| `result` | `onSuccess` callback | Action result |

## Theme JSON

```json
{
  "light": { "primary": "#3b82f6", "background": "#ffffff" },
  "dark": { "primary": "#60a5fa", "background": "#09090b" }
}
```

Values become CSS custom properties (`--primary`, `--background`, etc.). The renderer selects light/dark based on `prefers-color-scheme` or the `data-theme` attribute on the root element.

### Available Theme Tokens

`background`, `foreground`, `card`, `card-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `success`, `success-foreground`, `warning`, `warning-foreground`, `border`, `input`, `ring`

## State Updates (Incremental)

For partial updates without re-sending the full UI:

```json
{
  "$prefab": { "version": "0.2" },
  "stateUpdate": { "count": 42, "status": "complete" }
}
```

Merges into the existing state store and triggers re-evaluation of affected expressions.
