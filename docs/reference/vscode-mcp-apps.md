# Rendering MCP App UIs in VS Code Copilot Chat

How to make a Model Context Protocol (MCP) server return interactive UIs
that render inside VS Code Copilot Chat instead of as raw JSON.

This guide is the result of reverse-engineering VS Code's built-in MCP
Apps host (protocol version `2026-01-26`). It documents the exact wire
format and the gotchas that cost us several hours of debugging.

> **TL;DR** VS Code does **not** speak the `prefab:*` or `ext-apps` SDK
> bridge protocols. It uses its own **JSON-RPC 2.0 over `postMessage`**
> protocol with `ui/*` methods, and it reads CSP from the **content
> item** returned by `readResource`, not from the resource listing.

## Architecture overview

```
┌─────────────────────────┐  stdio   ┌──────────────────────────┐
│   VS Code Copilot Chat  │◄────────►│   your MCP server (Node) │
└──────────┬──────────────┘  MCP     └──────────────────────────┘
           │
           │  sandboxed iframe (CSP-restricted)
           ▼
┌─────────────────────────┐  postMessage   ┌──────────────────┐
│  ui:// resource (HTML)  │◄──────────────►│  VS Code host    │
│  + your renderer JS     │   JSON-RPC     │  (acquireVsCode  │
│                         │   ui/* methods │   Api)           │
└─────────────────────────┘                └──────────────────┘
```

The flow:

1. Tool's `_meta.ui.resourceUri` points VS Code at a `ui://` resource.
2. VS Code calls `readResource` and reads the HTML + CSP from the
   returned content item's `_meta.ui`.
3. VS Code injects a CSP meta tag and a postMessage shim, then loads the
   HTML in a sandboxed webview.
4. When the tool runs, VS Code sends the result to the iframe as a
   JSON-RPC `ui/notifications/tool-result` notification.
5. Your renderer JS listens for that message and renders the UI.

## Server-side wire format

### 1. Tools — point at the renderer resource

```ts
mcp.registerTool(
  'browse_patient',
  {
    title: 'Browse Patient',
    description: '...',
    inputSchema: { /* zod shape */ },
    _meta: { ui: { resourceUri: 'ui://your/viewer' } },
  },
  async (args) => ({
    content: [{ type: 'text', text: JSON.stringify(myPrefabData) }],
    // ⚠️ structuredContent is REQUIRED for VS Code to render the UI.
    structuredContent: myPrefabData,
  }),
);
```

`structuredContent` is what VS Code forwards to the iframe via
`ui/notifications/tool-result`. The text in `content[]` is the LLM
fallback for hosts without UI rendering.

### 2. Renderer resource — CSP belongs on the content item

This is the bug that wastes everyone's afternoon. `_meta` on the
resource **listing** is ignored by VS Code's iframe loader. CSP must
appear on the **individual content item** returned by `readResource`.

```ts
const CSP_META = {
  ui: {
    csp: {
      // Origins allowed for <script src>, <link href>, <img>, etc.
      resourceDomains: ['https://cdn.jsdelivr.net'],
      // Origins allowed for fetch / XHR / WebSocket.
      connectDomains: [],
      // Origins allowed in <iframe>.
      frameDomains: [],
      baseUriDomains: [],
    },
  },
};

mcp.resource(
  'viewer',
  'ui://your/viewer',
  {
    title: 'My Viewer',
    mimeType: 'text/html;profile=mcp-app',
    _meta: CSP_META,                       // for the resource listing
  },
  async (uri) => ({
    contents: [{
      uri: uri.toString(),
      mimeType: 'text/html;profile=mcp-app',
      text: rendererHtml(),
      _meta: CSP_META,                     // ← THIS one is what VS Code reads
    }],
  }),
);
```

The MIME type is exactly `text/html;profile=mcp-app` (with no space
around the semicolon). Plain `text/html` is silently treated as a
non-app resource.

### 3. The CSP that VS Code ends up applying

VS Code merges your `_meta.ui.csp` into this template:

```
default-src 'none';
script-src 'self' 'unsafe-inline' {resourceDomains};
style-src  'self' 'unsafe-inline' {resourceDomains};
connect-src 'self' {connectDomains};
img-src 'self' data: {resourceDomains};
font-src 'self' {resourceDomains};
media-src 'self' data: {resourceDomains};
frame-src {frameDomains || 'none'};
object-src 'none';
base-uri {baseUriDomains || 'self'};
```

