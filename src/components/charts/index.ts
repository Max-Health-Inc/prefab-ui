/**
 * Chart components — BarChart, LineChart, AreaChart, PieChart, Sparkline, etc.
 */

import { Component } from '../../core/component.js'
import type { ComponentProps } from '../../core/component.js'

// ── ChartSeries ──────────────────────────────────────────────────────────────

export interface ChartSeries {
  dataKey: string
  label?: string
  color?: string
  /** Which Y-axis this series binds to: 'left' (default) or 'right'. */
  yAxisId?: 'left' | 'right'
  /** Pipe expression for this series' value in the tooltip (e.g. "currency:'EUR'"). Overrides yAxisFormat. */
  tooltipFormat?: string
}

// ── Common chart props ───────────────────────────────────────────────────────

export interface BaseChartProps extends ComponentProps {
  data: unknown[]
  series: ChartSeries[]
  xAxis?: string
  /** Data key used for the tooltip category label instead of xAxis. */
  tooltipXKey?: string
  /** Pipe expression applied to x-axis tick labels (e.g. "date", "truncate:10"). */
  xAxisFormat?: string
  /** Pipe expression applied to the category label in tooltips (e.g. "datetime"). Defaults to raw value. */
  tooltipXFormat?: string
  height?: number
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showYAxis?: boolean
  yAxisFormat?: string
  /** Show a secondary Y-axis on the right for series with yAxisId:'right'. */
  showYAxisRight?: boolean
  yAxisRightFormat?: string
  animate?: boolean
}

function chartGetProps(props: BaseChartProps, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    data: props.data,
    series: props.series,
    ...(props.xAxis && { xAxis: props.xAxis }),
    ...(props.tooltipXKey && { tooltipXKey: props.tooltipXKey }),
    ...(props.xAxisFormat && { xAxisFormat: props.xAxisFormat }),
    ...(props.tooltipXFormat && { tooltipXFormat: props.tooltipXFormat }),
    ...(props.height !== undefined && { height: props.height }),
    ...(props.showLegend !== undefined && { showLegend: props.showLegend }),
    ...(props.showTooltip !== undefined && { showTooltip: props.showTooltip }),
    ...(props.showGrid !== undefined && { showGrid: props.showGrid }),
    ...(props.showYAxis !== undefined && { showYAxis: props.showYAxis }),
    ...(props.yAxisFormat && { yAxisFormat: props.yAxisFormat }),
    ...(props.showYAxisRight !== undefined && { showYAxisRight: props.showYAxisRight }),
    ...(props.yAxisRightFormat && { yAxisRightFormat: props.yAxisRightFormat }),
    ...(props.animate !== undefined && { animate: props.animate }),
    ...extra,
  }
}

// ── BarChart ─────────────────────────────────────────────────────────────────

export interface BarChartProps extends BaseChartProps {
  stacked?: boolean
  horizontal?: boolean
  barRadius?: number
}

export function BarChart(props: BarChartProps): Component {
  const c = new Component('BarChart', props)
  c.getProps = () => chartGetProps(props, {
    ...(props.stacked && { stacked: true }),
    ...(props.horizontal && { horizontal: true }),
    ...(props.barRadius !== undefined && { barRadius: props.barRadius }),
  })
  return c
}

// ── LineChart ────────────────────────────────────────────────────────────────

export function LineChart(props: BaseChartProps): Component {
  const c = new Component('LineChart', props)
  c.getProps = () => chartGetProps(props)
  return c
}

// ── AreaChart ────────────────────────────────────────────────────────────────

export function AreaChart(props: BaseChartProps): Component {
  const c = new Component('AreaChart', props)
  c.getProps = () => chartGetProps(props)
  return c
}

// ── PieChart ─────────────────────────────────────────────────────────────────

export function PieChart(props: BaseChartProps): Component {
  const c = new Component('PieChart', props)
  c.getProps = () => chartGetProps(props)
  return c
}

// ── RadarChart ───────────────────────────────────────────────────────────────

export function RadarChart(props: BaseChartProps): Component {
  const c = new Component('RadarChart', props)
  c.getProps = () => chartGetProps(props)
  return c
}

// ── ScatterChart ─────────────────────────────────────────────────────────────

export function ScatterChart(props: BaseChartProps): Component {
  const c = new Component('ScatterChart', props)
  c.getProps = () => chartGetProps(props)
  return c
}

// ── Sparkline ────────────────────────────────────────────────────────────────

export interface SparklineProps extends ComponentProps {
  data: number[]
  variant?: string
  fill?: boolean
  curve?: 'linear' | 'smooth' | 'step'
  mode?: 'line' | 'bar'
}

export function Sparkline(props: SparklineProps): Component {
  const c = new Component('Sparkline', props)
  c.getProps = () => ({
    data: props.data,
    ...(props.variant && { variant: props.variant }),
    ...(props.fill !== undefined && { fill: props.fill }),
    ...(props.curve && { curve: props.curve }),
    ...(props.mode && { mode: props.mode }),
  })
  return c
}

// ── RadialChart ──────────────────────────────────────────────────────────────

export interface RadialChartProps extends BaseChartProps {
  innerRadius?: number
  startAngle?: number
  endAngle?: number
}

export function RadialChart(props: RadialChartProps): Component {
  const c = new Component('RadialChart', props)
  c.getProps = () => chartGetProps(props, {
    ...(props.innerRadius !== undefined && { innerRadius: props.innerRadius }),
    ...(props.startAngle !== undefined && { startAngle: props.startAngle }),
    ...(props.endAngle !== undefined && { endAngle: props.endAngle }),
  })
  return c
}

// ── Histogram ────────────────────────────────────────────────────────────────

export interface HistogramProps extends ComponentProps {
  data: number[]
  bins?: number
  color?: string
  height?: number
  showXAxis?: boolean
  showYAxis?: boolean
}

export function Histogram(props: HistogramProps): Component {
  const c = new Component('Histogram', props)
  c.getProps = () => ({
    data: props.data,
    ...(props.bins !== undefined && { bins: props.bins }),
    ...(props.color && { color: props.color }),
    ...(props.height !== undefined && { height: props.height }),
    ...(props.showXAxis !== undefined && { showXAxis: props.showXAxis }),
    ...(props.showYAxis !== undefined && { showYAxis: props.showYAxis }),
  })
  return c
}
