# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] — v0.2.20

### Theme Toggle Fix
- **Fixed**: dark/light toggle icon flipped but colours didn't change — `@media (prefers-color-scheme: dark) :root:not(...)` at specificity (0,2,0) beat `[data-theme]` at (0,1,0). Bumped to `:root[data-theme="dark/light"]` (0,2,0) so toggle wins by source order
- `[data-theme]` blocks now use static values only (not host var fallback chains) — prevents both themes resolving to the same host variable

### VS Code Theme Sync
- `syncVsCodeTheme()` — reads `data-vscode-theme-kind` from `document.body`, maps to `data-theme` on `:root` (`vscode-dark` / `vscode-high-contrast` → `dark`, else `light`)
- `MutationObserver` watches for VS Code theme switches and keeps `data-theme` in sync automatically
- Only active in standalone / VS Code context (skipped when MCP Apps bridge is present)

### Tests
- Added `renderer-destroy.test.ts` — 12 tests for component destroy hook lifecycle
- **1142 tests** passing across 32 files

## [0.2.19] — 2026-04-29

### SDK Type Compatibility
- `McpToolResult` now structurally assignable to `@modelcontextprotocol/sdk` `CallToolResult` — no cast needed when returning `display()` from SDK tool handlers
- Added `[key: string]: unknown` index signature (satisfies SDK's `Result` base)
- Split `McpResourceContent.resource` into discriminated union (`McpTextResourceContents | McpBlobResourceContents`) matching SDK's `EmbeddedResource`
- Added optional `annotations?` and `_meta?` on all content types

### Host Theme Token Mapping
- **CSS fallback chain**: all design tokens in `prefab.css` resolve through 3 tiers — MCP Apps spec vars (`--color-background-primary`) → VS Code vars (`--vscode-editor-background`) → static defaults
- Applies to all theme blocks: `:root`, `@media (prefers-color-scheme: dark)`, `[data-theme="dark"]`, `[data-theme="light"]`
- Downstream MCP servers no longer need custom CSS for Claude Desktop or VS Code webview theming
- Added `--shadow-sm/md/lg` and `--border-radius-*` → `--radius` mapping from MCP Apps spec
- `applyHostTheme()` now injects host-provided `@font-face` / `@import` CSS from `styles.css.fonts` (idempotent `<style>` tag)
- `HostTheme.fontCss` field added; extracted from both `ui/initialize` and `ui/notifications/host-context-changed`

## [0.2.18] — 2026-04-29

### Builder API Improvements
- `display_success(title, body?)` — success-variant alert helper
- `resourceMeta(opts)` — build `_meta` for `resources/read` (CSP, permissions, domain, border)
- `PREFAB_CDN_META` — pre-built meta with jsDelivr CDN CSP for common deployments
- `structuredContent` on all display helpers (`display`, `display_form`, `display_update`, `display_error`, `display_success`)
- `PrefabApp.toMcpResult()` — returns `{ content, structuredContent }` for direct SDK tool handler return
- MCP actions: `RequestDisplayMode` action + `displayMode` option on `CallTool`
- New component support: `Embed`, `Markdown`, `Mermaid`, `CodeBlock` builder classes

### Tests
- **1130 tests** passing across 31 files

## [0.2.17] — 2026-04-28

### Auto-Resize
- `Bridge.setupAutoResize(el)` — `ResizeObserver` on the target element, notifies the host whenever the content dimensions change via `ui/notifications/size-changed` (JSON-RPC) or `prefab:size-changed` (prefab protocol). Mirrors the ext-apps SDK `autoResize: true` behaviour without the SDK dependency.
- `sendRpcNotification()` — fire-and-forget JSON-RPC notification (no `id`, no response expected)
- `PrefabApp.setupAutoResize(target)` — public API accepting selector or element
- `renderer.auto.min.js` now auto-observes `#root` after boot — hosts get size updates out of the box
- Deduplicates identical dimensions, fires initial notification immediately
- 4 new tests — **1130 total tests**

## [0.2.16] — 2026-04-28

### Docs
- Added `appInfo` vs `clientInfo` Common Pitfall section to `mcp-apps.md`
- Added ext-apps SDK vs native `ui/*` JSON-RPC comparison table
- Added ext-apps SDK source references to Reference section

## [0.2.15] — 2026-04-28

### Bug Fix: Claude Desktop / ChatGPT Breakage
- **Fixed**: `ui/initialize` handshake sent `clientInfo` instead of `appInfo` — hosts validate with Zod schema that requires `appInfo`, causing silent handshake failure (blank iframe, no error). The ext-apps SDK fallback in v0.2.11 masked this; removing the SDK in v0.2.12 exposed it.
- `Bridge.initialize()` error handling: `Promise.any` wrapped in try/catch, rethrows as descriptive `Error('Bridge init failed — no host responded')` with `{ cause }` preserving the `AggregateError`
- 2 new tests: `appInfo` field validation, clear error on dual-protocol failure — **1126 total tests**

## [0.2.14] — 2026-04-28

### Built-in Theme Toggle
- `createThemeToggle(root, options?)` — renders a floating sun/moon toggle button with two-way sync to `data-theme` attribute via `MutationObserver`
- `PrefabRenderer.mount()` auto-attaches toggle by default (opt out with `themeToggle: false`)
- Toggle preserved across re-renders

### Bug Fixes
- `appendState` action: support `item` alias (Python SDK compat)
- Charts: restore CSS custom properties in SVG presentation attributes for dark mode

## [0.2.13] — 2026-04-27

### Bug Fixes
- Renderer: remove all inline `theme-variable` styles, rely on CSS classes (CSP compliance)
- Badge: use `Partial<Record>` to satisfy `strict-boolean-expressions` lint rule
- Demo: fix theme toggle, favicon 404, copy-MCP-button styling
- Docs: inject CDN version from `package.json` at build time

## [0.2.12] — 2026-04-27

### Bundle Size Reduction
- **Removed** `@modelcontextprotocol/ext-apps` SDK dependency — 405 KB → 80 KB bundle
- Bridge now speaks native `ui/*` JSON-RPC without the SDK wrapper
- Docs updated to remove ext-apps references
- ⚠️ **Regression**: `clientInfo` field name broke Claude Desktop / ChatGPT (fixed in v0.2.15)

## [0.2.11] — 2026-04-27

### Theming
- `data-theme` attribute support in `prefab.css` — light/dark mode via attribute selector
- MCP agent skill: attach `prefab-skill.zip` to GitHub releases

## [0.2.10] — 2026-04-27

### Docs & Polish
- Select options shorthand syntax
- Remote usage mode documentation
- Brand assets, favicon, logo paths
- Playground: dark preview background
- Lint fixes: `Array<T>` → `T[]`, control char regex, `RegExp.exec`
- Markdown renderer: protect inline code from formatting, fix CRLF infinite loop
- DRY: `serializeCallbacks`, camelCase display aliases

## [0.2.9] — 2026-04-26

### Bug Fix
- `autoTable` column keys now match serialized row keys

## [0.2.8] — 2026-04-26

### Universal MCP Apps Bridge
- **Fixed**: `renderer.auto.min.js` now works in VS Code, Claude Desktop, ChatGPT, and all MCP Apps hosts without any inline adapter code
- `Bridge.initialize()` races `prefab:init` and `ui/initialize` JSON-RPC **in parallel** — whichever host protocol responds first wins. Eliminates the 1.5s dead time on JSON-RPC hosts
- `app()` now buffers `tool-result` events — host can send results before `onToolResult` is registered without data loss
- `auto.ts` defers `boot()` to `DOMContentLoaded` (or microtask if already loaded)

## [0.2.7] — 2026-04-25

### Chart Formatting
- Generic pipe formatting for chart axes and tooltips
- `tooltipXKey` — separate data key for tooltip vs x-axis labels
- Fix: remove non-null assertion in PieChart tooltip key lookup (lint)

## [0.2.6] — 2026-04-25

### Chart Tooltips
- Production-quality tooltips with crosshair, data dots, null gaps, a11y, touch support

## [0.2.5] — 2026-04-25

### Custom Renderers
- `registerComponent(type, renderFn)` exposed on `window.prefab` for custom component renderers

## [0.2.4] — 2026-04-25

### Chart Axes
- Y-axis, X-axis labels, grid lines, dual Y-axis support

## [0.2.3] — 2026-04-25

### JSON-RPC Protocol
- Native `ui/*` JSON-RPC protocol — zero-adapter VS Code support

## [0.2.2] — 2026-04-25

### Auto-Mount Bundle
- `renderer.auto.min.js` — CSP-safe self-executing bundle
- CI: attach `renderer.auto.min.js` + `prefab.css` to GitHub releases
- Wire compat: `callTool` action alias + `Condition` component

### Docs
- Signal, Collection, Ref, sugar actions, find/dot pipes, Detail/MasterDetail, CSS theme, versioned CDN
- Live playground (Monaco editor + shareable URLs + AI prompt)

## [0.2.1] — 2026-04-25

### Bug Fix: If/Elif/Else Conditional Chains
- **Fixed**: `Elif` and `Else` nodes rendered independently instead of being consumed by the preceding `If` chain
- New `renderChildArray()` detects `If/Elif/Else` sibling sequences as a single conditional chain
- 55 new tests — **913 total tests**

### Bug Fix: Browser Pipe Registration
- **Fixed**: Custom pipes registered in Node were not available in the browser renderer bundle
- `PrefabApp({ pipes })` accepts pipe functions, serializes source into wire format
- Renderer `mount()` hydrates wire pipes via `new Function()` before first render
- Built-in pipes cannot be shadowed by wire pipes (security)
- 12 new tests — **858 total tests**

## [0.2.0] — 2026-04-25

### Breaking: Wire Format v0.2
- `$prefab.version` bumped to `0.2`
- Initial release of the `0.2.x` series with all v0.1.x features plus the universal MCP Apps bridge

## [0.1.10] — 2026-04-24

### Action-Builder Sugar
- `set(signal, value)` — ergonomic wrapper for `new SetState(signal.key, value)`
- `toggle(signal)` — wrapper for `new ToggleState(signal.key)`
- `append(collection, item, index?)` — wrapper for `new AppendState(collection.stateKey, item)`
- `pop(collection, indexOrValue?)` — wrapper for `new PopState(collection.stateKey, indexOrValue)`, defaults to last element
- All helpers accept `Signal`, `Collection`, or raw `string` key via `StateTarget` type
- `set()` passes through `SetStateOpts` (onSuccess/onError callbacks)
- 17 new tests in `test/sugar.test.ts` — **846 total tests**

## [0.1.8] — 2026-04-24

### Reactive Primitives
- `signal(key, initial)` — named reactive scalar for wire format, auto-registers state
- `collection(key, rows, { key })` — named keyed array, auto-registers state
- `Ref<T>` — lazy pipe expression referencing a row in a collection via `collection.by(signal)`
- Typed `Ref.dot(field)` — returns `Ref<T[K]>` with autocomplete on `keyof T`
- `Ref.formatted(field, pipe, ...args)` — sugar for `.dot(field).pipe(pipe)`
- `Rx.pipe(name, ...args)` — public variadic pipe builder (was private single-arg)
- `Ref.pipe(name, ...args)` — delegates to `Rx.pipe()`

### Pipe Extension Point
- `registerPipe(name, fn)` — global custom pipe registry for companion packages
- `unregisterPipe(name)` — remove a pipe (tests)
- `listPipes()` — list registered names (debugging)
- Built-in pipes always shadow custom pipes (safety)
- Re-registration warns and overwrites (HMR-friendly)
- Custom pipes receive variadic parsed args (`| date:'long'`, `| between:1,10`)

### Selection & Master-Detail
- `DataTable({ from, selected })` — auto-wires `rowKey`, `onRowClick → SetState`, highlight
- `Detail({ of, empty, children })` — conditional pane, shows children when ref resolves
- `MasterDetail({ masterWidth, gap, children })` — two-pane flex layout
- `col()` descriptor overload: `col({ key, header, format, accessor, sortable })`
- `format` on columns applies pipe (built-in or custom) to cell values
- `accessor` on columns resolves pipe expressions per cell (`name | humanName`)

### Auto State Collection
- `signal()` and `collection()` factories auto-register into a global collector
- `PrefabApp` constructor drains collector — no more `state: { ...c.toState(), ...s.toState() }`
- Explicit `state` overrides auto-collected on key conflicts
- Duplicate state keys warn (`[prefab] state key "X" registered multiple times`)
- `resetAutoState()` exported for test cleanup

### Renderer
- `find` pipe filter — O(1) keyed lookup with generation-aware cache
- `dot` pipe filter — extract property from object
- `Store.generation` counter — monotonically increasing, invalidates find cache on mutation
- `applyFilter` falls through to custom pipe registry after built-ins
- `RxStr` widened to `string | Rx | Ref` — Ref works in all component props

### Bug Fixes (TDD)
- `find` pipe: numeric key coercion (`'2' !== 2`) — fixed with `String()` on both sides
- `find` pipe: scope dot-path resolution (`$item.managerId`) — walk scope object
- `find` cache: stale after in-place mutation — fixed with generation counter
- `Detail`: `0` treated as truthy — added explicit `!== 0` check
- `col({ format })`: built-in pipes silently ignored — route through `applyFilter`
- `col({ accessor, format })`: double-applied formatting — skip format when accessor present
- Duplicate auto-state keys: silent overwrite — now warns

### Tests
- 829 tests passing across 24 files
- New: `test/signal-collection.test.ts` (67 tests)
- New: `test/pipes.test.ts` (17 tests)
- New: `test/tdd-bugs.test.ts` (6 tests)

## [0.1.0] — 2026-04-20

Initial release.

### Component Library
- Core classes: `Component`, `ContainerComponent`, `StatefulComponent`
- `PrefabApp` wrapper with `$prefab` v0.2 wire format and `toHTML()` self-contained page export
- `rx()` reactive expression builder (pipes, comparisons, ternary, built-in vars)
- 80+ components across layout, typography, card, data, form, chart, control, interactive, media, alert
- Table components: `Table`, `TableHead`, `TableBody`, `TableFooter`, `TableRow`, `TableHeader`, `TableCell`, `TableCaption`, `ExpandableRow`
- Form extensions: `Radio`, `RadioGroup`, `Combobox`, `ComboboxOption`, `Calendar`, `DatePicker`, `Field`, `ChoiceCard`, and more
- Chart extensions: `RadialChart`, `Histogram` (in addition to Bar, Line, Area, Pie, Radar, Scatter, Sparkline)
- Composition: `Define`, `Use`, `Slot` for template reuse
- Client actions: `SetState`, `ToggleState`, `AppendState`, `PopState`, `ShowToast`, `CloseOverlay`, `OpenLink`, `SetInterval`, `Fetch`, `OpenFilePicker`, `CallHandler`
- MCP actions: `CallTool`, `SendMessage`, `UpdateContext`, `RequestDisplayMode`

### MCP Display Helpers
- `display()`, `display_form()`, `display_update()`, `display_error()`

### Auto-Renderers
- `autoDetail`, `autoTable`, `autoChart`, `autoForm`, `autoComparison`, `autoMetrics`, `autoTimeline`, `autoProgress`

### Browser Renderer
- Vanilla DOM renderer — 55+ components, zero framework dependencies
- Reactive `Store` with get/set/merge/toggle/append
- Rx expression engine: ternary, logical, arithmetic, 15+ pipes, dot access, scoped variables
- Action dispatcher — 15 action types
- MCP transport — HTTP POST to `/mcp/tools/call`
- Theme engine — CSS custom properties from `theme` field (light/dark)
- Chart renderer — built-in SVG for Bar, Line, Area, Pie
- Mermaid integration — delegates to global `mermaid` if available
- IIFE bundle: `renderer.min.js` (54KB) for `<script>` tag usage, `window.prefab` global

### ext-apps Bridge
- `app()` one-call factory with PostMessage transport, host theme mapping, lifecycle hooks
- Capability negotiation, display mode requests, tool input/result/cancelled/partial events
- Auto-detect environment: iframe → PostMessage, standalone → HTTP transport

### Validation & Accessibility
- `validateWireFormat()` + `isValidWireFormat()` with detailed error reporting
- Stylesheet injection — renderer applies `stylesheets` field as `<style>` tags
- ARIA roles/attributes and keyboard navigation on all interactive components

### Infra
- GitHub Actions CI (test + build on push) and publish (npm on tag)
- 253 tests passing across 11 files (570 assertions)
- MIT license
