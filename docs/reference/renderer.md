# Browser Renderer

The prefab renderer is a 54KB IIFE bundle (`dist/renderer.min.js`) that renders `$prefab` wire JSON into vanilla DOM. Zero framework dependencies.

## Loading

### Script Tag (CDN)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.1/dist/prefab.css">
<script src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.1/dist/renderer.min.js"></script>
```

This creates the `window.PrefabRenderer` global and (in ext-app mode) `window.prefab`.

### Auto-Mount

Set `window.__PREFAB_DATA__` before the script loads:

```html
<script>
  window.__PREFAB_DATA__ = {
    "$prefab": { "version": "0.2" },
    "view": { "type": "H1", "content": "Hello!" }
  };
</script>
<script src="renderer.min.js"></script>
```

The renderer auto-mounts into the first `#root` element (or `document.body`) on `DOMContentLoaded`.

### Manual Mount

```js
const handle = PrefabRenderer.mount(document.getElementById('root'), wireData, {
  transport: { endpoint: '/mcp/tools/call' },
  onToast: (event) => alert(event.message),
});

// Later:
handle.update(newWireData);
handle.destroy();
```

## `PrefabRenderer.mount(element, data, options?)`

| Param | Type | Description |
|-------|------|-------------|
| `element` | `HTMLElement` | Target DOM element |
| `data` | `PrefabWireData` | Wire format JSON |
| `options.transport` | `{ endpoint, headers? }` | HTTP transport config for `CallTool` |
| `options.onToast` | `(event) => void` | Toast handler |

Returns a `MountedApp` with:

| Method | Description |
|--------|-------------|
| `update(data)` | Apply a state update from `display_update()` |
| `rerender()` | Re-render the entire UI from current state |
| `destroy()` | Unmount and clean up |
| `store` | Access the reactive `Store` |

---

## Reactive Store

The renderer maintains a `Store` that holds all reactive state:

```ts
const store = handle.store;

store.get('count');           // Read
store.set('count', 42);       // Write (triggers re-render)
store.merge({ a: 1, b: 2 }); // Merge multiple
store.toggle('active');        // Toggle boolean
store.append('items', item);   // Push to array
store.pop('items', 0);         // Remove by index
store.getAll();               // Full state copy
```

State changes automatically re-evaluate all `{{ }}` expressions in the DOM.

---

## Theme Engine

The renderer applies theme values as CSS custom properties:

```json
{
  "theme": {
    "light": { "primary": "#3b82f6", "radius": "0.5rem" },
    "dark": { "primary": "#60a5fa" }
  }
}
```

Applied as:
```css
:root {
  --primary: #3b82f6;
  --radius: 0.5rem;
}
```

The renderer selects the theme variant based on `prefers-color-scheme` or `data-theme` attribute on the root element.

---

## Component Registry

The renderer has 55+ built-in component renderers. Each `type` string maps to a render function:

```
Layout:      Column, Row, Grid, GridItem, Container, Div, Span, ...
Typography:  H1-H4, Text, Heading, Muted, Code, Markdown, Link, Kbd, ...
Card:        Card, CardHeader, CardTitle, CardContent, CardFooter
Data:        DataTable, Badge, Metric, Progress, Separator, Loader, Icon, ...
Table:       Table, TableHead, TableBody, TableRow, TableCell, ...
Form:        Form, Input, Textarea, Button, Select, Checkbox, Switch, ...
Interactive: Tabs, Tab, Accordion, AccordionItem, Dialog, Tooltip, ...
Charts:      BarChart, LineChart, AreaChart, PieChart, Sparkline, ...
Media:       Image, Audio, Video, Embed, Svg, DropZone, Mermaid
Alert:       Alert, AlertTitle, AlertDescription
Control:     ForEach, If, Elif, Else, Define, Use, Slot
```

### Custom Components

Register custom renderers before mounting:

```js
import { registerComponent } from '@maxhealth.tech/prefab/renderer'

registerComponent('MyWidget', (node, ctx) => {
  const el = document.createElement('div');
  el.textContent = node.content;
  return el;
});
```

`registerComponent` is a standalone function, not a method on `PrefabRenderer`.

---

## Action Dispatcher

The renderer handles 15 action types:

| Action | Behavior |
|--------|----------|
| `setState` | Updates the reactive store |
| `toggleState` | Toggles a boolean in the store |
| `appendState` | Pushes to an array in the store |
| `popState` | Removes from an array in the store |
| `showToast` | Calls the toast handler |
| `closeOverlay` | Closes the current dialog |
| `openLink` | `window.open(url, target)` |
| `setInterval` | Starts a periodic timer |
| `fetch` | `fetch()` + stores result |
| `openFilePicker` | Opens file input dialog |
| `callHandler` | Calls a registered JS handler |
| `toolCall` | Routes through MCP transport |
| `sendMessage` | Routes through MCP transport |
| `updateContext` | Routes through bridge |
| `requestDisplayMode` | Routes through bridge |

---

## Stylesheet Injection

The wire format's `stylesheets` field injects `<style>` tags:

```json
{
  "stylesheets": [
    ".custom-btn { background: linear-gradient(135deg, #667eea, #764ba2); }",
    "@keyframes pulse { 0% { opacity: 1 } 50% { opacity: 0.5 } 100% { opacity: 1 } }"
  ]
}
```

Stylesheets are scoped to the mount lifecycle — they're removed on `destroy()`.

---

## Accessibility

The renderer applies ARIA attributes automatically:

| Component | ARIA |
|-----------|------|
| `Tabs` | `role="tablist"`, `aria-selected`, keyboard arrows/Home/End |
| `Tab` | `role="tab"`, `aria-controls`, `tabindex` |
| `Accordion` | `aria-expanded`, Enter/Space toggle |
| `Dialog` | `role="dialog"`, `aria-modal`, focus trap |
| `Tooltip` | `role="tooltip"` |
| `Carousel` | `role="region"`, `aria-roledescription="carousel"` |
| `Progress` | `role="progressbar"`, `aria-valuenow/min/max` |
| `Alert` | `role="alert"` |
| Form inputs | `aria-required`, `aria-invalid`, `id`/`for` linking |
