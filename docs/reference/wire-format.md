# Wire Format Specification

The `$prefab` wire format is the JSON protocol that connects server-side component builders to client-side renderers. Both the TypeScript and Python libraries produce this format.

## Envelope

Every prefab UI is wrapped in a top-level envelope:

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
| `$prefab` | `{ version: string }` | **Yes** | Format identifier. Current version: `"0.2"` |
| `view` | `ComponentJSON` | **Yes** | Root component tree |
| `state` | `Record<string, unknown>` | No | Initial reactive state |
| `theme` | `ThemeJSON` | No | CSS custom property overrides |
| `defs` | `Record<string, ComponentJSON>` | No | Reusable component templates |
| `keyBindings` | `Record<string, ActionJSON>` | No | Keyboard shortcut → action |
| `stylesheets` | `string[]` | No | Custom CSS injected as `<style>` tags |
| `onMount` | `ActionJSON \| ActionJSON[]` | No | Action(s) to run when the UI renders |

## Component JSON

Every component serializes to a flat JSON object:

```json
{
  "type": "Button",
  "content": "Click me",
  "variant": "default",
  "size": "sm",
  "onClick": { "action": "setState", "key": "count", "value": "{{ state.count + 1 }}" },
  "children": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | **Required.** Component type name (PascalCase) |
| `content` | `string` | Text content (supports `{{ }}` expressions) |
| `children` | `ComponentJSON[]` | Child components |
| `cssClass` | `string` | Extra CSS class |
| `*` | `unknown` | Any other props specific to the component type |

### Type Names

Component types use PascalCase and map 1:1 to the TypeScript/Python function names:

```
Column, Row, Grid, GridItem, Container, Div, Span,
H1, H2, H3, H4, Text, Heading, Muted, Code, Markdown, Link, Kbd,
Card, CardHeader, CardTitle, CardContent, CardFooter,
DataTable, Badge, Metric, Progress, Separator, Loader, Icon,
Table, TableHead, TableBody, TableRow, TableHeader, TableCell,
Form, Input, Textarea, Button, Select, SelectOption, Checkbox, Switch, Slider,
Radio, RadioGroup, Combobox, ComboboxOption, Calendar, DatePicker,
Field, FieldTitle, FieldDescription, FieldContent, FieldError, ChoiceCard,
Tabs, Tab, Accordion, AccordionItem, Dialog, Popover, Tooltip, Carousel,
BarChart, LineChart, AreaChart, PieChart, Sparkline, RadialChart, Histogram,
Image, Audio, Video, Embed, Svg, DropZone, Mermaid,
Alert, AlertTitle, AlertDescription,
ForEach, If, Elif, Else, Define, Use, Slot
```

## Action JSON

Actions are serialized as objects with an `action` field:

```json
{ "action": "setState", "key": "count", "value": 42 }
```

```json
{ "action": "toolCall", "tool": "get_data", "arguments": { "id": "{{ state.selectedId }}" } }
```

```json
{ "action": "showToast", "message": "Saved!", "variant": "success" }
```

### Action Types

| `action` | Description | Key Fields |
|----------|-------------|------------|
| `setState` | Set state value | `key`, `value` |
| `toggleState` | Toggle boolean | `key` |
| `appendState` | Append to array | `key`, `value`, `index?` |
| `popState` | Remove from array | `key`, `index` |
| `showToast` | Toast notification | `message`, `variant?`, `duration?` |
| `closeOverlay` | Close dialog/popover | — |
| `openLink` | Navigate to URL | `url`, `target?` |
| `setInterval` | Periodic timer | `intervalMs`, `onTick` |
| `fetch` | HTTP request | `url`, `method?`, `resultKey?` |
| `openFilePicker` | File picker | `accept?`, `multiple?`, `resultKey?` |
| `callHandler` | Client handler | `handler`, `arguments?` |
| `toolCall` | MCP tool call | `tool`, `arguments?`, `resultKey?` |
| `sendMessage` | Chat message | `message` |
| `updateContext` | Host context update | `context` |
| `requestDisplayMode` | Display mode | `mode` |

All actions support optional `onSuccess` and `onError` callbacks (single action or array).

## Reactive Expressions

String values containing `{{ }}` are evaluated as reactive expressions:

```json
{ "type": "Text", "content": "{{ state.count }}" }
{ "type": "Text", "content": "Hello, {{ state.name | upper }}!" }
```

### Expression Grammar

```
expression   = ternary | logical
ternary      = logical "?" value ":" value
logical      = comparison (("&&" | "||") comparison)*
comparison   = additive (("===" | "!==" | ">" | ">=" | "<" | "<=") additive)?
additive     = multiplicative (("+" | "-") multiplicative)*
multiplicative = unary (("*" | "/" | "%") unary)*
unary        = "!" primary | primary
primary      = number | string | boolean | null | dotpath | "(" expression ")"
dotpath      = identifier ("." identifier)*
piped        = expression ("|" pipeName (":" pipeArg)?)*
```

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
  "light": {
    "primary": "#3b82f6",
    "background": "#ffffff",
    "foreground": "#0a0a0a",
    "muted": "#f5f5f5"
  },
  "dark": {
    "primary": "#60a5fa",
    "background": "#0a0a0a",
    "foreground": "#fafafa",
    "muted": "#262626"
  }
}
```

Theme values are applied as CSS custom properties (`--primary`, `--background`, etc.) on the root element. The renderer selects `light` or `dark` based on the host's `prefers-color-scheme` or the `data-theme` attribute.

## State Updates (Partial)

For incremental updates without re-rendering the full UI, use a state update wire:

```json
{
  "$prefab": { "version": "0.2" },
  "stateUpdate": {
    "count": 42,
    "status": "complete"
  }
}
```

This merges values into the existing state store and triggers re-evaluation of affected reactive expressions.

## Validation

Use `validateWireFormat()` to check a payload:

```ts
import { validateWireFormat } from '@maxhealth.tech/prefab'

const result = validateWireFormat(jsonPayload)
if (!result.valid) {
  console.error(result.errors)
  // [{ path: '$.view', message: 'Missing required "view" field' }]
}
```
