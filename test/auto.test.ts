/**
 * Tests for auto-rendering utilities — statusVariant, autoDetail, autoTable.
 */

import { describe, it, expect } from 'bun:test'
import {
  statusVariant,
  registerStatusVariants,
  autoDetail,
  autoTable,
} from '../src/auto/index'

describe('statusVariant', () => {
  it('maps known success statuses', () => {
    expect(statusVariant('active')).toBe('success')
    expect(statusVariant('completed')).toBe('success')
    expect(statusVariant('available')).toBe('success')
    expect(statusVariant('verified')).toBe('success')
  })

  it('maps known warning statuses', () => {
    expect(statusVariant('pending')).toBe('warning')
    expect(statusVariant('processing')).toBe('warning')
    expect(statusVariant('in_progress')).toBe('warning')
    expect(statusVariant('draft')).toBe('warning')
  })

  it('maps known error statuses', () => {
    expect(statusVariant('failed')).toBe('destructive')
    expect(statusVariant('deleted')).toBe('destructive')
    expect(statusVariant('expired')).toBe('destructive')
    expect(statusVariant('rejected')).toBe('destructive')
  })

  it('falls back to outline for unknown', () => {
    expect(statusVariant('something_random')).toBe('outline')
    expect(statusVariant('')).toBe('outline')
  })

  it('normalizes dashes and spaces', () => {
    expect(statusVariant('in-progress')).toBe('warning')
    expect(statusVariant('in progress')).toBe('warning')
    expect(statusVariant('IN_PROGRESS')).toBe('warning')
  })

  it('registerStatusVariants adds new mappings', () => {
    registerStatusVariants({ 'custom_state': 'info', 'my-status': 'secondary' })
    expect(statusVariant('custom_state')).toBe('info')
    expect(statusVariant('my-status')).toBe('secondary')
  })
})

describe('autoDetail', () => {
  it('renders a detail card from a flat object', () => {
    const result = autoDetail({
      name: 'John Doe',
      email: 'john@example.com',
      status: 'active',
      verified: true,
      createdAt: '2024-01-15T10:30:00Z',
    })
    const json = result.toJSON()

    expect(json.type).toBe('Column')
    expect(json.cssClass).toContain('max-w-2xl')

    // Should have Heading (auto-detected from name field)
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading).toBeDefined()
    expect(heading!.content).toBe('John Doe')

    // Should have Card
    const card = json.children!.find(c => c.type === 'Card')
    expect(card).toBeDefined()
  })

  it('renders booleans as badges', () => {
    const result = autoDetail({ verified: true, disabled: false })
    const json = result.toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const content = card.children![0] // CardContent
    const rows = content.children!.filter(c => c.type === 'Row')

    // Find the badge in first row
    const firstRowBadge = rows[0].children!.find(c => c.type === 'Badge')
    expect(firstRowBadge).toBeDefined()
    expect(firstRowBadge!.content).toBe('Yes')
    expect(firstRowBadge!.variant).toBe('success')
  })

  it('renders status fields as colored badges', () => {
    const result = autoDetail({ status: 'pending' })
    const json = result.toJSON()
    const card = json.children!.find(c => c.type === 'Card')!
    const content = card.children![0]
    const row = content.children!.find(c => c.type === 'Row')!
    const badge = row.children!.find(c => c.type === 'Badge')
    expect(badge).toBeDefined()
    expect(badge!.variant).toBe('warning')
  })

  it('uses custom title', () => {
    const result = autoDetail({ id: 123 }, { title: 'Record Details' })
    const json = result.toJSON()
    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading!.content).toBe('Record Details')
  })

  it('excludes specified fields', () => {
    const result = autoDetail(
      { name: 'Test', password: 'secret', email: 'test@test.com' },
      { exclude: ['password'] },
    )
    const json = result.toJSON()
    const allText = JSON.stringify(json)
    expect(allText).not.toContain('secret')
    expect(allText).toContain('test@test.com')
  })

  it('includes only specified fields', () => {
    const result = autoDetail(
      { name: 'Test', email: 'test@test.com', age: 30 },
      { include: ['name', 'email'] },
    )
    const json = result.toJSON()
    const allText = JSON.stringify(json)
    expect(allText).toContain('test@test.com')
    expect(allText).not.toContain('30')
  })

  it('renders null values as dash', () => {
    const result = autoDetail({ value: null })
    const json = result.toJSON()
    const allText = JSON.stringify(json)
    expect(allText).toContain('—')
  })
})

