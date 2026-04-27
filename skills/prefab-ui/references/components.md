# Components Reference

All component props for the `$prefab` wire format. Every component is a JSON object with `"type"` plus type-specific fields.

## Layout

### Column / Row

```json
{ "type": "Column", "gap": 16, "align": "center", "justify": "start", "children": [...] }
{ "type": "Row", "gap": 8, "children": [...] }
```

| Prop | Type | Description |
|------|------|-------------|
| `gap` | `number` | Spacing between children (px) |
| `align` | `string` | Cross-axis: `start`, `center`, `end`, `stretch` |
| `justify` | `string` | Main-axis: `start`, `center`, `end`, `between`, `around` |

### Grid / GridItem

```json
{ "type": "Grid", "columns": 3, "gap": 16, "children": [
  { "type": "GridItem", "span": 2, "children": [...] },
  { "type": "GridItem", "children": [...] }
]}
```

### Container / Div / Span

Generic wrappers. `Container` adds max-width + centering.

### MasterDetail

Two-pane layout. First child = master list, second = detail.

```json
{ "type": "MasterDetail", "masterWidth": "33%", "gap": 16, "children": [
  { "type": "Column", "children": [...] },
  { "type": "Detail", "of": "{{ state.selectedId }}", "children": [...] }
]}
```

### Pages / Page

```json
{ "type": "Pages", "name": "currentPage", "children": [
  { "type": "Page", "id": "home", "children": [...] },
  { "type": "Page", "id": "settings", "children": [...] }
]}
```

## Typography

### Heading

```json
{ "type": "Heading", "content": "Dashboard", "level": 2 }
```

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Text (supports `{{ }}`) |
| `level` | `1-4` | Heading level |

Shorthands: `H1`, `H2`, `H3`, `H4` — same as `Heading` with fixed level.

### Text / P / Lead / Large / Small / Muted

```json
{ "type": "Text", "content": "Hello {{ state.name }}" }
{ "type": "Muted", "content": "Last updated 5 min ago" }
```

### Markdown

```json
{ "type": "Markdown", "content": "## Hello\n\nThis is **bold** text with `code`." }
```

### Link

```json
{ "type": "Link", "content": "Visit site", "href": "https://example.com", "target": "_blank" }
```

### Code / Kbd

```json
{ "type": "Code", "content": "const x = 42;" }
{ "type": "Kbd", "content": "Ctrl+S" }
```

## Card

```json
{ "type": "Card", "children": [
  { "type": "CardHeader", "children": [
    { "type": "CardTitle", "content": "User Profile" },
    { "type": "CardDescription", "content": "Manage your account settings" }
  ]},
  { "type": "CardContent", "children": [...] },
  { "type": "CardFooter", "children": [
    { "type": "Button", "label": "Save", "variant": "default" }
  ]}
]}
```

## Data Display

### DataTable

```json
{ "type": "DataTable",
  "columns": [
    { "key": "name", "header": "Name", "sortable": true },
    { "key": "email", "header": "Email" },
    { "key": "role", "header": "Role", "sortable": true }
  ],
  "rows": [
    { "name": "Alice", "email": "alice@co.com", "role": "Admin" },
    { "name": "Bob", "email": "bob@co.com", "role": "User" }
  ],
  "search": true,
  "paginated": true
}
```

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `ColumnDef[]` | Column definitions |
| `rows` | `object[] \| string` | Data array or `{{ }}` expression |
| `search` | `boolean` | Show search box |
| `paginated` | `boolean` | Enable pagination |

#### ColumnDef

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Row object field name |
| `header` | `string` | Display header |
| `sortable` | `boolean` | Enable sorting |
| `format` | `string` | Pipe name (e.g. `'currency'`) |

### Badge

```json
{ "type": "Badge", "label": "Active", "variant": "success" }
```

Variants: `default`, `secondary`, `outline`, `success`, `warning`, `destructive`, `info`

### Metric

```json
{ "type": "Metric", "label": "Revenue", "value": "$48,290", "change": 12.5 }
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Metric name |
| `value` | `string \| number` | Display value |
| `change` | `number` | % change (positive=green, negative=red) |
| `prefix` | `string` | e.g. `$` |
| `suffix` | `string` | e.g. `%` |

### Progress

```json
{ "type": "Progress", "value": 75, "max": 100 }
```

### Separator / Loader / Icon

```json
{ "type": "Separator" }
{ "type": "Loader" }
{ "type": "Icon", "name": "check" }
```

## Form

### Input

```json
{ "type": "Input", "name": "email", "inputType": "email", "label": "Email", "placeholder": "you@example.com", "required": true }
```

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | State key |
| `inputType` | `string` | `text`, `email`, `number`, `password`, `url`, `tel`, `date`, `search`, `hidden` |
| `label` | `string` | Label text |
| `placeholder` | `string` | Placeholder |
| `required` | `boolean` | Validation |
| `defaultValue` | `string` | Initial value |
| `onChange` | `ActionJSON` | Action on change |

### Textarea

Same as Input plus `rows: number`.

### Button

```json
{ "type": "Button", "label": "Save", "variant": "default", "size": "default", "onClick": { "action": "showToast", "title": "Saved!" } }
```

| Prop | Values |
|------|--------|
| `variant` | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` |
| `size` | `default`, `sm`, `lg`, `icon` |

### Select

