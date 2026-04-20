/**
 * Tests for autoChart, autoForm, autoComparison, autoMetrics, autoTimeline, autoProgress.
 */

import { describe, it, expect } from 'bun:test'
import { autoChart } from '../src/auto/chart'
import { autoForm } from '../src/auto/form'
import { autoComparison } from '../src/auto/comparison'
import { autoMetrics } from '../src/auto/metrics'
import { autoTimeline } from '../src/auto/timeline'
import { autoProgress } from '../src/auto/progress'

describe('autoChart', () => {
  const data = [
    { month: 'Jan', revenue: 42000, cost: 31000 },
    { month: 'Feb', revenue: 48000, cost: 33000 },
  ]
  const series = [
    { dataKey: 'revenue', label: 'Revenue' },
    { dataKey: 'cost', label: 'Cost' },
  ]

  it('renders a bar chart by default', () => {
    const json = autoChart(data, series, { title: 'Revenue', xAxis: 'month' }).toJSON()
    expect(json.type).toBe('Column')
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading!.content).toBe('Revenue')
    const card = json.children!.find(c => c.type === 'Card')!
    const content = card.children![0]
    const chart = content.children![0]
    expect(chart.type).toBe('BarChart')
    expect(chart.showLegend).toBe(true)
  })

  it('supports line chart type', () => {
    const json = autoChart(data, series, { chartType: 'line' }).toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const chart = card.children![0].children![0]
    expect(chart.type).toBe('LineChart')
  })

  it('supports area and pie', () => {
    expect(autoChart(data, series, { chartType: 'area' }).toJSON()
      .children!.find(c => c.type === 'Card')!.children![0].children![0].type).toBe('AreaChart')
    expect(autoChart(data, series, { chartType: 'pie' }).toJSON()
      .children!.find(c => c.type === 'Card')!.children![0].children![0].type).toBe('PieChart')
  })

  it('includes subtitle', () => {
    const json = autoChart(data, series, { title: 'Revenue', subtitle: 'Monthly overview' }).toJSON()
    const muted = json.children!.find(c => c.type === 'Muted')
    expect(muted!.content).toBe('Monthly overview')
  })
})

describe('autoForm', () => {
  const fields = [
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'name', label: 'Full Name', required: true },
    { name: 'notes', label: 'Notes' },
  ]

  it('renders a form with inputs', () => {
    const json = autoForm(fields, 'create_user', { title: 'Create User' }).toJSON()
    expect(json.type).toBe('Column')
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading!.content).toBe('Create User')

    const card = json.children!.find(c => c.type === 'Card')!
    const form = card.children![0].children![0]
    expect(form.type).toBe('Form')
    expect((form.onSubmit as { action: string }).action).toBe('toolCall')
  })

  it('has correct number of inputs + button', () => {
    const json = autoForm(fields, 'create_user').toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const form = card.children![0].children![0]
    const column = form.children![0]
    // 3 inputs + 1 button = 4 children
    expect(column.children).toHaveLength(4)
    expect(column.children![0].type).toBe('Input')
    expect(column.children![3].type).toBe('Button')
  })

  it('marks required fields', () => {
    const json = autoForm(fields, 'test').toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const form = card.children![0].children![0]
    const inputs = form.children![0].children!.filter(c => c.type === 'Input')
    expect(inputs[0].required).toBe(true)  // email
    expect(inputs[1].required).toBe(true)  // name
    expect(inputs[2].required).toBe(false)  // notes
  })

  it('custom submit label', () => {
    const json = autoForm(fields, 'test', { submitLabel: 'Create' }).toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const form = card.children![0].children![0]
    const button = form.children![0].children!.find(c => c.type === 'Button')
    expect(button!.label).toBe('Create')
  })
})

describe('autoComparison', () => {
  const items = [
    { name: 'Plan A', price: '$10/mo', storage: '5GB', support: 'Email' },
    { name: 'Plan B', price: '$20/mo', storage: '50GB', support: '24/7' },
    { name: 'Plan C', price: '$50/mo', storage: '500GB', support: 'Dedicated' },
  ]

  it('renders a grid of cards', () => {
    const json = autoComparison(items, { title: 'Plans' }).toJSON()
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading!.content).toBe('Plans')

    const grid = json.children!.find(c => c.type === 'Grid')!
    expect(grid.columns).toBe(3) // auto-detected from items.length
    expect(grid.children).toHaveLength(3)
  })

  it('uses first key as card heading', () => {
    const json = autoComparison(items).toJSON()
    const grid = json.children!.find(c => c.type === 'Grid')!
    const firstCard = grid.children![0]
    const header = firstCard.children![0] // CardHeader
    const heading = header.children![0]
    expect(heading.content).toBe('Plan A')
  })

  it('highlight key renders Badge', () => {
    const json = autoComparison(items, { highlightKey: 'price' }).toJSON()
    const grid = json.children!.find(c => c.type === 'Grid')!
    const firstCard = grid.children![0]
    const content = firstCard.children![1] // CardContent
    const priceRow = content.children![0] // first detail row (price)
    const badge = priceRow.children!.find(c => c.type === 'Badge')
    expect(badge).toBeDefined()
    expect(badge!.label).toBe('$10/mo')
  })

  it('handles empty items', () => {
    const json = autoComparison([]).toJSON()
    const muted = json.children!.find(c => c.type === 'Muted')
    expect(muted!.content).toBe('No items to compare.')
  })
})

