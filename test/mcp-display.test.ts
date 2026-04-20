/**
 * Integration tests for MCP display helpers.
 *
 * Tests display(), display_form(), display_update(), display_error()
 * with a mock MCP tool handler pattern.
 */

import { describe, it, expect } from 'bun:test'
import {
  display,
  display_form,
  display_update,
  display_error,
  PrefabApp,
  Column,
  Heading,
  Text,
  autoTable,
  autoDetail,
  SetState,
  CallTool,
} from '../src/index'
import type { McpToolResult, PrefabWireFormat, PrefabUpdateWire } from '../src/index'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse the prefab JSON from an MCP tool result */
function parsePrefab(result: McpToolResult): PrefabWireFormat | PrefabUpdateWire {
  expect(result.content).toHaveLength(1)
  expect(result.content[0].type).toBe('text')
  return JSON.parse((result.content[0] as { text: string }).text)
}

// ── Mock MCP tool handler pattern ────────────────────────────────────────────

/** Simulates a FastMCP-style tool handler that returns prefab UIs */
function mockToolHandler(
  toolName: string,
  handler: (args: Record<string, unknown>) => McpToolResult,
) {
  return { toolName, handler }
}

// ── display() ────────────────────────────────────────────────────────────────

describe('display()', () => {
  it('wraps a Component into MCP tool result', () => {
    const view = Column({ children: [Heading('Hello'), Text('World')] })
    const result = display(view, { title: 'Test Page' })

    expect(result.isError).toBeUndefined()
    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.$prefab.version).toBe('0.2')
    expect(wire.view.type).toBe('Div')
    expect(wire.view.cssClass).toContain('pf-app-root')
  })

  it('passes through PrefabApp directly', () => {
    const app = new PrefabApp({
      title: 'Direct',
      view: Text('Hi'),
      state: { count: 0 },
    })
    const result = display(app)
    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.state).toEqual({ count: 0 })
  })

  it('includes state and theme when provided', () => {
    const result = display(Text('x'), {
      title: 'Themed',
      state: { name: 'Alice' },
      theme: { light: { primary: '#00f' } },
    })
    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.state).toEqual({ name: 'Alice' })
    expect(wire.theme!.light!.primary).toBe('#00f')
  })

  it('includes onMount and keyBindings', () => {
    const result = display(Text('x'), {
      onMount: new SetState('loaded', true),
      keyBindings: { 'ctrl+s': new CallTool('save') },
    })
    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.view).toBeDefined()
    // keyBindings are serialized
    expect(wire.keyBindings!['ctrl+s']).toEqual({ action: 'toolCall', tool: 'save' })
  })

  it('works with autoTable', () => {
    const data = [
      { id: 1, name: 'Alice', role: 'Admin' },
      { id: 2, name: 'Bob', role: 'User' },
    ]
    const result = display(autoTable(data), { title: 'Users' })
    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.$prefab.version).toBe('0.2')
    const json = JSON.stringify(wire)
    expect(json).toContain('DataTable')
  })

  it('works with autoDetail', () => {
    const result = display(autoDetail({ name: 'Test', status: 'active' }))
    const json = JSON.stringify(parsePrefab(result))
    expect(json).toContain('Card')
  })
})

// ── display_form() ───────────────────────────────────────────────────────────

describe('display_form()', () => {
  const fields = [
    { name: 'name', label: 'Patient Name', required: true },
    { name: 'dob', label: 'Date of Birth', type: 'date' },
    { name: 'email', label: 'Email', type: 'email' },
  ]

  it('returns a form MCP result', () => {
    const result = display_form(fields, 'create_patient', { title: 'New Patient' })
    expect(result.isError).toBeUndefined()

    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.$prefab.version).toBe('0.2')
    const json = JSON.stringify(wire)
    expect(json).toContain('Form')
    expect(json).toContain('create_patient')
  })

  it('includes all fields as Inputs', () => {
    const result = display_form(fields, 'submit')
    const json = JSON.stringify(parsePrefab(result))
    expect(json).toContain('Patient Name')
    expect(json).toContain('Date of Birth')
    expect(json).toContain('Email')
  })

  it('form submits via CallTool to the specified tool', () => {
    const result = display_form(fields, 'create_patient')
    const json = JSON.stringify(parsePrefab(result))
    expect(json).toContain('"action":"toolCall"')
    expect(json).toContain('"tool":"create_patient"')
  })

  it('includes initial state when provided', () => {
    const result = display_form(fields, 'update', {
      state: { name: 'Pre-filled' },
    })
    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.state).toEqual({ name: 'Pre-filled' })
  })
})

// ── display_update() ─────────────────────────────────────────────────────────

describe('display_update()', () => {
  it('returns a state update payload', () => {
    const result = display_update({ loading: false, data: [1, 2, 3] })
    expect(result.isError).toBeUndefined()

    const payload = parsePrefab(result) as PrefabUpdateWire
    expect(payload.$prefab.version).toBe('0.2')
    expect(payload.update.state).toEqual({ loading: false, data: [1, 2, 3] })
  })

  it('handles empty state', () => {
    const payload = parsePrefab(display_update({})) as PrefabUpdateWire
    expect(payload.update.state).toEqual({})
  })

  it('handles nested objects', () => {
    const result = display_update({
      user: { name: 'Alice', prefs: { theme: 'dark' } },
      count: 42,
    })
    const payload = parsePrefab(result) as PrefabUpdateWire
    expect(payload.update.state.user).toEqual({ name: 'Alice', prefs: { theme: 'dark' } })
    expect(payload.update.state.count).toBe(42)
  })
})

