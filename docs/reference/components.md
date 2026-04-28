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
| `gap` | `number \| GapToken` | Spacing between children. Accepts a number or semantic token: `'none'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'` |
| `align` | `string` | Cross-axis alignment (`start`, `center`, `end`, `stretch`) |
| `justify` | `string` | Main-axis alignment |
| `cssClass` | `string` | Extra CSS class |

**Gap tokens** map to numbers: `none`=0, `xs`=1, `sm`=2, `md`=3, `lg`=4, `xl`=6, `2xl`=8.

```ts
Column({ gap: 'md' }, [Text('Hello')])  // same as gap: 3
Row({ gap: 'xl' }, [Button('A'), Button('B')])
```

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
| `gap` | `number \| GapToken` | Grid gap (number or semantic token) |

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

### `Detail(props, children?)`

Conditional detail pane. Shows `children` when `of` resolves, shows `empty` otherwise.

| Prop | Type | Description |
|------|------|-------------|
| `of` | `Ref \| RxStr` | Reactive reference expression |
| `empty` | `Component` | Shown when ref is null/undefined |

### `MasterDetail(props?, children?)`

Two-pane layout (master list + detail). Expects two children.

| Prop | Type | Description |
|------|------|-------------|
| `masterWidth` | `string` | Master pane width (default: `'33%'`) |
| `gap` | `number` | Gap between panes |

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

// With variant:
Card({ variant: 'elevated' }, [CardContent([Text('Raised card')])])
```

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `CardVariant` | `'default'` \| `'outline'` \| `'ghost'` \| `'elevated'` \| `'destructive'` |

### `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`

Card sub-components. All accept children.

---

## Data Display

### `DataTable(props)`

Rich data table with search, column definitions, and optional row selection.

| Prop | Type | Description |
|------|------|-------------|
| `rows` | `unknown[] \| RxStr` | Array of row objects (or reactive expression) |
| `columns` | `DataTableColumnDef[]` | Column definitions (use `col()`) |
| `search` | `boolean` | Enable search |
| `from` | `Collection` | Derive rows from a Collection (mutually exclusive with `rows`) |
| `selected` | `Signal` | Signal tracking selected row key (requires `from`) |

### `col(key, header?, opts?)`

Column definition helper — short form or descriptor form.

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Row object field name |
| `header` | `string` | Column header (defaults to `key`) |
| `sortable` | `boolean` | Enable column sorting |
| `format` | `string` | Pipe name for cell display (e.g. `'currency'`) |
| `accessor` | `string` | Pipe expression for complex access |

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
| `series` | `ChartSeries[]` | Series definitions (see below) |
| `xAxis` | `string` | Data key for X axis labels |
| `xAxisFormat` | `string` | Pipe applied to X axis tick labels (e.g. `'date'`, `'truncate:10'`) |
| `tooltipXKey` | `string` | Data key for tooltip category label (defaults to `xAxis`) |
| `tooltipXFormat` | `string` | Pipe applied to tooltip category label (e.g. `'datetime'`, `'upper'`) |
| `height` | `number` | Chart height in px |
| `showTooltip` | `boolean` | Show tooltip on hover (default `true`) |
| `showGrid` | `boolean` | Show horizontal grid lines |
| `showYAxis` | `boolean` | Show Y axis labels (default `true`) |
| `yAxisFormat` | `string` | Y axis label format: `'currency'`, `'percent'`, or auto-compact |
| `showYAxisRight` | `boolean` | Show secondary Y axis on the right |
| `yAxisRightFormat` | `string` | Format for the right Y axis |
| `showLegend` | `boolean` | Show legend below chart |

#### `ChartSeries`

| Field | Type | Description |
|-------|------|-------------|
| `dataKey` | `string` | **Required.** Key in data objects for this series |
| `label` | `string` | Display label (defaults to `dataKey`) |
| `color` | `string` | Series color (auto-assigned if omitted) |
| `yAxisId` | `'left' \| 'right'` | Which Y axis this series binds to |
| `tooltipFormat` | `string` | Pipe for this series' value in the tooltip (overrides `yAxisFormat`) |

#### Formatting Example

Same timestamp field, different presentation on axis vs tooltip:

```ts
LineChart({
  data: timeseries,
  xAxis: 'timestamp',
  xAxisFormat: 'date',          // axis: "4/25/2026"
  tooltipXFormat: 'datetime',   // tooltip: "4/25/2026, 2:30:00 PM"
  series: [
    { dataKey: 'revenue', label: 'Revenue', tooltipFormat: 'currency' },
    { dataKey: 'growth', label: 'Growth', tooltipFormat: 'percent' },
  ],
})
```

All built-in pipes work: `upper`, `lower`, `truncate`, `currency`, `percent`, `compact`, `date`, `time`, `datetime`, `number`, `round`, plus custom wire pipes.

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

### `Image(src, opts?)` / `Image(props)`

Positional form (consistent with Audio/Video/Embed) or props form:

```ts
Image('/photo.jpg', { alt: 'Profile photo' })   // positional (recommended)
Image({ src: '/photo.jpg', alt: 'Profile photo' })  // props form (also works)
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

Alert({ variant: 'success', icon: 'CheckCircle' }, [
  AlertTitle('Saved'),
  AlertDescription('Changes applied successfully.'),
])
```

| Variant | Color |
|---------|-------|
| `default` | Neutral |
| `success` | Green |
| `warning` | Yellow |
| `destructive` | Red |

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `AlertVariant` | `'default'` \| `'destructive'` \| `'success'` \| `'warning'` |
| `icon` | `string` | Icon name (e.g. `'CheckCircle'`, `'AlertTriangle'`) |

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

### `If(condition, children)` / `If(props)` / `Elif` / `Else`

Conditional rendering. Supports both shorthand and props form:

```ts
// Shorthand (recommended):
If('$loading', [Loader()])
Elif('$error', [Alert({ variant: 'destructive' }, [Text('$error')])])
Else([Text('Content loaded!')])

// Props form (also works):
If({ condition: '$loading', children: [Loader()] })
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
