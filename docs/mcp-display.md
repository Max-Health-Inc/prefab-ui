# MCP Display Helpers

These functions wrap prefab component trees as MCP tool result content arrays. Use them in MCP tool handlers to return rich UIs.

```ts
import { display, display_form, display_update, display_error } from 'prefab-ui/mcp'
```

---

## `display(view, opts?)`

Return a full UI as an MCP tool result.

```ts
import { display, Column, H1, autoTable } from 'prefab-ui'

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
  ]
}
```

---

## `display_form(tool, fields, opts?)`

Return a form that submits back to an MCP tool. Shorthand for building a `Form` + `Input` components manually.

```ts
import { display_form } from 'prefab-ui/mcp'

async function editUser(args: any) {
  const user = await db.getUser(args.id)
  return display_form('save_user', [
    { name: 'id', type: 'hidden', defaultValue: user.id },
    { name: 'name', type: 'text', required: true, defaultValue: user.name },
    { name: 'email', type: 'email', required: true, defaultValue: user.email },
    { name: 'role', type: 'select', options: ['admin', 'user'] },
  ], {
    title: 'Edit User',
    submitLabel: 'Save Changes',
  })
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `tool` | `string` | MCP tool to call on submit |
| `fields` | `AutoFormField[]` | Field definitions (same as `autoForm`) |
| `opts.title` | `string` | Form heading |
| `opts.subtitle` | `string` | Secondary text |
| `opts.submitLabel` | `string` | Submit button text |
| `opts.state` | `Record<string, unknown>` | Pre-fill state |

---

## `display_update(stateUpdate)`

Return a partial state update. The renderer merges these values into the existing store without re-rendering the full UI.

```ts
import { display_update } from 'prefab-ui/mcp'

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
      "text": "{\"$prefab\":{\"version\":\"0.2\"},\"stateUpdate\":{\"count\":43}}"
    }
  ]
}
```

---

## `display_error(message, opts?)`

Return a standardized error view.

```ts
import { display_error } from 'prefab-ui/mcp'

async function getPatient(args: any) {
  const patient = await db.getPatient(args.id)
  if (!patient) {
    return display_error('Patient not found', {
      code: 404,
      detail: `No patient with ID ${args.id}`,
    })
  }
  return display(patientView(patient))
}
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `code` | `number` | Error code |
| `detail` | `string` | Detailed error message |

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
  return display_form('save_patient', [
    { name: 'id', type: 'hidden', defaultValue: patient.id },
    { name: 'name', type: 'text', required: true, defaultValue: patient.name },
    { name: 'email', type: 'email', defaultValue: patient.email },
  ], { title: `Edit ${patient.name}` })
}
```
