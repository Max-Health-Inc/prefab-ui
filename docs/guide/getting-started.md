# Getting Started

## Installation

```bash
npm install @maxhealth.tech/prefab
# or
bun add @maxhealth.tech/prefab
```

## Base Theme CSS

Prefab ships a base CSS theme (`prefab.css`) that provides design tokens and structural styles for all components.

**Bundler (Vite / webpack):**

```ts
import '@maxhealth.tech/prefab/prefab.css'
```

**CDN:**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.1/dist/prefab.css">
```

When using `toHTML()`, the base CSS is injected automatically. Pass `{ includeStyles: false }` to opt out.

The layering order is: `prefab.css` (base) → `stylesheets[]` (your overrides) → `theme` (runtime CSS variables).

## Usage Modes

prefab has three usage modes:

| Mode | Where | Import |
|------|-------|--------|
| **Server-side** | MCP tool handlers (Python/TS) | `@maxhealth.tech/prefab` |
| **Client-side** | Browser (ext-app iframe) | `dist/renderer.min.js` script tag |
| **Hybrid** | Node/Bun backend → HTML response | `PrefabApp.toHTML()` |

---

## Server-Side: Build UIs in MCP Tool Handlers

Build a component tree, wrap it with `display()`, and return it as an MCP tool result.

```ts
import {
  display, Column, H1, Text, DataTable, col, Badge, autoTable,
} from '@maxhealth.tech/prefab'

// Simple: auto-generate a table from data
async function listUsers() {
  const users = await db.query('SELECT * FROM users')
  return display(autoTable(users), { title: 'Users' })
}

// Advanced: hand-craft the layout
async function userDashboard() {
  const users = await db.query('SELECT * FROM users')

  return display(
    Column({ gap: 8 }, [
      H1('User Dashboard'),
      Text('Manage your organization members.'),
      DataTable({
        rows: users,
        columns: [
          col('name', 'Name'),
          col('email', 'Email'),
          col('role', 'Role'),
          col('status', 'Status'),
        ],
        search: true,
      }),
    ]),
    { title: 'User Dashboard' },
  )
}
```

The `display()` function serializes the tree to `$prefab` wire JSON and wraps it in an MCP tool result content array. Any MCP client that understands prefab can render it.

## Client-Side: Browser ext-app

Load the renderer bundle and use the `app()` factory:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.1/dist/prefab.css">
</head>
<body>
  <div id="root"></div>
  <script src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.1/dist/renderer.min.js"></script>
  <script>
    (async () => {
      const ui = await prefab.app();

      ui.onToolInput((args) => {
        ui.render('#root',
          { type: 'Column', children: [
            { type: 'H1', content: 'Results' },
            { type: 'Text', content: `Found ${args.count} items` },
          ]},
        );
      });
    })();
  </script>
</body>
</html>
```

::: tip Use versioned CDN URLs
Always pin a version (e.g. `@0.2.1`) in production to prevent breaking changes.
:::

The `app()` factory:
1. Detects whether the page is in an iframe (bridge mode) or standalone
2. Performs the PostMessage handshake with the host (if bridged)
3. Applies the host theme
4. Returns an API object with `callTool`, `render`, `onToolInput`, etc.

## Hybrid: Self-Contained HTML

Use `PrefabApp.toHTML()` to generate a complete HTML page from a server:

```ts
import { PrefabApp, Column, H1, Text } from '@maxhealth.tech/prefab'

const app = new PrefabApp({
  title: 'My Dashboard',
  view: Column({ gap: 4 }, [H1('Hello'), Text('World')]),
})

const html = app.toHTML()
// Returns a self-contained HTML page with embedded JSON + renderer script
```

Options:

| Option | Default | Description |
|--------|---------|-------------|
| `cdnVersion` | Current package version | CDN version for script/CSS tags |
| `pretty` | `false` | Pretty-print the embedded JSON |
| `includeStyles` | `true` | Inject the `prefab.css` base theme |

## Subpath Imports

```ts
import { ... } from '@maxhealth.tech/prefab'           // Everything
import { ... } from '@maxhealth.tech/prefab/actions'    // Actions only
import { ... } from '@maxhealth.tech/prefab/rx'         // Rx expressions
import { ... } from '@maxhealth.tech/prefab/charts'     // Chart components
import { ... } from '@maxhealth.tech/prefab/mcp'        // MCP display helpers
import { ... } from '@maxhealth.tech/prefab/renderer'   // Browser renderer
import '@maxhealth.tech/prefab/prefab.css'              // Base theme CSS
```

## Next Steps

- [Components](./components) — full reference for all 55+ components
- [Signals & Collections](./rx#signals--collections) — reactive data layer
- [Actions](./actions) — client-side and MCP actions
- [Reactive Expressions](./rx) — dynamic values with `rx()`
- [Auto-Renderers](./auto-renderers) — generate UIs from raw data
- [Wire Format](/reference/wire-format) — the `$prefab` JSON spec
