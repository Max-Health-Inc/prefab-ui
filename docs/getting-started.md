# Getting Started

## Installation

```bash
npm install prefab-ui
# or
bun add prefab-ui
```

## Usage Modes

prefab has two usage modes:

| Mode | Where | Import |
|------|-------|--------|
| **Server-side** | MCP tool handlers (Python/TS) | `prefab-ui` |
| **Client-side** | Browser (ext-app iframe) | `dist/renderer.min.js` script tag |

---

## Server-Side: Build UIs in MCP Tool Handlers

Build a component tree, wrap it with `display()`, and return it as an MCP tool result.

```ts
import {
  display, Column, H1, Text, DataTable, col, Badge, autoTable,
} from 'prefab-ui'

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
      DataTable(users, [
        col('name', 'Name'),
        col('email', 'Email'),
        col('role', 'Role'),
        col('status', 'Status', (v) => Badge(v, {
          variant: v === 'active' ? 'success' : 'destructive',
        })),
      ]),
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
<head><title>My App</title></head>
<body>
  <div id="root"></div>
  <script src="https://cdn.jsdelivr.net/npm/prefab-ui/dist/renderer.min.js"></script>
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

The `app()` factory:
1. Detects whether the page is in an iframe (bridge mode) or standalone
2. Performs the PostMessage handshake with the host (if bridged)
3. Applies the host theme
4. Returns an API object with `callTool`, `render`, `onToolInput`, etc.

## Subpath Imports

```ts
import { ... } from 'prefab-ui'           // Everything
import { ... } from 'prefab-ui/actions'    // Actions only
import { ... } from 'prefab-ui/rx'         // Rx expressions
import { ... } from 'prefab-ui/charts'     // Chart components
import { ... } from 'prefab-ui/mcp'        // MCP display helpers
import { ... } from 'prefab-ui/renderer'   // Browser renderer
```

## Next Steps

- [Components](components.md) — full reference for all 100+ components
- [Actions](actions.md) — client-side and MCP actions
- [Reactive Expressions](rx.md) — dynamic values with `rx()`
- [Auto-Renderers](auto-renderers.md) — generate UIs from raw data
- [Wire Format](wire-format.md) — the `$prefab` JSON spec
