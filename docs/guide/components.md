# Components Reference

All components are functions that return a `Component` instance. They serialize to JSON via `.toJSON()` and compose as children of container components.

---

## Layout

Structural containers that control spacing, direction, and grid placement.

### `Column(props?, children?)`

Vertical flex container. The most common layout primitive.

```ts
Column({ gap: 6 }, [H1('Title'), Text('Body')])
Column([Text('No gap')])                          // shorthand
```

| Prop | Type | Description |
|------|------|-------------|
| `gap` | `number` | Spacing between children (in spacing units) |
| `align` | `string` | Cross-axis alignment (`start`, `center`, `end`, `stretch`) |
| `justify` | `string` | Main-axis alignment |
| `cssClass` | `string` | Extra CSS class |

### `Row(props?, children?)`

Horizontal flex container.

```ts
Row({ gap: 4 }, [Button('Cancel'), Button('Save')])
```

Same props as `Column`.

### `Grid(props?, children?)`

CSS Grid container.

```ts
Grid({ columns: 3, gap: 4 }, [
  GridItem({ span: 2 }, [Card(...)]),
  GridItem([Card(...)]),
])
```

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `number` | Number of columns |
| `gap` | `number` | Grid gap |

### `GridItem(props?, children?)`

Child of `Grid`.

| Prop | Type | Description |
|------|------|-------------|
| `span` | `number` | Column span |

### `Container(props?, children?)`

Generic wrapper with max-width and padding.

### `Div(props?, children?)` / `Span(props?, children?)`

Generic block/inline wrappers.

### `Dashboard(props?, children?)` / `DashboardItem(props?, children?)`

Dashboard grid layout with named items.

### `Pages(props?, children?)` / `Page(props?, children?)`

Paginated view container.

---

## Typography

Text rendering components.

### `Heading(content, props?)`

```ts
Heading('Welcome', { level: 2 })
```

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string \| Rx` | Text content (supports reactive expressions) |
| `level` | `1-4` | Heading level |

### `H1(content)` / `H2(content)` / `H3(content)` / `H4(content)`

Shorthand heading constructors.

```ts
H1('Dashboard')  // same as Heading('Dashboard', { level: 1 })
```

### `Text(content, props?)`

```ts
Text('Hello world')
Text(rx`Welcome, ${STATE}.userName!`)
```

### `P(content)` / `Lead(content)` / `Large(content)` / `Small(content)` / `Muted(content)`

Semantic text variants.

### `BlockQuote(content)`

Block quotation.

### `Label(content, props?)`

Form label text.

### `Link(content, props?)`

```ts
Link('Visit site', { href: 'https://example.com', target: '_blank' })
```

| Prop | Type | Description |
|------|------|-------------|
| `href` | `string` | URL |
| `target` | `string` | Link target (`_blank`, `_self`, etc.) |

### `Code(content)` / `Kbd(content)`

Inline code / keyboard shortcut styling.

### `Markdown(content)`

Rendered Markdown content.

```ts
Markdown('## Hello\n\nThis is **bold** text.')
```

---

## Card

Card containers for grouped content.

### `Card(props?, children?)`

```ts
Card([
  CardHeader([CardTitle('User'), CardDescription('Profile info')]),
  CardContent([Text('Name: Alice')]),
  CardFooter([Button('Edit')]),
])
```

### `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`

Card sub-components. All accept children.

---

## Data Display

### `DataTable(data, columns, props?)`

Rich data table with auto-column detection.

```ts
DataTable(users, [
  col('name', 'Name'),
  col('email', 'Email'),
  col('status', 'Status', (v) => Badge(v)),
], { searchable: true, sortable: true })
```

| Prop | Type | Description |
|------|------|-------------|
| `data` | `unknown[]` | Array of row objects |
| `columns` | `DataTableColumnDef[]` | Column definitions (use `col()` helper) |
| `searchable` | `boolean` | Enable search |
| `sortable` | `boolean` | Enable column sort |

### `col(key, label?, render?)`

Column definition helper.

```ts
col('name', 'Full Name')
col('status', 'Status', (v) => Badge(v, { variant: statusVariant(v) }))
```

### `Badge(content, props?)`

```ts
Badge('Active', { variant: 'success' })
```

| Variant | Color |
|---------|-------|
| `default` | Neutral |
| `secondary` | Muted |
| `outline` | Border only |
| `success` | Green |
| `warning` | Yellow |
| `destructive` | Red |
| `info` | Blue |

### `Metric(props)`

```ts
Metric({ label: 'Revenue', value: '$125K', change: 12.5 })
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Metric name |
| `value` | `string \| number` | Display value |
| `change` | `number` | Percentage change (positive = green, negative = red) |
| `prefix` | `string` | Value prefix (e.g. `$`) |
| `suffix` | `string` | Value suffix (e.g. `%`) |

