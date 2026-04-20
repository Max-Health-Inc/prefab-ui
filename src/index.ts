/**
 * prefab-ui — TypeScript declarative UI component library for MCP apps.
 *
 * Wire-compatible with the Python prefab-ui library.
 * Serializes to JSON component trees using the $prefab wire format.
 */

// ── Core ─────────────────────────────────────────────────────────────────────
export { Component, ContainerComponent, StatefulComponent } from './core/index.js'
export type { ComponentJSON, ComponentProps, ContainerProps, StatefulProps, RxStr } from './core/index.js'

// ── App ──────────────────────────────────────────────────────────────────────
export { PrefabApp } from './app.js'
export type { PrefabAppOptions, PrefabWireFormat, Theme } from './app.js'

// ── Layout ───────────────────────────────────────────────────────────────────
export { Column, Row, Grid, GridItem, Container, Div, Span, Dashboard, DashboardItem, Pages, Page } from './components/layout/index.js'

// ── Typography ───────────────────────────────────────────────────────────────
export { Heading, H1, H2, H3, H4, Text, P, Lead, Large, Small, Muted, BlockQuote, Label, Link, Code, Markdown, Kbd } from './components/typography/index.js'

// ── Card ─────────────────────────────────────────────────────────────────────
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/card/index.js'

// ── Data Display ─────────────────────────────────────────────────────────────
export { DataTable, col, Badge, Dot, Metric, Ring, Progress, Separator, Loader, Icon } from './components/data/index.js'
export type { DataTableColumnDef, DataTableProps, BadgeVariant, MetricProps } from './components/data/index.js'

// ── Form ─────────────────────────────────────────────────────────────────────
export { Form, Input, Textarea, Button, ButtonGroup, Select, SelectOption, Checkbox, Switch, Slider } from './components/form/index.js'
export type { FormProps, InputProps, ButtonVariant, ButtonSize } from './components/form/index.js'

// ── Interactive ──────────────────────────────────────────────────────────────
export { Tabs, Tab, Accordion, AccordionItem, Dialog, Popover, Tooltip, HoverCard, Carousel } from './components/interactive/index.js'

// ── Control Flow ─────────────────────────────────────────────────────────────
export { ForEach, If, Elif, Else } from './components/control/index.js'

// ── Alert ────────────────────────────────────────────────────────────────────
export { Alert, AlertTitle, AlertDescription } from './components/alert/index.js'

// ── Media ────────────────────────────────────────────────────────────────────
export { Image, Audio, Video, Embed, Svg, DropZone, Mermaid } from './components/media/index.js'

// ── Auto-rendering ───────────────────────────────────────────────────────────
export { autoDetail, autoTable, statusVariant, registerStatusVariants } from './auto/index.js'
export { autoChart } from './auto/chart.js'
export { autoForm } from './auto/form.js'
export { autoComparison } from './auto/comparison.js'
export { autoMetrics } from './auto/metrics.js'
export { autoTimeline } from './auto/timeline.js'
export { autoProgress } from './auto/progress.js'
export type { AutoDetailOptions, AutoTableOptions } from './auto/index.js'
export type { AutoChartOptions, ChartType } from './auto/chart.js'
export type { AutoFormField, AutoFormOptions } from './auto/form.js'
export type { AutoComparisonOptions } from './auto/comparison.js'
export type { AutoMetricDef, AutoMetricsOptions } from './auto/metrics.js'
export type { AutoTimelineEvent, AutoTimelineOptions } from './auto/timeline.js'
export type { AutoProgressStep, AutoProgressOptions } from './auto/progress.js'

// ── MCP Display Helpers ──────────────────────────────────────────────────────
export { display, display_form, display_update, display_error } from './mcp/display.js'
export type { DisplayOptions, DisplayFormOptions, DisplayErrorOptions, StateUpdate, PrefabUpdateWire } from './mcp/display.js'
export type { McpToolResult, McpContent, McpTextContent } from './mcp/types.js'

// ── Re-export actions and rx for convenience ─────────────────────────────────
export { rx, Rx, ITEM, INDEX, EVENT, ERROR, RESULT, STATE } from './rx/index.js'
export { SetState, ToggleState, AppendState, PopState, ShowToast, CloseOverlay, OpenLink, SetInterval } from './actions/client.js'
export { CallTool, SendMessage, UpdateContext } from './actions/mcp.js'
export type { Action, ActionJSON } from './actions/types.js'