Inline `<script>` works (`'unsafe-inline'`), but external
`<script src="https://...">` requires the origin to be listed in
`resourceDomains`.

## Client-side: the `ui/*` JSON-RPC protocol

Inside the iframe, communication with VS Code happens via
`acquireVsCodeApi().postMessage(...)` and `window.addEventListener('message', ...)`.

All envelopes are JSON-RPC 2.0:

```jsonc
// Host → client: tool result for the matching tool call
{
  "jsonrpc": "2.0",
  "method":  "ui/notifications/tool-result",
  "params":  {
    "content": [{ "type": "text", "text": "..." }],
    "structuredContent": { /* your UI payload */ }
  }
}

// Host → client: tool input arguments (echoed for context)
{
  "jsonrpc": "2.0",
  "method":  "ui/notifications/tool-input",
  "params":  { "arguments": { /* tool args */ } }
}

// Host → client: initialize request (responds with empty result is fine)
{
  "jsonrpc": "2.0",
  "id":      0,
  "result": {
    "protocolVersion": "2026-01-26",
    "hostInfo":        { "name": "Visual Studio Code", "version": "..." },
    "hostCapabilities": { /* ... */ }
  }
}
```

Methods (per the MCP Apps spec):

| Method                                       | Direction         | Purpose                                |
| -------------------------------------------- | ----------------- | -------------------------------------- |
| `ui/initialize`                              | client → host     | Handshake request                      |
| *(response to `ui/initialize`)*              | host → client     | `McpUiInitializeResult`                |
| `ui/notifications/initialized`               | client → host     | View confirms it is ready              |
| `ui/notifications/sandbox-proxy-ready`       | sandbox → host    | Sandbox proxy is ready                 |
| `ui/notifications/sandbox-resource-ready`    | host → sandbox    | Host sends HTML to the sandbox proxy   |
| `ui/notifications/tool-input`                | host → client     | Forwarded tool arguments               |
| `ui/notifications/tool-input-partial`        | host → client     | Streaming partial input                |
| `ui/notifications/tool-result`               | host → client     | Final tool result                      |
| `ui/notifications/tool-cancelled`            | host → client     | Tool call cancelled                    |
| `ui/notifications/host-context-changed`      | host → client     | Theme / locale / dimensions changed    |
| `ui/notifications/size-changed`              | client → host     | View resize                            |
| `ui/open-link`                               | client → host     | Open URL externally                    |
| `ui/message`                                 | client → host     | Send a message to the chat conversation |
| `ui/request-display-mode`                    | client → host     | Switch display mode                    |
| `ui/update-model-context`                    | client → host     | Update model context                   |
| `ui/resource-teardown`                       | host → client     | Iframe is being destroyed              |

> **Note:** the View (your iframe) never sends `sandbox-resource-ready` —
> that one travels host → sandbox proxy and is internal to VS Code.
> After receiving the response to `ui/initialize`, the View must send
> `ui/notifications/initialized` to signal readiness.

## Working adapter — renderer HTML

Two options for rendering `@maxhealth.tech/prefab` `$prefab` JSON
inside a `ui://` resource. Both work in VS Code, Claude Desktop,
ChatGPT, and any other MCP Apps host.

### Option A: `renderer.auto.min.js` (recommended)

Since **v0.2.8**, the auto-mount bundle handles all three bridge
protocols (`prefab:*`, `ui/*` JSON-RPC, `ext-apps`) with zero inline
script. It races the handshakes in parallel, buffers tool results
that arrive before the handler is wired, and defers boot until the DOM
is interactive.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prefab</title>
  <link rel="stylesheet" crossorigin
        href="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.8/dist/prefab.css">
</head>
<body>
  <div id="root"></div>
  <script crossorigin
          src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.8/dist/renderer.auto.min.js"></script>
</body>
</html>
```

That's the entire file. No inline `<script>`, no adapter code. The
auto bundle:

1. Waits for `DOMContentLoaded` (or microtask if already loaded)
2. Calls `app()` which races `prefab:init` and `ui/initialize` in
   parallel — whichever protocol responds first wins
3. Registers `onToolResult` and `onToolInput` handlers
4. Mounts `$prefab` wire data into `#root` when a tool result arrives

> **Requires `≥ 0.2.8`.** Earlier versions used a sequential waterfall
> (prefab → JSON-RPC → ext-apps) that wasted 1.5s on every JSON-RPC
> host and could miss early tool results.

### Option B: `renderer.min.js` + inline adapter

