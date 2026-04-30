/**
 * PrefabApp tests — wire format, toJSON, toHTML
 */

import { describe, it, expect } from 'bun:test'
import { PrefabApp } from '../src/app'
import { Column } from '../src/components/layout'
import { Heading, Text } from '../src/components/typography'
import { DataTable, col } from '../src/components/data'
import { Form, Input, Button } from '../src/components/form'
import { CallTool } from '../src/actions/mcp'
import { SetState, ShowToast } from '../src/actions/client'
import { rx, RESULT } from '../src/rx/rx'

describe('PrefabApp', () => {
  it('produces valid $prefab wire format', () => {
    const app = new PrefabApp({
      view: Column({ gap: 4, children: [Heading('Hello')] }),
      state: { count: 0 },
    })
    const json = app.toJSON()

    expect(json.$prefab).toEqual({ version: '0.2' })
    expect(json.view.type).toBe('Div')
    expect(json.view.cssClass).toBe('pf-app-root')
    expect(json.view.children).toHaveLength(1)
    expect(json.view.children![0].type).toBe('Column')
    expect(json.state).toEqual({ count: 0 })
  })

  it('includes custom cssClass on root', () => {
    const app = new PrefabApp({
      view: Heading('Hi'),
      cssClass: 'p-6 max-w-4xl',
    })
    expect(app.toJSON().view.cssClass).toBe('pf-app-root p-6 max-w-4xl')
  })

  it('includes theme', () => {
    const app = new PrefabApp({
      view: Heading('Hi'),
      theme: { light: { primary: '#000' }, dark: { primary: '#fff' } },
    })
    expect(app.toJSON().theme).toEqual({
      light: { primary: '#000' },
      dark: { primary: '#fff' },
    })
  })

  it('includes key bindings', () => {
    const app = new PrefabApp({
      view: Heading('Hi'),
      keyBindings: { 'Escape': new SetState('modal', false) },
    })
    const json = app.toJSON()
    expect(json.keyBindings!.Escape).toEqual({ action: 'setState', key: 'modal', value: false })
  })

  it('includes defs', () => {
    const app = new PrefabApp({
      view: Heading('Hi'),
      defs: { 'MyCard': Column({ gap: 2, children: [Text('Reusable')] }) },
    })
    const json = app.toJSON()
    expect(json.defs!.MyCard.type).toBe('Column')
  })

  it('omits undefined optional fields', () => {
    const app = new PrefabApp({ view: Heading('Hi') })
    const json = app.toJSON()
    expect(json.state).toBeUndefined()
    expect(json.theme).toBeUndefined()
    expect(json.defs).toBeUndefined()
    expect(json.keyBindings).toBeUndefined()
    expect(json.layout).toBeUndefined()
  })

  it('includes layout hints when provided', () => {
    const app = new PrefabApp({
      view: Heading('Dashboard'),
      layout: { preferredHeight: 600, minHeight: 300, maxHeight: 900 },
    })
    const json = app.toJSON()
    expect(json.layout).toEqual({ preferredHeight: 600, minHeight: 300, maxHeight: 900 })
  })

  it('includes partial layout hints', () => {
    const app = new PrefabApp({
      view: Heading('Widget'),
      layout: { preferredHeight: 400 },
    })
    const json = app.toJSON()
    expect(json.layout).toEqual({ preferredHeight: 400 })
  })

  it('generates valid HTML', () => {
    const app = new PrefabApp({
      title: 'Test App',
      view: Heading('Hello'),
    })
    const html = app.toHTML()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>Test App</title>')
    expect(html).toContain('__PREFAB_DATA__')
    expect(html).toContain('"$prefab"')
    expect(html).toContain('PrefabRenderer.mount')
  })

  it('real-world example: user management app', () => {
    const app = new PrefabApp({
      state: { users: [] },
      view: Column({ gap: 6, cssClass: 'p-6', children: [
        Heading('User Management'),
        DataTable({
          rows: rx('users'),
          columns: [
            col('username', 'Username', { sortable: true }),
            col('email', 'Email'),
            col('role', 'Role'),
          ],
          search: true,
        }),
        Form({
          onSubmit: new CallTool('create_user', {
            onSuccess: [new SetState('users', RESULT), new ShowToast('Created!', { variant: 'success' })],
          }),
          children: [
            Input({ name: 'username', label: 'Username', required: true }),
            Input({ name: 'email', label: 'Email', inputType: 'email' }),
            Button('Create User'),
          ],
        }),
      ] }),
    })

    const json = app.toJSON()

    // Verify structure
    expect(json.$prefab.version).toBe('0.2')
    expect(json.state).toEqual({ users: [] })

    const columnView = json.view.children![0]
    expect(columnView.type).toBe('Column')
    expect(columnView.cssClass).toContain('gap-6')
    expect(columnView.children).toHaveLength(3)

    // Heading
    expect(columnView.children![0].type).toBe('Heading')

    // DataTable
    const table = columnView.children![1]
    expect(table.type).toBe('DataTable')
    expect(table.rows).toBe('{{ users }}')
    expect(table.search).toBe(true)

    // Form
    const form = columnView.children![2]
    expect(form.type).toBe('Form')
    expect((form.onSubmit as { action: string }).action).toBe('toolCall')
    expect(form.children).toHaveLength(3)
  })
})
