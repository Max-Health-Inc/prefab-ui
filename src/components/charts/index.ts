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
}

// ── Common chart props ───────────────────────────────────────────────────────

export interface BaseChartProps extends ComponentProps {
  data: unknown[]
  series: ChartSeries[]
  xAxis?: string
  height?: number
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  showYAxis?: boolean
  yAxisFormat?: string
  animate?: boolean
}

function chartGetProps(props: BaseChartProps, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    data: props.data,
    series: props.series,
    ...(props.xAxis && { xAxis: props.xAxis }),
    ...(props.height !== undefined && { height: props.height }),
    ...(props.showLegend !== undefined && { showLegend: props.showLegend }),
    ...(props.showTooltip !== undefined && { showTooltip: props.showTooltip }),
    ...(props.showGrid !== undefined && { showGrid: props.showGrid }),
    ...(props.showYAxis !== undefined && { showYAxis: props.showYAxis }),
    ...(props.yAxisFormat && { yAxisFormat: props.yAxisFormat }),
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
  c['getProps'] = () => chartGetProps(props, {
    ...(props.stacked && { stacked: true }),
    ...(props.horizontal && { horizontal: true }),
    ...(props.barRadius !== undefined && { barRadius: props.barRadius }),
  })
  return c
}

// ── LineChart ────────────────────────────────────────────────────────────────

export function LineChart(props: BaseChartProps): Component {
  const c = new Component('LineChart', props)
  c['getProps'] = () => chartGetProps(props)
  return c
}

// ── AreaChart ────────────────────────────────────────────────────────────────

export function AreaChart(props: BaseChartProps): Component {
  const c = new Component('AreaChart', props)
  c['getProps'] = () => chartGetProps(props)
  return c
}

// ── PieChart ─────────────────────────────────────────────────────────────────

export function PieChart(props: BaseChartProps): Component {
  const c = new Component('PieChart', props)
  c['getProps'] = () => chartGetProps(props)
  return c
}

// ── RadarChart ───────────────────────────────────────────────────────────────

export function RadarChart(props: BaseChartProps): Component {
  const c = new Component('RadarChart', props)
  c['getProps'] = () => chartGetProps(props)
  return c
}

// ── ScatterChart ─────────────────────────────────────────────────────────────

export function ScatterChart(props: BaseChartProps): Component {
  const c = new Component('ScatterChart', props)
  c['getProps'] = () => chartGetProps(props)
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
  c['getProps'] = () => ({
    data: props.data,
    ...(props.variant && { variant: props.variant }),
    ...(props.fill !== undefined && { fill: props.fill }),
    ...(props.curve && { curve: props.curve }),
    ...(props.mode && { mode: props.mode }),
  })
  return c
}
