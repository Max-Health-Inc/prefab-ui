# Actions Reference

Actions are serializable commands attached to component events (`onClick`, `onChange`, `onSubmit`, `onMount`). They execute either client-side (no server roundtrip) or via MCP transport.

## Client Actions

### `SetState(key, value, opts?)`

Set a reactive state value.

```ts
Button('Increment', { onClick: SetState('count', rx`${STATE}.count + 1`) })
```

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | State key to set |
| `value` | `unknown` | New value (can be Rx expression) |
| `opts.onSuccess` | `Action \| Action[]` | Run after success |
| `opts.onError` | `Action \| Action[]` | Run on error |

**Wire JSON:** `{ "action": "setState", "key": "count", "value": "{{ state.count + 1 }}" }`

### `ToggleState(key)`

Toggle a boolean state value.

```ts
Switch({ name: 'dark', onChange: ToggleState('darkMode') })
```

**Wire JSON:** `{ "action": "toggleState", "key": "darkMode" }`

### `AppendState(key, value, index?)`

Append a value to a state array. Optional `index` for insertion position.

```ts
Button('Add Item', { onClick: AppendState('todos', { text: 'New todo', done: false }) })
```

### `PopState(key, index)`

Remove an item from a state array by index.

```ts
Button('Remove', { onClick: PopState('todos', rx`${INDEX}`) })
```

### `ShowToast(message, opts?)`

Display a toast notification.

```ts
Button('Save', { onClick: ShowToast('Saved successfully!', { variant: 'success' }) })
```

| Param | Type | Description |
|-------|------|-------------|
| `message` | `string` | Toast message |
| `opts.description` | `string` | Secondary text |
| `opts.variant` | `ToastVariant` | `default`, `success`, `error`, `warning`, `info` |
| `opts.duration` | `number` | Auto-dismiss in ms |

### `CloseOverlay()`

Close the current dialog/popover.

```ts
Button('Close', { onClick: new CloseOverlay() })
```

### `OpenLink(url, target?)`

Navigate to a URL.

```ts
Button('Docs', { onClick: new OpenLink('https://docs.example.com', '_blank') })
```

### `SetInterval(intervalMs, onTick)`

Periodic timer that fires an action.

```ts
// Refresh data every 30 seconds
SetInterval(30000, CallTool('get_data', { resultKey: 'data' }))
```

### `Fetch(url, opts?)`

HTTP request from the client.

```ts
Button('Load', { onClick: new Fetch('/api/data', {
  method: 'GET',
  resultKey: 'apiData',
  onSuccess: ShowToast('Loaded!'),
  onError: ShowToast('Failed', { variant: 'error' }),
}) })
```

| Param | Type | Description |
|-------|------|-------------|
| `url` | `string` | Request URL |
| `opts.method` | `string` | HTTP method |
| `opts.headers` | `Record<string, string>` | Request headers |
| `opts.body` | `unknown` | Request body |
| `opts.resultKey` | `string` | State key to store the response |
| `opts.onSuccess` | `Action \| Action[]` | Success callback |
| `opts.onError` | `Action \| Action[]` | Error callback |

### `OpenFilePicker(opts?)`

Open a native file picker.

```ts
Button('Upload', { onClick: new OpenFilePicker({
  accept: 'image/*',
  multiple: true,
  resultKey: 'selectedFiles',
}) })
```

### `CallHandler(handler, opts?)`

Call a named client-side handler function.

```ts
Button('Custom', { onClick: new CallHandler('myHandler', {
  arguments: { id: rx`${STATE}.selectedId` },
}) })
```

---

## MCP Actions

These actions require a server roundtrip via the MCP transport (PostMessage bridge or HTTP).

### `CallTool(tool, opts?)`

Invoke an MCP tool from the UI.

```ts
// In a form submission
Form({ onSubmit: CallTool('create_user', { resultKey: 'result' }) }, [
  Input({ name: 'email', type: 'email' }),
  Button('Create', { type: 'submit' }),
])

// In a button click
Button('Refresh', { onClick: CallTool('get_data', {
  arguments: { id: rx`${STATE}.selectedId` },
  resultKey: 'data',
  onSuccess: ShowToast('Data loaded'),
  onError: ShowToast('Failed to load', { variant: 'error' }),
}) })
```

| Param | Type | Description |
|-------|------|-------------|
| `tool` | `string` | MCP tool name |
| `opts.arguments` | `Record<string, unknown>` | Tool arguments (supports Rx) |
| `opts.resultKey` | `string` | State key to store the result |
| `opts.onSuccess` | `Action \| Action[]` | Success callback |
| `opts.onError` | `Action \| Action[]` | Error callback |

**Wire JSON:** `{ "action": "toolCall", "tool": "create_user", "arguments": {...}, "resultKey": "result" }`

### `SendMessage(message)`

Send a chat message through the MCP transport.

```ts
Button('Send', { onClick: new SendMessage(rx`${STATE}.messageText`) })
```

### `UpdateContext(context)`

Update shared context on the host.

```ts
Button('Set Theme', { onClick: new UpdateContext({ theme: 'dark' }) })
```

### `RequestDisplayMode(mode)`

Request a display mode change from the host.

```ts
Button('Fullscreen', { onClick: new RequestDisplayMode('fullscreen') })
```

| Mode | Description |
|------|-------------|
| `inline` | Default embedded mode |
| `fullscreen` | Full-screen overlay |
| `pip` | Picture-in-picture |

---

## Action Chaining

Actions can be chained via `onSuccess` / `onError`:

```ts
Button('Save & Notify', {
  onClick: CallTool('save_item', {
    arguments: { name: rx`${STATE}.name` },
    onSuccess: [
      SetState('saved', true),
      ShowToast('Saved!', { variant: 'success' }),
    ],
    onError: ShowToast('Save failed', { variant: 'error' }),
  }),
})
```

## Lifecycle Actions

Use `onMount` at the app level to run actions when the UI first renders:

```ts
display(myView, {
  onMount: CallTool('get_initial_data', { resultKey: 'data' }),
})
```
