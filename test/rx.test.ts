/**
 * Rx tests — reactive expression builder
 */

import { describe, it, expect } from 'bun:test'
import { Rx, rx, ITEM, INDEX, EVENT, ERROR, RESULT, STATE } from '../src/rx/rx'

describe('Rx', () => {
  it('creates simple state reference', () => {
    expect(rx('count').toString()).toBe('{{ count }}')
  })

  it('dot access', () => {
    expect(rx('user').dot('name').toString()).toBe('{{ user.name }}')
  })

  it('index access', () => {
    expect(rx('items').at(0).toString()).toBe('{{ items.0 }}')
  })

  it('arithmetic operations', () => {
    expect(rx('count').add(1).toString()).toBe('{{ count + 1 }}')
    expect(rx('price').mul(rx('qty')).toString()).toBe('{{ price * qty }}')
  })

  it('comparison operations', () => {
    expect(rx('age').gt(18).toString()).toBe('{{ age > 18 }}')
    expect(rx('status').eq('active').toString()).toBe("{{ status === 'active' }}")
  })

  it('logical operations', () => {
    expect(rx('a').and(rx('b')).toString()).toBe('{{ a && b }}')
    expect(rx('active').not().toString()).toBe('{{ !active }}')
  })

  it('ternary', () => {
    expect(rx('active').then('Yes', 'No').toString()).toBe("{{ active ? 'Yes' : 'No' }}")
  })

  it('pipe methods', () => {
    expect(rx('price').currency('USD').toString()).toBe("{{ price | currency:'USD' }}")
    expect(rx('items').length().toString()).toBe('{{ items | length }}')
    expect(rx('name').upper().toString()).toBe('{{ name | upper }}')
    expect(rx('text').truncate(50).toString()).toBe('{{ text | truncate:50 }}')
  })

  it('chained pipes', () => {
    expect(rx('price').round(2).currency().toString()).toBe('{{ price | round:2 | currency }}')
  })

  it('toJSON returns template string', () => {
    expect(rx('count').toJSON()).toBe('{{ count }}')
  })
})

describe('Built-in reactive variables', () => {
  it('ITEM', () => expect(ITEM.toString()).toBe('{{ $item }}'))
  it('INDEX', () => expect(INDEX.toString()).toBe('{{ $index }}'))
  it('EVENT', () => expect(EVENT.toString()).toBe('{{ $event }}'))
  it('ERROR', () => expect(ERROR.toString()).toBe('{{ $error }}'))
  it('RESULT', () => expect(RESULT.toString()).toBe('{{ $result }}'))
})

describe('STATE proxy', () => {
  it('creates Rx from property access', () => {
    expect(STATE.foo.toString()).toBe('{{ foo }}')
    expect(STATE.users.toString()).toBe('{{ users }}')
  })
})