### Other Data Components

| Component | Description |
|-----------|-------------|
| `Dot(props)` | Colored status dot |
| `Ring(props)` | Circular progress ring |
| `Progress(props)` | Linear progress bar |
| `Separator()` | Horizontal divider |
| `Loader()` | Loading spinner |
| `Icon(name, props?)` | Named icon |

---

## Table

Low-level HTML table primitives (for custom table layouts beyond `DataTable`).

```ts
Table({ striped: true }, [
  TableHead([
    TableRow([TableHeader('Name'), TableHeader('Age')]),
  ]),
  TableBody([
    TableRow([TableCell({ children: [Text('Alice')] }), TableCell({ children: [Text('30')] })]),
  ]),
  TableCaption('User list'),
])
```

### Components

`Table`, `TableHead`, `TableBody`, `TableFooter`, `TableRow`, `TableHeader`, `TableCell`, `TableCaption`, `ExpandableRow`

`TableCell` supports `colSpan` and `rowSpan` props.

---

## Form

### `Form(props?, children?)`

```ts
Form({ onSubmit: CallTool('create_user') }, [
  Input({ name: 'email', type: 'email', required: true }),
  Button('Create', { type: 'submit' }),
])
```

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `Action` | Action to run when the form is submitted |

### `Input(props)`

```ts
Input({ name: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true })
```

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | State key (also used as form field name) |
| `type` | `string` | `text`, `email`, `number`, `password`, `url`, `tel`, `date`, `search`, `hidden` |
| `label` | `string` | Label text |
| `placeholder` | `string` | Placeholder text |
| `required` | `boolean` | Validation |
| `defaultValue` | `string` | Initial value |
| `onChange` | `Action` | Action on value change |

### `Textarea(props)`

Multi-line text input. Same props as `Input` plus `rows`.

### `Button(content, props?)`

