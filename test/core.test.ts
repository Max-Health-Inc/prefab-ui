/**
 * Core tests — Component, ContainerComponent, StatefulComponent, serialization
 */

import { describe, it, expect } from 'bun:test'
import { Component, ContainerComponent, StatefulComponent } from '../src/core/component'

describe('Component', () => {
  it('serializes a basic component with type', () => {
    const c = new Component('Separator')
    expect(c.toJSON()).toEqual({ type: 'Separator' })
  })

  it('includes id and cssClass when set', () => {
    const c = new Component('Badge', { id: 'b1', cssClass: 'my-badge' })
    expect(c.toJSON()).toEqual({ type: 'Badge', id: 'b1', cssClass: 'my-badge' })
  })

  it('omits undefined optional props', () => {
    const c = new Component('Separator', {})
    const json = c.toJSON()
    expect(json.id).toBeUndefined()
    expect(json.cssClass).toBeUndefined()
  })
})

describe('ContainerComponent', () => {
  it('serializes with children', () => {
    const child1 = new Component('Text')
    const child2 = new Component('Badge')
    const c = new ContainerComponent('Column', { children: [child1, child2] })
    const json = c.toJSON()
    expect(json.type).toBe('Column')
    expect(json.children).toHaveLength(2)
    expect(json.children![0].type).toBe('Text')
    expect(json.children![1].type).toBe('Badge')
  })

  it('omits children array when empty', () => {
    const c = new ContainerComponent('Row')
    expect(c.toJSON().children).toBeUndefined()
  })
})

describe('StatefulComponent', () => {
  it('serializes name and value', () => {
    const c = new StatefulComponent('Input', { name: 'email', value: 'test@example.com' })
    const json = c.toJSON()
    expect(json.type).toBe('Input')
    expect(json.name).toBe('email')
    expect(json.value).toBe('test@example.com')
  })

  it('omits value when undefined', () => {
    const c = new StatefulComponent('Input', { name: 'email' })
    expect(c.toJSON().value).toBeUndefined()
  })
})
