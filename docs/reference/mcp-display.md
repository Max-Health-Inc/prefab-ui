# MCP Display Helpers

These functions wrap prefab component trees as MCP tool result content arrays. Use them in MCP tool handlers to return rich UIs.

```ts
import {
  display, display_form, display_update, display_error, display_success,
  resourceMeta, PREFAB_CDN_META,
} from '@maxhealth.tech/prefab/mcp'
```

---

## `display(view, opts?)`

Return a full UI as an MCP tool result.

```ts
import { display, Column, H1, autoTable } from '@maxhealth.tech/prefab'

async function listPatients(args: any) {
  const patients = await db.query('SELECT * FROM patients')
  return display(
    Column({ gap: 6 }, [
      H1('Patients'),
      autoTable(patients),
    ]),
    { title: 'Patient List' },
  )
}
```

Accepts either a `Component` (auto-wrapped in `PrefabApp`) or a `PrefabApp` instance.

### Options

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Page title |
| `state` | `Record<string, unknown>` | Initial reactive state |
| `theme` | `Theme` | Light/dark theme overrides |
| `defs` | `Record<string, Component>` | Reusable component templates |
| `onMount` | `Action \| Action[]` | Run when the UI mounts |
| `keyBindings` | `Record<string, Action>` | Keyboard shortcuts |
| `cssClass` | `string` | Root CSS class |

### Return Shape

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"$prefab\":{\"version\":\"0.2\"},\"view\":{...},\"state\":{...}}"
    }
  ],
  "structuredContent": { "$prefab": { "version": "0.2" }, "view": { ... } }
}
```

> **Since v0.2.18:** All display helpers include `structuredContent` alongside
> `content[]`. This is required for MCP Apps hosts to render the iframe UI.

---

## `display_form(fields, submitTool, opts?)`

Return a form that submits back to an MCP tool. Shorthand for building a `Form` + `Input` components manually.

```ts
import { display_form } from '@maxhealth.tech/prefab/mcp'

async function editUser(args: any) {
  const user = await db.getUser(args.id)
  return display_form([
    { name: 'id', type: 'hidden', defaultValue: user.id },
    { name: 'name', type: 'text', required: true, defaultValue: user.name },
    { name: 'email', type: 'email', required: true, defaultValue: user.email },
    { name: 'role', type: 'select', options: ['admin', 'user'] },
  ], 'save_user', {
    title: 'Edit User',
    submitLabel: 'Save Changes',
  })
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `fields` | `AutoFormField[]` | Field definitions (same as `autoForm`) |
| `submitTool` | `string` | MCP tool to call on submit |
| `opts.title` | `string` | Form heading |
| `opts.subtitle` | `string` | Secondary text |
| `opts.submitLabel` | `string` | Submit button text |
| `opts.state` | `Record<string, unknown>` | Pre-fill state |

---

## `display_update(stateUpdate)`

Return a partial state update. The renderer merges these values into the existing store without re-rendering the full UI.

```ts
import { display_update } from '@maxhealth.tech/prefab/mcp'

async function incrementCounter(args: any) {
  const newCount = args.currentCount + 1
  return display_update({ count: newCount, lastUpdated: new Date().toISOString() })
}
```

### Return Shape

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"$prefab\":{\"version\":\"0.2\"},\"update\":{\"state\":{\"count\":43}}}"
    }
  ]
}
```

---

## `display_error(title, message, opts?)`

Return a standardized error view.

```ts
import { display_error } from '@maxhealth.tech/prefab/mcp'

async function getPatient(args: any) {
  const patient = await db.getPatient(args.id)
  if (!patient) {
    return display_error('Not Found', 'Patient not found', {
      detail: `No patient with ID ${args.id}`,
      hint: 'Check the patient ID and try again.',
    })
  }
  return display(patientView(patient))
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Error heading (shown in alert title) |
| `message` | `string` | Error description |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `detail` | `string` | Detailed error / stack trace (shown in code block) |
| `hint` | `string` | Help text for the user (shown as muted text) |
| `theme` | `Theme` | Theme overrides |

---

## `display_success(title, message, opts?)`

Return a success confirmation view (green alert with check icon).

```ts
import { display_success } from '@maxhealth.tech/prefab/mcp'

async function deleteUser(args: any) {
  await db.deleteUser(args.id)
  return display_success('Deleted', `User ${args.id} removed successfully`, {
    detail: 'All associated data has been archived.',
  })
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `title` | `string` | Success heading |
| `message` | `string` | Success description |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `detail` | `string` | Additional context (shown as muted text) |
| `theme` | `Theme` | Theme overrides |

---

## `resourceMeta(opts?)`

Generate the `_meta` object for `ui://` resource registration. Includes CSP and Permission Policy configuration.

```ts
import { resourceMeta, PREFAB_CDN_META } from '@maxhealth.tech/prefab/mcp'

// Custom meta with permissions:
const meta = resourceMeta({
  csp: { resourceDomains: ['https://cdn.jsdelivr.net'] },
  permissions: { camera: true, clipboardWrite: true },
})

// Or use the pre-built default (jsDelivr CDN only):
mcp.resource('viewer', 'ui://my/viewer', {
  mimeType: 'text/html;profile=mcp-app',
  _meta: PREFAB_CDN_META,
}, async (uri) => ({
  contents: [{ uri: uri.toString(), mimeType: 'text/html;profile=mcp-app', text: html, _meta: PREFAB_CDN_META }],
}))
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `csp.resourceDomains` | `string[]` | Origins for scripts, styles, images |
| `csp.connectDomains` | `string[]` | Origins for fetch/XHR/WebSocket |
| `csp.frameDomains` | `string[]` | Origins for nested iframes |
| `csp.baseUriDomains` | `string[]` | Additional base URIs |
| `permissions.camera` | `boolean` | Request camera access |
| `permissions.microphone` | `boolean` | Request microphone access |
| `permissions.geolocation` | `boolean` | Request geolocation access |
| `permissions.clipboardWrite` | `boolean` | Request clipboard write access |

---

## `PrefabApp.toMcpResult()`

On any `PrefabApp` instance, call `.toMcpResult()` to get a ready-to-return tool result:

```ts
import { PrefabApp, Column, H1 } from '@maxhealth.tech/prefab'

const app = new PrefabApp({
  title: 'Dashboard',
  view: Column([H1('Hello')]),
})

// In your tool handler:
return app.toMcpResult()
// → { content: [{ type: 'text', text: '...' }], structuredContent: { ... } }
```

---

## Pattern: Tool Chain

A common pattern is a list tool → detail tool → edit form:

```ts
// Tool 1: List
async function listPatients() {
  const patients = await db.query('SELECT * FROM patients')
  return display(
    autoTable(patients, { title: 'Patients' }),
    {
      state: { patients },
      onMount: CallTool('get_stats', { resultKey: 'stats' }),
    },
  )
}

// Tool 2: Detail (called from table row click)
async function getPatient(args: { id: string }) {
  const patient = await db.getPatient(args.id)
  return display(
    Column([
      H1(patient.name),
      autoDetail(patient),
      Button('Edit', { onClick: CallTool('edit_patient_form', { arguments: { id: patient.id } }) }),
    ]),
  )
}

// Tool 3: Edit form
async function editPatientForm(args: { id: string }) {
  const patient = await db.getPatient(args.id)
  return display_form([
    { name: 'id', type: 'hidden', defaultValue: patient.id },
    { name: 'name', type: 'text', required: true, defaultValue: patient.name },
    { name: 'email', type: 'email', defaultValue: patient.email },
  ], 'save_patient', { title: `Edit ${patient.name}` })
}
```
