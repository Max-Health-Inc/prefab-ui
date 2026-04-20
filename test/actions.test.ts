/**
 * Actions tests — client-side and MCP transport actions
 */

import { describe, it, expect } from 'bun:test'
import { SetState, ToggleState, AppendState, PopState, ShowToast, CloseOverlay, OpenLink, SetInterval } from '../src/actions/client'
import { CallTool, SendMessage, UpdateContext } from '../src/actions/mcp'
import { RESULT } from '../src/rx/rx'

describe('Client actions', () => {
  it('SetState', () => {
    const a = new SetState('count', 5)
    expect(a.toJSON()).toEqual({ action: 'setState', key: 'count', value: 5 })
  })

  it('SetState with reactive value', () => {
    const a = new SetState('items', RESULT)
    expect(a.toJSON()).toEqual({ action: 'setState', key: 'items', value: '{{ $result }}' })
  })

  it('ToggleState', () => {
    expect(new ToggleState('visible').toJSON()).toEqual({ action: 'toggleState', key: 'visible' })
  })

  it('AppendState', () => {
    expect(new AppendState('items', { name: 'New' }).toJSON()).toEqual({
      action: 'appendState',
      key: 'items',
      value: { name: 'New' },
    })
  })

  it('PopState', () => {
    expect(new PopState('items', 0).toJSON()).toEqual({ action: 'popState', key: 'items', index: 0 })
  })

  it('ShowToast', () => {
    const a = new ShowToast('Saved!', { variant: 'success', duration: 3000 })
    expect(a.toJSON()).toEqual({
      action: 'showToast',
      message: 'Saved!',
      variant: 'success',
      duration: 3000,
    })
  })

  it('CloseOverlay', () => {
    expect(new CloseOverlay().toJSON()).toEqual({ action: 'closeOverlay' })
  })

  it('OpenLink', () => {
    expect(new OpenLink('https://example.com').toJSON()).toEqual({
      action: 'openLink',
      url: 'https://example.com',
      target: '_blank',
    })
  })

  it('SetInterval', () => {
    const tick = new SetState('count', 0)
    const a = new SetInterval(1000, tick)
    expect(a.toJSON()).toEqual({
      action: 'setInterval',
      intervalMs: 1000,
      onTick: { action: 'setState', key: 'count', value: 0 },
    })
  })
})

describe('MCP actions', () => {
  it('CallTool basic', () => {
    const a = new CallTool('create_user', { arguments: { name: 'John' } })
    expect(a.toJSON()).toEqual({
      action: 'toolCall',
      tool: 'create_user',
      arguments: { name: 'John' },
    })
  })

  it('CallTool with callbacks', () => {
    const a = new CallTool('save_item', {
      onSuccess: [new SetState('items', RESULT), new ShowToast('Saved!', { variant: 'success' })],
      onError: new ShowToast('Failed', { variant: 'error' }),
    })
    const json = a.toJSON()
    expect(json.action).toBe('toolCall')
    expect(json.tool).toBe('save_item')
    expect(Array.isArray(json.onSuccess)).toBe(true)
    expect((json.onSuccess as unknown[])).toHaveLength(2)
    expect((json.onError as { action: string }).action).toBe('showToast')
  })

  it('SendMessage', () => {
    expect(new SendMessage('Hello').toJSON()).toEqual({ action: 'sendMessage', message: 'Hello' })
  })

  it('UpdateContext', () => {
    expect(new UpdateContext({ key: 'value' }).toJSON()).toEqual({
      action: 'updateContext',
      context: { key: 'value' },
    })
  })
})