describe('autoMetrics', () => {
  const metrics = [
    { label: 'Revenue', value: '$42K', delta: '+12%', trend: 'up' as const, trendSentiment: 'positive' as const, sparkline: [10, 25, 18, 30, 42] },
    { label: 'Users', value: '1,234' },
    { label: 'Errors', value: '3', delta: '-80%', trend: 'down' as const },
  ]

  it('renders a grid of metric cards', () => {
    const json = autoMetrics(metrics, { title: 'Dashboard', columns: 3 }).toJSON()
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading!.content).toBe('Dashboard')

    const grid = json.children!.find(c => c.type === 'Grid')!
    expect(grid.columns).toBe(3)
    expect(grid.children).toHaveLength(3)
  })

  it('metric card has correct values', () => {
    const json = autoMetrics(metrics).toJSON()
    const grid = json.children!.find(c => c.type === 'Grid')!
    const firstCard = grid.children![0]
    const content = firstCard.children![0] // CardContent
    const metric = content.children![0]
    expect(metric.type).toBe('Metric')
    expect(metric.label).toBe('Revenue')
    expect(metric.value).toBe('$42K')
    expect(metric.delta).toBe('+12%')
  })

  it('includes sparkline when provided', () => {
    const json = autoMetrics(metrics).toJSON()
    const grid = json.children!.find(c => c.type === 'Grid')!
    const firstCard = grid.children![0]
    const content = firstCard.children![0]
    const sparkline = content.children!.find(c => c.type === 'Sparkline')
    expect(sparkline).toBeDefined()
    expect(sparkline!.data).toEqual([10, 25, 18, 30, 42])
  })

  it('no sparkline when not provided', () => {
    const json = autoMetrics([{ label: 'Test', value: '0' }]).toJSON()
    const grid = json.children!.find(c => c.type === 'Grid')!
    const content = grid.children![0].children![0]
    expect(content.children!.find(c => c.type === 'Sparkline')).toBeUndefined()
  })
})

describe('autoTimeline', () => {
  const events = [
    { title: 'Order placed', timestamp: '2026-04-20 10:30', status: 'completed', badge: 'Done', badgeVariant: 'success' as const },
    { title: 'Processing', timestamp: '2026-04-20 11:00', status: 'active', description: 'Preparing shipment' },
    { title: 'Shipped', timestamp: '', status: 'pending' },
  ]

  it('renders timeline with events', () => {
    const json = autoTimeline(events, { title: 'Order Timeline' }).toJSON()
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading!.content).toBe('Order Timeline')

    const card = json.children!.find(c => c.type === 'Card')!
    const content = card.children![0]
    // 3 event rows + 2 separators = 5
    expect(content.children).toHaveLength(5)
  })

  it('event has dot and text', () => {
    const json = autoTimeline(events).toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const content = card.children![0]
    const firstRow = content.children![0]
    expect(firstRow.type).toBe('Row')
    const dot = firstRow.children!.find(c => c.type === 'Dot')
    expect(dot).toBeDefined()
    expect(dot!.color).toBe('green') // completed → green
  })

  it('badge is rendered when provided', () => {
    const json = autoTimeline(events).toJSON()
    const allJson = JSON.stringify(json)
    expect(allJson).toContain('"Done"')
  })

  it('description is rendered', () => {
    const json = autoTimeline(events).toJSON()
    const allJson = JSON.stringify(json)
    expect(allJson).toContain('Preparing shipment')
  })
})

describe('autoProgress', () => {
  const steps = [
    { label: 'Order Placed', status: 'completed' as const },
    { label: 'Processing', status: 'active' as const, description: 'Preparing' },
    { label: 'Shipped', status: 'pending' as const },
    { label: 'Delivered', status: 'pending' as const },
  ]

  it('renders progress tracker', () => {
    const json = autoProgress(steps, { title: 'Order Status' }).toJSON()
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading!.content).toBe('Order Status')

    const progress = json.children!.find(c => c.type === 'Progress')
    expect(progress).toBeDefined()
    // 1 completed + 0.5 active = 1.5 / 4 = 37.5% → 38%
    expect(progress!.value).toBe(38)
  })

  it('shows step count badge', () => {
    const json = autoProgress(steps).toJSON()
    const allJson = JSON.stringify(json)
    expect(allJson).toContain('1/4 steps')
    expect(allJson).toContain('38% complete')
  })

  it('step rows have dots and badges', () => {
    const json = autoProgress(steps).toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const content = card.children![0]
    // 4 step rows + 3 separators = 7
    expect(content.children).toHaveLength(7)

    const firstRow = content.children![0]
    const dot = firstRow.children!.find(c => c.type === 'Dot')
    expect(dot!.color).toBe('green') // completed
    const badge = firstRow.children!.find(c => c.type === 'Badge')
    expect(badge!.label).toBe('Done')
  })

  it('active step has blue dot', () => {
    const json = autoProgress(steps).toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const content = card.children![0]
    // step rows at index 0, 2, 4, 6 (separators at 1, 3, 5)
    const activeRow = content.children![2]
    const dot = activeRow.children!.find(c => c.type === 'Dot')
    expect(dot!.color).toBe('blue')
  })

  it('100% when all completed', () => {
    const allDone = [
      { label: 'Step 1', status: 'completed' as const },
      { label: 'Step 2', status: 'completed' as const },
    ]
    const json = autoProgress(allDone).toJSON()
    const progress = json.children!.find(c => c.type === 'Progress')
    expect(progress!.value).toBe(100)
  })
})