```json
{ "type": "Select", "name": "role", "children": [
  { "type": "SelectOption", "label": "Admin", "value": "admin" },
  { "type": "SelectOption", "label": "User", "value": "user" }
]}
```

Or use the `options` shorthand:
```json
{ "type": "Select", "name": "role", "placeholder": "Choose role",
  "options": [{ "label": "Admin", "value": "admin" }, { "label": "User", "value": "user" }] }
```

### Checkbox / Switch / Slider

```json
{ "type": "Checkbox", "name": "agree", "label": "I agree to terms" }
{ "type": "Switch", "name": "notifications", "label": "Enable notifications" }
{ "type": "Slider", "name": "volume", "min": 0, "max": 100, "step": 1 }
```

### RadioGroup / Radio

```json
{ "type": "RadioGroup", "name": "color", "children": [
  { "type": "Radio", "value": "red", "label": "Red" },
  { "type": "Radio", "value": "blue", "label": "Blue" }
]}
```

### Combobox

```json
{ "type": "Combobox", "name": "country", "placeholder": "Search...", "searchable": true, "children": [
  { "type": "ComboboxOption", "value": "us", "label": "United States" },
  { "type": "ComboboxOption", "value": "de", "label": "Germany" }
]}
```

### Calendar / DatePicker

```json
{ "type": "Calendar", "name": "date", "minDate": "2024-01-01", "maxDate": "2024-12-31" }
{ "type": "DatePicker", "name": "dob", "label": "Date of Birth", "placeholder": "Pick a date" }
```

### Form (wrapper)

```json
{ "type": "Form", "onSubmit": { "action": "toolCall", "tool": "create_user" }, "children": [...] }
```

## Interactive

### Tabs / Tab

```json
{ "type": "Tabs", "name": "settings_tab", "children": [
  { "type": "Tab", "title": "General", "children": [...] },
  { "type": "Tab", "title": "Security", "children": [...] }
]}
```

### Accordion / AccordionItem

```json
{ "type": "Accordion", "children": [
  { "type": "AccordionItem", "title": "FAQ 1", "children": [{ "type": "Text", "content": "Answer" }] }
]}
```

### Dialog

```json
{ "type": "Dialog", "title": "Confirm Delete", "trigger": "delete-btn", "children": [
  { "type": "Text", "content": "Are you sure?" },
  { "type": "Button", "label": "Delete", "variant": "destructive", "onClick": { "action": "toolCall", "tool": "delete_item" } }
]}
```

## Charts

All charts share these props:

| Prop | Type | Description |
|------|------|-------------|
| `data` | `object[]` | Data array |
| `series` | `SeriesDef[]` | Series definitions |
| `xAxis` | `string` | Data key for X axis |
| `height` | `number` | Chart height (px) |
| `showTooltip` | `boolean` | Default: `true` |
| `showGrid` | `boolean` | Show gridlines |
| `showLegend` | `boolean` | Show legend |
| `showYAxis` | `boolean` | Default: `true` |
| `yAxisFormat` | `string` | Y axis format pipe |
| `xAxisFormat` | `string` | X axis format pipe |
| `animate` | `boolean` | Animate on load |
| `barRadius` | `number` | Bar corner radius (BarChart) |

### SeriesDef

| Field | Type | Description |
|-------|------|-------------|
| `dataKey` | `string` | **Required.** Data field for values |
| `label` | `string` | Display label |
| `color` | `string` | Series color |
| `yAxisId` | `'left' \| 'right'` | Y axis binding |
| `tooltipFormat` | `string` | Pipe for tooltip value |

### Sparkline

```json
{ "type": "Sparkline", "data": [10, 20, 15, 30, 25], "color": "#22c55e", "height": 32 }
```

## Alert

```json
{ "type": "Alert", "variant": "warning", "children": [
  { "type": "AlertTitle", "content": "Warning" },
  { "type": "AlertDescription", "content": "This action cannot be undone." }
]}
```

Variants: `default`, `info`, `success`, `warning`, `destructive`

## Media

```json
{ "type": "Image", "src": "/photo.jpg", "alt": "Profile", "width": 200, "height": 200 }
{ "type": "Mermaid", "content": "graph TD; A-->B; B-->C;" }
{ "type": "DropZone", "accept": "image/*", "multiple": true }
```

## Control Flow

### ForEach

```json
{ "type": "ForEach", "each": "{{ state.items }}", "as": "item", "children": [
  { "type": "Row", "children": [
    { "type": "Text", "content": "{{ item.name }}" },
    { "type": "Badge", "label": "{{ item.status }}" }
  ]}
]}
```

### If / Elif / Else

```json
{ "type": "If", "condition": "{{ state.loading }}", "children": [{ "type": "Loader" }] }
{ "type": "Elif", "condition": "{{ state.error }}", "children": [{ "type": "Alert", "variant": "destructive", "children": [...] }] }
{ "type": "Else", "children": [{ "type": "Text", "content": "Data loaded!" }] }
```

### Define / Use / Slot

```json
"defs": {
  "userCard": {
    "type": "Card", "children": [
      { "type": "CardContent", "children": [
        { "type": "Text", "content": "{{ name }}" },
        { "type": "Badge", "label": "{{ role }}" }
      ]}
    ]
  }
}
```

```json
{ "type": "Use", "def": "userCard", "props": { "name": "Alice", "role": "Admin" } }
```
