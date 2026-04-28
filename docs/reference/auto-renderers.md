# Auto-Renderers

Auto-renderers generate complete UI components from raw data — no manual component wiring needed. They're ideal for MCP tool handlers that return API responses.

```ts
import {
  autoDetail, autoTable, autoChart, autoForm,
  autoComparison, autoMetrics, autoTimeline, autoProgress,
} from '@maxhealth.tech/prefab'
```

---

## `autoTable(data, opts?)`

Generate a `DataTable` from an array of objects. Columns are auto-detected from object keys.

```ts
const users = [
  { name: 'Alice', email: 'alice@co.com', status: 'active' },
  { name: 'Bob', email: 'bob@co.com', status: 'inactive' },
]

autoTable(users, { title: 'Users', searchable: true })
```

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Table heading |
| `searchable` | `boolean` | Enable search |
| `sortable` | `boolean` | Enable column sorting |
| `maxRows` | `number` | Limit rows shown |

Status columns (`status`, `state`, etc.) are automatically rendered as `Badge` components with semantic variants (green for active, red for inactive, etc.).

### Custom Status Variants

```ts
import { registerStatusVariants } from '@maxhealth.tech/prefab'

registerStatusVariants({
  'custom_status': 'success',
  'needs_review': 'warning',
})
```

---

## `autoDetail(data, opts?)`

Generate a key-value detail view from an object.

```ts
const user = { name: 'Alice', email: 'alice@co.com', role: 'Admin', joined: '2024-01-15' }

autoDetail(user, { title: 'User Profile' })
```

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Section heading |
| `exclude` | `string[]` | Keys to exclude |

---

## `autoChart(data, opts?)`

Generate a chart from data. Auto-selects the best chart type if not specified.

```ts
const sales = [
  { month: 'Jan', revenue: 10000, costs: 8000 },
  { month: 'Feb', revenue: 12000, costs: 8500 },
  { month: 'Mar', revenue: 15000, costs: 9000 },
]

autoChart(sales, { title: 'Revenue vs Costs', chartType: 'bar', xAxis: 'month' })
```

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Chart heading |
| `subtitle` | `string` | Secondary text |
| `chartType` | `ChartType` | `bar`, `line`, `area`, `pie` (default: auto-detect) |
| `xAxis` | `string` | Key for X axis labels |
| `height` | `number` | Chart height in px |
| `showLegend` | `boolean` | Show legend (default: true) |

Numeric columns are auto-detected as series. The first string column is used as the X axis if `xAxis` is not specified.

---

## `autoForm(fields, opts?)`

Generate a form from field definitions that submits to an MCP tool.

```ts
autoForm([
  { name: 'name', type: 'text', required: true },
  { name: 'email', type: 'email', required: true },
  { name: 'role', type: 'select', options: ['admin', 'user', 'viewer'] },
  { name: 'notes', type: 'textarea' },
], 'create_user', {
  title: 'Create User',
  submitLabel: 'Create',
})
```

The second argument is the `submitTool` — the MCP tool name to call on submit.

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Form heading |
| `subtitle` | `string` | Secondary text |
| `submitLabel` | `string` | Submit button text (default: `'Submit'`) |
| `onSubmit` | `Action` | Custom submit action (overrides submitTool) |
| `successMessage` | `string` | Toast message on success |
| `errorMessage` | `string` | Toast message on error |

### Field Definition

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Field name / state key |
| `label` | `string` | Display label (defaults to humanized name) |
| `type` | `string` | Input type (`text`, `email`, `number`, `password`, `url`, etc.) |
| `placeholder` | `string` | Placeholder text |
| `required` | `boolean` | Validation |

---

## `QuickForm(toolName)` — Chainable Builder

A composable builder for rapid form generation. Produces the same result as `autoForm`, with a more ergonomic API.

