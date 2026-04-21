# ext-apps Bridge

The bridge enables prefab apps running in iframes to communicate with their host via PostMessage. This is the integration layer for MCP ext-apps in hosts like MistralOS, Claude, ChatGPT, or VS Code.

## Quick Start

```html
<script src="renderer.min.js"></script>
<script>
  (async () => {
    const ui = await prefab.app();

    ui.onToolInput((args) => {
      ui.render('#root', { type: 'H1', content: `Hello ${args.name}!` });
    });
  })();
</script>
```

---

## `prefab.app(options?)`

Factory function that auto-detects the environment, performs the handshake, and returns a `PrefabApp` API object.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'bridge' \| 'standalone' \| 'auto'` | `'auto'` | Force bridge or standalone mode |
| `hostOrigin` | `string` | `'*'` | Allowed origin for PostMessage (set in production!) |
| `transport` | `McpTransportOptions` | — | HTTP transport config for standalone mode |
| `capabilities` | `AppCapabilities` | `{ toolInput: true }` | Capabilities to advertise |

### Environment Detection

| Condition | Mode | Transport |
|-----------|------|-----------|
| Running in iframe | Bridge | PostMessage via `window.parent` |
| Standalone + transport config | Standalone | HTTP POST |
| Standalone, no config | Standalone | Noop (actions silently succeed) |

---

## `PrefabApp` API

### Tool Communication

```ts
// Call an MCP tool
const result = await ui.callTool('search_users', { query: 'alice' });

// Send a chat message
await ui.sendMessage('Operation complete');
```

### Lifecycle Hooks

```ts
// Receive tool input from the host
ui.onToolInput((args) => {
  console.log('Tool args:', args);
  ui.render('#root', buildUI(args));
});

// Receive tool results
ui.onToolResult((result) => {
  console.log('Tool result:', result);
});

// Handle cancellation
ui.onToolCancelled(() => {
  console.log('Tool was cancelled');
});

// Streaming partial input
ui.onToolInputPartial((partialArgs) => {
  console.log('Partial input:', partialArgs);
});
```

The first `onToolInput` delivery is buffered — if the host sends tool input before the handler is registered, it's delivered immediately when `onToolInput` is called.

### Rendering

```ts
// Render component JSON into a DOM target
const handle = ui.render('#root',
  { type: 'Column', children: [
    { type: 'H1', content: 'Hello' },
    { type: 'Text', content: '{{ state.message }}' },
  ]},
);

// Re-render
handle.rerender();

// Access state
handle.store.set('message', 'Updated!');

// Unmount
handle.destroy();
```

### Display Modes

```ts
ui.requestMode('fullscreen');  // Request fullscreen
ui.requestMode('pip');         // Picture-in-picture
ui.requestMode('inline');      // Back to inline
```

### Host Integration

```ts
ui.openLink('https://docs.example.com', '_blank');
ui.updateContext({ selectedPatient: 'patient-123' });
```

### Host Info

```ts
ui.host;          // HostContext: { capabilities, theme?, name?, version? }
ui.capabilities;  // HostCapabilities: { toast?, clipboard?, navigation? }
ui.theme;         // HostTheme | undefined
ui.transport;     // The underlying McpTransport
```

### Cleanup

```ts
ui.destroy();  // Disconnects bridge, removes listeners
```

---

## PostMessage Protocol

All messages use a `prefab:` namespace prefix.

### App → Host Messages

| Type | Payload | Description |
|------|---------|-------------|
| `prefab:init` | `{ capabilities }` | Handshake init |
| `prefab:tool-call` | `{ tool, arguments }` | MCP tool invocation |
| `prefab:send-message` | `{ message }` | Chat message |
| `prefab:request-mode` | `{ mode }` | Display mode request |
| `prefab:open-link` | `{ url, target? }` | URL navigation |
| `prefab:update-context` | `{ context }` | Context update |

### Host → App Messages

| Type | Payload | Description |
|------|---------|-------------|
| `prefab:init-response` | `{ capabilities, theme? }` | Handshake response |
| `prefab:tool-input` | `{ args }` | Tool input delivery |
| `prefab:tool-input-partial` | `{ args }` | Streaming partial input |
| `prefab:tool-result` | `{ result }` | Tool execution result |
| `prefab:tool-cancelled` | `{}` | Tool was cancelled |
| `prefab:theme-update` | `HostTheme` | Theme change |
| `prefab:state-update` | `Record<string, unknown>` | State merge |

### Message Shape

```ts
interface BridgeMessage {
  type: string;           // e.g. 'prefab:tool-call'
  payload?: Record<string, unknown>;
  id?: string;            // For request/response correlation
}
```

### Handshake Flow

```
App                          Host
 │                            │
 │── prefab:init ────────────>│  { capabilities: { toolInput: true } }
 │                            │
 │<── prefab:init-response ───│  { capabilities: { toast: true }, theme: {...} }
 │                            │
 │<── prefab:tool-input ──────│  { args: { patientId: '123' } }
 │                            │
 │── prefab:tool-call ───────>│  { tool: 'get_patient', arguments: {...} }
 │                            │
 │<── prefab:tool-call-response│  { result: { name: 'Alice', ... } }
```

---

## Host Theme

The host can provide CSS variables during the handshake or via `prefab:theme-update`:

```ts
interface HostTheme {
  primary?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  border?: string;
  radius?: string;
  // ... any CSS custom property
}
```

The bridge applies these as `--property: value` on `document.documentElement`.

---

## Security

- Set `hostOrigin` to the expected host origin in production (not `'*'`)
- The bridge validates `event.origin` on incoming messages
- Tool call responses use `id` correlation to prevent spoofing
- Tool calls have a 30-second timeout

```ts
const ui = await prefab.app({
  hostOrigin: 'https://app.mistralos.com',
});
```

---

## Bridge Class (Low-Level)

For custom integrations, use `Bridge` directly:

```ts
import { Bridge, isIframe, applyHostTheme } from '@maxhealth.tech/prefab/renderer';

if (isIframe()) {
  const bridge = new Bridge('https://host.example.com');
  bridge.connect();

  const hostCtx = await bridge.initialize({ toolInput: true });
  const transport = bridge.createTransport();

  bridge.on('prefab:tool-input', (payload) => {
    console.log('Tool input:', payload.args);
  });

  // Cleanup
  bridge.disconnect();
}
```
