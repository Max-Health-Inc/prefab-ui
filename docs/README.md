# prefab Documentation

> TypeScript declarative UI component library for MCP apps.
> Wire-compatible with the Python `prefab-ui` library.

## Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Installation, first UI, server + client usage |
| [Components](components.md) | Full reference for all 100+ components |
| [Actions](actions.md) | Client-side and MCP actions reference |
| [Reactive Expressions](rx.md) | `rx()` builder, template syntax, pipes |
| [Auto-Renderers](auto-renderers.md) | Generate UIs from raw data |
| [Wire Format](wire-format.md) | `$prefab` JSON spec, component shapes, state |
| [Browser Renderer](renderer.md) | IIFE bundle, mounting, Store, theme engine |
| [ext-apps Bridge](bridge.md) | `app()` factory, PostMessage protocol, host integration |
| [MCP Display Helpers](mcp-display.md) | `display()`, `display_form()`, `display_update()`, `display_error()` |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  MCP Server (Python or TypeScript)                   │
│  ┌────────────────────────────────────────────────┐  │
│  │ Tool handler                                   │  │
│  │   display(Column(H1('Hi'), autoTable(data)))   │  │
│  │   → returns $prefab wire JSON                  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────┘
                           │ wire JSON
┌──────────────────────────▼───────────────────────────┐
│  Browser (renderer.min.js — 54KB IIFE)               │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Component    │  │ State    │  │ Action         │  │
│  │ Registry     │  │ Store    │  │ Dispatcher     │  │
│  │ (55+ types)  │  │ (Rx eval)│  │ (15 actions)   │  │
│  └──────┬──────┘  └────┬─────┘  └───────┬────────┘  │
│         │              │                │            │
│         └──────────────┼────────────────┘            │
│                        ▼                             │
│                 Vanilla DOM                           │
└──────────────────────────────────────────────────────┘
```

## Quick Links

- **npm:** `@maxhealth.tech/prefab`
- **Bundle:** `dist/renderer.min.js` (54KB, zero deps)
- **Tests:** 253 passing (570 assertions)
- **License:** MIT