```ts
import { QuickForm } from '@maxhealth.tech/prefab'

const ui = QuickForm('create_user')
  .title('Create User')
  .text('name', { required: true })
  .email('email', { required: true })
  .password('password', { required: true })
  .submit('Create')
  .successMessage('User created!')
  .build()
```

### Methods

| Method | Description |
|--------|-------------|
| `.title(t)` | Form heading |
| `.subtitle(s)` | Secondary text |
| `.submit(label)` | Submit button text |
| `.field(name, opts?)` | Add field with explicit type |
| `.text(name, opts?)` | Shorthand for `type: 'text'` |
| `.email(name, opts?)` | Shorthand for `type: 'email'` |
| `.number(name, opts?)` | Shorthand for `type: 'number'` |
| `.password(name, opts?)` | Shorthand for `type: 'password'` |
| `.url(name, opts?)` | Shorthand for `type: 'url'` |
| `.tel(name, opts?)` | Shorthand for `type: 'tel'` |
| `.onSubmit(action)` | Custom submit action (overrides tool call) |
| `.successMessage(msg)` | Toast on success |
| `.errorMessage(msg)` | Toast on error |
| `.build()` | Build the component tree |

---

## `autoMetrics(metrics, opts?)`

Generate metric cards from numeric data.

```ts
autoMetrics([
  { label: 'Revenue', value: 125000, format: 'currency', change: 12.5 },
  { label: 'Users', value: 3420, change: -2.1 },
  { label: 'Uptime', value: 99.9, format: 'percent' },
], { title: 'KPIs', columns: 3 })
```

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Section heading |
| `columns` | `number` | Grid columns (default: auto) |

### Metric Definition

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Metric name |
| `value` | `number \| string` | Display value |
| `format` | `string` | `currency`, `percent`, `number` |
| `change` | `number` | % change (green if positive, red if negative) |
| `prefix` / `suffix` | `string` | Value decorations |

---

## `autoComparison(items, opts?)`

Side-by-side comparison view.

```ts
autoComparison([
  { name: 'Plan A', price: '$29/mo', storage: '10 GB', support: 'Email' },
  { name: 'Plan B', price: '$99/mo', storage: '100 GB', support: '24/7 Phone' },
], { title: 'Compare Plans', highlightDifferences: true })
```

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Section heading |
| `highlightDifferences` | `boolean` | Highlight differing values |

---

## `autoTimeline(events, opts?)`

Vertical timeline from date-ordered events.

```ts
autoTimeline([
  { date: '2024-01-15', title: 'Created', description: 'Account created' },
  { date: '2024-02-01', title: 'Verified', description: 'Email verified' },
  { date: '2024-03-10', title: 'Upgraded', description: 'Upgraded to Pro' },
], { title: 'Account History' })
```

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Section heading |

### Event Definition

| Prop | Type | Description |
|------|------|-------------|
| `date` | `string` | ISO date string |
| `title` | `string` | Event title |
| `description` | `string` | Event details |
| `status` | `string` | Optional status (renders as Badge) |

---

## `autoProgress(steps, opts?)`

Step-based progress tracker.

```ts
autoProgress([
  { label: 'Order Placed', status: 'complete' },
  { label: 'Processing', status: 'current' },
  { label: 'Shipped', status: 'pending' },
  { label: 'Delivered', status: 'pending' },
], { title: 'Order Status' })
```

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Section heading |

### Step Definition

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Step name |
| `status` | `string` | `complete`, `current`, `pending`, `error` |
| `description` | `string` | Step details |

---

## Combining Auto-Renderers

Auto-renderers return standard `Component` instances, so they compose freely:

```ts
display(
  Column({ gap: 8 }, [
    autoMetrics(kpis, { title: 'KPIs', columns: 4 }),
    Row({ gap: 4 }, [
      autoChart(salesData, { title: 'Revenue' }),
      autoChart(userData, { title: 'Signups', chartType: 'line' }),
    ]),
    autoTable(recentOrders, { title: 'Recent Orders' }),
  ]),
  { title: 'Dashboard' },
)
```