If you need full control over the JSON-RPC handshake, or you're using
a pre-0.2.8 version, load the library-only bundle and wire the
protocol yourself:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prefab</title>
  <link rel="stylesheet" crossorigin
        href="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.8/dist/prefab.css">
</head>
<body>
  <div id="root"></div>
  <script crossorigin
          src="https://cdn.jsdelivr.net/npm/@maxhealth.tech/prefab@0.2.8/dist/renderer.min.js"></script>
  <script>
    (function () {
      var api = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
      var post = function (msg) {
        if (api) api.postMessage(msg);
        else if (window.parent !== window) window.parent.postMessage(msg, '*');
      };
      var mounted = null;

      function isPrefab(d) { return d && typeof d === 'object' && d.$prefab && d.view; }
      function tryParse(t) { try { return JSON.parse(t); } catch (_) { return null; } }
      function extract(payload) {
        if (!payload) return null;
        if (payload.structuredContent && isPrefab(payload.structuredContent)) {
          return payload.structuredContent;
        }
        if (Array.isArray(payload.content)) {
          for (var i = 0; i < payload.content.length; i++) {
            var c = payload.content[i];
            if (c && c.type === 'text' && typeof c.text === 'string') {
              var parsed = tryParse(c.text);
              if (isPrefab(parsed)) return parsed;
            }
          }
        }
        if (isPrefab(payload)) return payload;
        return null;
      }
      function render(data) {
        var root = document.getElementById('root');
        if (mounted && typeof mounted.destroy === 'function') {
          try { mounted.destroy(); } catch (_) {}
        }
        try { mounted = window.prefab.mount(root, data); }
        catch (e) { root.textContent = 'Render error: ' + (e && e.message || e); }
      }

      var INIT_ID = 1;
      var initialized = false;

      window.addEventListener('message', function (e) {
        var msg = e.data;
        if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') return;

        if (msg.id === INIT_ID && !msg.method && !initialized) {
          initialized = true;
          post({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
          return;
        }

        if (msg.method && typeof msg.id !== 'undefined') {
          post({ jsonrpc: '2.0', id: msg.id, result: {} });
        }

        if (msg.method === 'ui/notifications/tool-result') {
          var data = extract(msg.params);
          if (data) render(data);
        } else if (msg.method === 'ui/notifications/tool-input') {
          var input = msg.params && msg.params.arguments;
          if (input && isPrefab(input)) render(input);
        }
      });

      post({
        jsonrpc: '2.0', id: INIT_ID, method: 'ui/initialize',
        params: {
          protocolVersion: '2026-01-26',
          capabilities: {},
          clientInfo: { name: 'prefab-renderer', version: '0.2.8' }
        }
      });
    })();
  </script>
</body>
</html>
```

## Common pitfalls

### "Black iframe" / nothing renders

Cause: CSP is blocking the external script load. VS Code only adds your
`resourceDomains` to `script-src` if `_meta.ui.csp` is present on the
**content item**, not on the resource listing.

Fix: add `_meta` to each entry of the `contents` array returned by
`readResource`.

### `Cannot read properties of undefined (reading 'startsWith')`

Cause: you're using `renderer.auto.min.js` **before v0.2.8**. Older
versions used a sequential handshake waterfall that races against
VS Code's own initialization.

Fix: upgrade to `@maxhealth.tech/prefab@0.2.8` or later. The auto
bundle now works correctly in VS Code.

### `prefab:init timeout` followed by `ext-apps init timeout`

Same root cause — pre-0.2.8 `app()` tried protocols sequentially.
Upgrade to v0.2.8+ which races them in parallel.

### Iframe loads but shows raw JSON

You returned `content` but no `structuredContent`. VS Code only invokes
the UI rendering path when `structuredContent` is set. Add it to your
tool result.

### Wrong MIME type

It must be exactly `text/html;profile=mcp-app`. Other MIME types are
treated as ordinary `ui://` resources and won't trigger the iframe
loader.

## Reference

- VS Code core: `resources/app/out/vs/workbench/workbench.desktop.main.js`
  - `_injectPreamble({ html, csp })` — builds the CSP meta tag and the
    `acquireVsCodeApi()` shim.
  - `loadResource(uri)` — reads the resource, returns
    `{ ...n._meta?.ui, html, mimeType }`.
- Working implementation: [`packages/mcp/src/server.ts`](../packages/mcp/src/server.ts)
  (`rendererHtml()`).
- Reference Python implementation: `prefab_ui` and `fastmcp` on PyPI.