describe('autoTable', () => {
  const sampleRows = [
    { name: 'Alice', email: 'alice@test.com', age: 28 },
    { name: 'Bob', email: 'bob@test.com', age: 35 },
    { name: 'Charlie', email: 'charlie@test.com', age: 22 },
  ]

  it('renders a table with auto-inferred columns', () => {
    const result = autoTable(sampleRows)
    const json = result.toJSON()

    expect(json.type).toBe('Column')

    const table = json.children!.find(c => c.type === 'DataTable')
    expect(table).toBeDefined()
    expect(table!.search).toBe(true)

    const columns = table!.columns as { key: string; header: string; sortable?: boolean }[]
    expect(columns).toHaveLength(3)
    expect(columns[0].key).toBe('name')
    expect(columns[0].header).toBe('Name')
    expect(columns[0].sortable).toBe(true)
  })

  it('includes title and record count when title set', () => {
    const result = autoTable(sampleRows, { title: 'Users' })
    const json = result.toJSON()

    const heading = json.children!.find(c => c.type === 'Heading')
    expect(heading).toBeDefined()
    expect(heading!.content).toBe('Users')

    // Badge with count
    const row = json.children!.find(c => c.type === 'Row')!
    const badge = row.children!.find(c => c.type === 'Badge')
    expect(badge!.content).toBe('3 records')
  })

  it('excludes specified columns', () => {
    const result = autoTable(sampleRows, { exclude: ['age'] })
    const json = result.toJSON()
    const table = json.children!.find(c => c.type === 'DataTable')!
    const columns = table.columns as { key: string }[]
    const keys = columns.map(c => c.key)
    expect(keys).not.toContain('age')
    expect(keys).toContain('name')
  })

  it('skips nested object columns', () => {
    const rows = [
      { name: 'Alice', address: { city: 'NYC', zip: '10001' } },
    ]
    const result = autoTable(rows)
    const json = result.toJSON()
    const table = json.children!.find(c => c.type === 'DataTable')!
    const columns = table.columns as { key: string }[]
    expect(columns).toHaveLength(1)
    expect(columns[0].key).toBe('name')
  })

  it('uses custom columns when provided', () => {
    const { col } = require('../src/components/data/index')
    const result = autoTable(sampleRows, {
      columns: [col('name', 'Full Name'), col('age', 'Years')],
    })
    const json = result.toJSON()
    const table = json.children!.find(c => c.type === 'DataTable')!
    const columns = table.columns as { header: string }[]
    expect(columns[0].header).toBe('Full Name')
    expect(columns[1].header).toBe('Years')
  })

  it('handles empty array', () => {
    const result = autoTable([])
    const json = result.toJSON()
    const table = json.children!.find(c => c.type === 'DataTable')!
    expect(table.columns).toEqual([])
  })

  it('disables search when option set', () => {
    const result = autoTable(sampleRows, { search: false })
    const json = result.toJSON()
    const table = json.children!.find(c => c.type === 'DataTable')!
    expect(table.search).toBeUndefined()
  })

  it('disables sortable when option set', () => {
    const result = autoTable(sampleRows, { sortable: false })
    const json = result.toJSON()
    const table = json.children!.find(c => c.type === 'DataTable')!
    const columns = table.columns as { sortable?: boolean }[]
    expect(columns[0].sortable).toBeUndefined()
  })
})