```ts
Button('Save', { variant: 'default', onClick: ShowToast('Saved!') })
```

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `ButtonVariant` | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` |
| `size` | `ButtonSize` | `default`, `sm`, `lg`, `icon` |
| `onClick` | `Action` | Click action |
| `type` | `string` | `button` (default), `submit` |
| `disabled` | `boolean` | Disabled state |

### `ButtonGroup(children)`

Horizontal button row.

### `Select(props?, children?)`

```ts
Select({ name: 'role', label: 'Role' }, [
  SelectOption({ value: 'admin', label: 'Admin' }),
  SelectOption({ value: 'user', label: 'User' }),
])
```

Sub-components: `SelectOption`, `SelectGroup`, `SelectLabel`, `SelectSeparator`

### `Checkbox(props)` / `Switch(props)` / `Slider(props)`

Boolean and range inputs.

```ts
Checkbox({ name: 'agree', label: 'I agree to the terms' })
Switch({ name: 'notifications', label: 'Enable notifications' })
Slider({ name: 'volume', min: 0, max: 100, step: 1 })
```

### `Radio(props)` / `RadioGroup(props?, children?)`

```ts
RadioGroup({ name: 'color', label: 'Favorite Color' }, [
  Radio({ value: 'red', label: 'Red' }),
  Radio({ value: 'blue', label: 'Blue' }),
  Radio({ value: 'green', label: 'Green' }),
])
```

### `Combobox(props?, children?)` / `ComboboxOption(props)`

Autocomplete select with search.

```ts
Combobox({ name: 'country', placeholder: 'Search countries...', searchable: true }, [
  ComboboxOption({ value: 'us', label: 'United States' }),
  ComboboxOption({ value: 'de', label: 'Germany' }),
])
```

Sub-components: `ComboboxGroup`, `ComboboxLabel`, `ComboboxSeparator`

### `Calendar(props)` / `DatePicker(props)`

Date selection.

```ts
Calendar({ name: 'date', minDate: '2024-01-01', maxDate: '2024-12-31' })
DatePicker({ name: 'dob', label: 'Date of Birth', placeholder: 'Pick a date' })
```

### `Field(props?, children?)`

Structured form field wrapper.

```ts
Field([
  FieldTitle('Email'),
  FieldDescription('Your work email address'),
  FieldContent([Input({ name: 'email', type: 'email' })]),
  FieldError('Invalid email format'),
])
```

Sub-components: `FieldTitle`, `FieldDescription`, `FieldContent`, `FieldError`

### `ChoiceCard(props)`

Selectable card for option picking.

```ts
ChoiceCard({ value: 'pro', label: 'Pro Plan', description: '$29/mo', selected: true })
```

---

## Interactive

### `Tabs(props?, children?)`

Tabbed interface with keyboard navigation (Arrow keys, Home/End).

```ts
Tabs({ defaultTab: 'overview' }, [
  Tab({ id: 'overview', label: 'Overview' }, [Text('Overview content')]),
  Tab({ id: 'details', label: 'Details' }, [Text('Details content')]),
])
```

### `Accordion(props?, children?)`

Collapsible sections.

```ts
Accordion([
  AccordionItem({ title: 'FAQ 1' }, [Text('Answer 1')]),
  AccordionItem({ title: 'FAQ 2' }, [Text('Answer 2')]),
])
```

### `Dialog(props?, children?)`

Modal dialog (ARIA `role="dialog"`).

```ts
Dialog({ title: 'Confirm', trigger: 'delete-btn' }, [
  Text('Are you sure?'),
  Button('Delete', { variant: 'destructive', onClick: CallTool('delete_item') }),
])
```

### `Popover(props?, children?)` / `Tooltip(props?, children?)` / `HoverCard(props?, children?)`

Overlay components.

### `Carousel(props?, children?)`

Image/content carousel with prev/next buttons.

---

## Charts

All charts accept a `data` prop (array of objects) and a `series` array.

### `BarChart(props)` / `LineChart(props)` / `AreaChart(props)` / `PieChart(props)`

```ts
BarChart({
  data: [{ month: 'Jan', revenue: 100 }, { month: 'Feb', revenue: 150 }],
  series: [{ key: 'revenue', label: 'Revenue', color: '#3b82f6' }],
  xAxis: 'month',
  height: 300,
})
```

| Prop | Type | Description |
|------|------|-------------|
| `data` | `object[]` | Data array |
| `series` | `ChartSeries[]` | `{ key, label?, color? }` |
| `xAxis` | `string` | Key for X axis labels |
| `height` | `number` | Chart height in px |

### `RadarChart(props)` / `ScatterChart(props)`

Same base props. The renderer provides SVG rendering for Bar, Line, Area, and Pie; other types use a placeholder or external library.

### `Sparkline(props)`

Inline mini chart.

```ts
Sparkline({ data: [10, 20, 15, 30, 25], color: '#22c55e', height: 32 })
```

### `RadialChart(props)` / `Histogram(props)`

Radial progress chart and histogram distribution chart.

---

## Media

### `Image(props)`

```ts
Image({ src: '/photo.jpg', alt: 'Profile photo', width: 200, height: 200 })
```

### `Audio(props)` / `Video(props)` / `Embed(props)`

Media embeds.

### `Svg(props)`

Inline SVG content.

### `DropZone(props)`

File upload drop area.

```ts
DropZone({ accept: 'image/*', multiple: true, onDrop: CallTool('upload_file') })
```

### `Mermaid(content)`

Mermaid diagram (rendered by the browser if `mermaid` library is available).

```ts
Mermaid('graph TD; A-->B; B-->C;')
```

---

## Alert

### `Alert(props?, children?)`

```ts
Alert({ variant: 'warning' }, [
  AlertTitle('Warning'),
  AlertDescription('This action cannot be undone.'),
])
```

| Variant | Color |
|---------|-------|
| `default` | Neutral |
| `info` | Blue |
| `success` | Green |
| `warning` | Yellow |
| `destructive` | Red |

---

## Control Flow

### `ForEach(props?, children?)`

Iterate over a reactive array.

```ts
ForEach({ each: rx('state.items'), as: 'item' }, [
  Text(rx`${ITEM}.name`),
])
```

| Prop | Type | Description |
|------|------|-------------|
| `each` | `Rx \| string` | Expression for the array to iterate |
| `as` | `string` | Variable name for each item (default: `item`) |

### `If(props?, children?)` / `Elif(props?, children?)` / `Else(children?)`

Conditional rendering.

```ts
If({ condition: rx('state.loading') }, [Loader()])
Elif({ condition: rx('state.error') }, [Alert({ variant: 'destructive' }, [Text(rx`${STATE}.error`)])])
Else([Text('Content loaded!')])
```

### `Define(props?, children?)` / `Use(props)` / `Slot(props?)`

Component templates for reuse.

```ts
Define({ name: 'userCard' }, [
  Card([CardContent([
    Text(Slot('name')),
    Badge(Slot('role')),
  ])]),
])

// Later:
Use({ def: 'userCard', props: { name: 'Alice', role: 'Admin' } })
```