// ── display_error() ──────────────────────────────────────────────────────────

describe('display_error()', () => {
  it('returns an error MCP result with isError=true', () => {
    const result = display_error('Not Found', 'Patient with ID xyz was not found.')
    expect(result.isError).toBe(true)

    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.$prefab.version).toBe('0.2')
    const json = JSON.stringify(wire)
    expect(json).toContain('Not Found')
    expect(json).toContain('Patient with ID xyz was not found.')
    expect(json).toContain('"variant":"destructive"')
  })

  it('includes detail code block', () => {
    const result = display_error('Server Error', 'Internal error', {
      detail: 'Error: ECONNREFUSED at TCP.onconnect',
    })
    const json = JSON.stringify(parsePrefab(result))
    expect(json).toContain('ECONNREFUSED')
    expect(json).toContain('Code')
  })

  it('includes hint text', () => {
    const result = display_error('Auth Failed', 'Token expired', {
      hint: 'Try logging in again.',
    })
    const json = JSON.stringify(parsePrefab(result))
    expect(json).toContain('Try logging in again.')
  })

  it('renders Alert with AlertTitle and AlertDescription', () => {
    const result = display_error('Bad Request', 'Missing field: name')
    const json = JSON.stringify(parsePrefab(result))
    expect(json).toContain('Alert')
    expect(json).toContain('AlertTitle')
    expect(json).toContain('AlertDescription')
  })
})

// ── Mock MCP integration ─────────────────────────────────────────────────────

describe('mock MCP tool handler integration', () => {
  it('tool returns display() result', () => {
    const tool = mockToolHandler('list_patients', (_args) => {
      const patients = [
        { id: 'p1', name: 'Alice Smith', status: 'active' },
        { id: 'p2', name: 'Bob Jones', status: 'inactive' },
      ]
      return display(autoTable(patients), { title: 'Patients' })
    })

    const result = tool.handler({})
    expect(result.content).toHaveLength(1)
    const wire = parsePrefab(result) as PrefabWireFormat
    expect(wire.$prefab.version).toBe('0.2')
  })

  it('tool returns display_form() for create flow', () => {
    const tool = mockToolHandler('create_patient_form', (_args) => {
      return display_form(
        [
          { name: 'name', label: 'Name', required: true },
          { name: 'mrn', label: 'MRN', required: true },
        ],
        'create_patient',
        { title: 'New Patient', submitLabel: 'Create Patient' },
      )
    })

    const result = tool.handler({})
    const json = JSON.stringify(parsePrefab(result))
    expect(json).toContain('create_patient')
    expect(json).toContain('Create Patient')
  })

  it('tool returns display_update() for state patches', () => {
    const tool = mockToolHandler('refresh_data', (_args) => {
      return display_update({ patients: [{ id: 'p3', name: 'Charlie' }], lastUpdated: '2026-04-20' })
    })

    const result = tool.handler({})
    const payload = parsePrefab(result) as PrefabUpdateWire
    expect(payload.update.state.patients).toHaveLength(1)
    expect(payload.update.state.lastUpdated).toBe('2026-04-20')
  })

  it('tool returns display_error() on failure', () => {
    const tool = mockToolHandler('get_patient', (args) => {
      const id = args.id as string
      if (!id) {
        return display_error('Validation Error', 'Patient ID is required.', {
          hint: 'Provide a valid patient ID.',
        })
      }
      return display_error('Not Found', `Patient ${id} not found.`)
    })

    const noIdResult = tool.handler({})
    expect(noIdResult.isError).toBe(true)
    const json1 = JSON.stringify(parsePrefab(noIdResult))
    expect(json1).toContain('Patient ID is required')

    const notFoundResult = tool.handler({ id: 'xyz' })
    expect(notFoundResult.isError).toBe(true)
    const json2 = JSON.stringify(parsePrefab(notFoundResult))
    expect(json2).toContain('Patient xyz not found')
  })

  it('full tool pipeline: form → submit → display result', () => {
    // Step 1: Show form
    const formResult = display_form(
      [{ name: 'query', label: 'Search', required: true }],
      'search_patients',
      { title: 'Patient Search' },
    )
    expect(formResult.isError).toBeUndefined()

    // Step 2: Handle submit → return results
    const searchResult = display(
      autoTable([{ name: 'Alice', mrn: '12345' }]),
      { title: 'Search Results', state: { query: 'Alice' } },
    )
    expect(searchResult.isError).toBeUndefined()
    const wire = parsePrefab(searchResult) as PrefabWireFormat
    expect(wire.state!.query).toBe('Alice')

    // Step 3: Update state without full re-render
    const updateResult = display_update({ loading: false, total: 1 })
    const payload = parsePrefab(updateResult) as PrefabUpdateWire
    expect(payload.update.state.total).toBe(1)
  })
})
