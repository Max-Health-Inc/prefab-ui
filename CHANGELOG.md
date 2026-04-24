# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] — 2026-04-25

### Bug Fix: If/Elif/Else Conditional Chains
- **Fixed**: `Elif` and `Else` nodes rendered independently instead of being consumed by the preceding `If` chain. All branches in an `If/Elif/Else` sequence now render—only the first matching branch renders; the rest are skipped.
- New `renderChildArray()` in the render engine detects `If/Elif/Else` sibling sequences and evaluates them as a single conditional chain
- Orphaned `Elif`/`Else` nodes (not adjacent to an `If`) are silently skipped
- `ForEach`, `If`, and `Else` body rendering now uses chain-aware iteration for nested chains
- 55 new tests in `test/tdd-bugs-r2.test.ts` — **913 total tests**

## [0.2.1] — 2026-04-25

### Bug Fix: Browser Pipe Registration
- **Fixed**: Custom pipes registered in Node (via `registerPipe()`) were not available in the browser renderer bundle. Pipes are functions — they can't be serialized as JSON. The renderer loaded a fresh instance with zero custom pipes, causing `{{ name | humanName }}` to fall through to `[object Object]`.
- `PrefabApp({ pipes: { humanName: fn } })` — accepts pipe functions and serializes their source code into the wire format
- `PrefabWireFormat.pipes` — new optional field carrying pipe source strings
- Renderer `mount()` hydrates wire pipes via `new Function()` before first render
- `destroy()` cleans up wire-hydrated pipes (scoped to mount lifetime)
- `window.prefab` global now exposes `registerPipe`, `unregisterPipe`, `listPipes`
- Renderer module re-exports `registerPipe`, `unregisterPipe`, `listPipes`, `PipeFn`
- Built-in pipes cannot be shadowed by wire pipes (security)
- Invalid pipe source is caught gracefully (warning, no throw)
- 12 new tests in `test/pipe-wire.test.ts` — **858 total tests**

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
