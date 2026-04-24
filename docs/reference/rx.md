# Reactive Expressions (`rx`)

Reactive expressions are template strings evaluated client-side by the renderer. They reference state values, loop variables, and event data — and update automatically when state changes.

## Template Syntax

Expressions are wrapped in `{{ }}`:

```
{{ state.count }}
{{ state.count + 1 }}
{{ state.name | upper }}
{{ state.active ? 'Yes' : 'No' }}
```

## The `rx()` Builder

The `rx()` function provides a typed, chainable API for building expressions:

```ts
import { rx, STATE, ITEM, INDEX, EVENT, ERROR, RESULT } from '@maxhealth.tech/prefab'
```

### Basic Usage

```ts
rx('count')                        // → "{{ count }}"
rx('user.name')                    // → "{{ user.name }}"
// STATE.name → rx('name')         (proxy shorthand for state keys)
```

### Property Access

```ts
rx('user').dot('name')             // → "{{ user.name }}"
rx('items').at(0)                  // → "{{ items.0 }}"
rx('items').at(rx('state.index'))  // → "{{ items.{{ state.index }} }}"
```

### Arithmetic

```ts
rx('count').add(1)                 // → "{{ count + 1 }}"
rx('price').mul(rx('quantity'))    // → "{{ price * quantity }}"
rx('total').sub(rx('discount'))    // → "{{ total - discount }}"
rx('value').div(100)               // → "{{ value / 100 }}"
rx('index').mod(2)                 // → "{{ index % 2 }}"
```

### Comparison

```ts
rx('count').gt(10)                 // → "{{ count > 10 }}"
rx('status').eq('active')          // → "{{ status === 'active' }}"
rx('age').gte(18)                  // → "{{ age >= 18 }}"
rx('count').neq(0)                 // → "{{ count !== 0 }}"
```

### Logical

```ts
rx('a').and(rx('b'))               // → "{{ a && b }}"
rx('a').or(rx('b'))                // → "{{ a || b }}"
rx('loading').not()                // → "{{ !loading }}"
```

### Ternary

```ts
rx('active').then('Online', 'Offline')
// → "{{ active ? 'Online' : 'Offline' }}"

rx('count').gt(0).then(rx('count'), 'None')
// → "{{ count > 0 ? {{ count }} : 'None' }}"
```

### Pipes (Filters)

Pipes transform values for display:

```ts
rx('name').upper()                 // → "{{ name | upper }}"
rx('amount').currency('USD')       // → "{{ amount | currency:'USD' }}"
rx('items').length()               // → "{{ items | length }}"
rx('name').truncate(20)            // → "{{ name | truncate:20 }}"
rx('date').date()                  // → "{{ date | date }}"
```

#### Available Pipes

| Pipe | Description | Example |
|------|-------------|---------|
| `upper` | Uppercase | `{{ name \| upper }}` |
| `lower` | Lowercase | `{{ name \| lower }}` |
| `truncate:N` | Truncate to N chars | `{{ desc \| truncate:50 }}` |
| `currency` / `currency:'USD'` | Format as currency | `{{ price \| currency:'EUR' }}` |
| `number` | Format number | `{{ count \| number }}` |
| `percent` | Format as percentage | `{{ rate \| percent }}` |
| `date` | Format date | `{{ created \| date }}` |
| `time` | Format time | `{{ created \| time }}` |
| `datetime` | Format date + time | `{{ created \| datetime }}` |
| `length` | Array/string length | `{{ items \| length }}` |
| `default:'fallback'` | Default if null/empty | `{{ name \| default:'Unknown' }}` |
| `first` | First element | `{{ items \| first }}` |
| `last` | Last element | `{{ items \| last }}` |
| `round:N` | Round to N decimals | `{{ value \| round:2 }}` |
| `compact:N` | Compact number format | `{{ value \| compact }}` |
| `abs` | Absolute value | `{{ value \| abs }}` |
| `pluralize:'word'` | Pluralize word by count | `{{ count \| pluralize:'item' }}` |
| `join:','` | Join array with separator | `{{ items \| join:',' }}` |
| `selectattr:'key'` | Filter objects by truthy attr | `{{ items \| selectattr:'active' }}` |
| `rejectattr:'key'` | Filter objects by falsy attr | `{{ items \| rejectattr:'deleted' }}` |
| `find:'field',keyRef` | Find row in array by key | `{{ patients \| find:'id',selectedId }}` |
| `dot:'field'` | Extract property from object | `{{ patient \| dot:'name' }}` |

Pipes can be chained: `{{ name | upper | truncate:20 }}`

## Built-in Variables

| Variable | Builder | Description |
|----------|---------|-------------|
| `state.*` | `STATE` | Reactive state store (`STATE.foo` → `rx('foo')`) |
| `item` | `ITEM` | Current item in `ForEach` loop |
| `index` | `INDEX` | Current index in `ForEach` loop |
| `event` | `EVENT` | Event data (e.g. form values) |
| `error` | `ERROR` | Error from failed action |
| `result` | `RESULT` | Result from last tool call / fetch |

### Usage with `ForEach`

```ts
ForEach({ each: rx('state.users'), as: 'user' }, [
  Row([
    Text(rx`${ITEM}.name`),
    Badge(rx`${ITEM}.status`),
    Text(rx`User #${INDEX}`),
  ]),
])
```

### Usage with `CallTool` Result

```ts
CallTool('search', {
  arguments: { query: rx`${STATE}.query` },
  resultKey: 'searchResult',
  onSuccess: SetState('items', rx`${RESULT}.data`),
  onError: SetState('errorMsg', rx`${ERROR}`),
})
```

---

## `Signal`

```ts
import { signal, Signal } from '@maxhealth.tech/prefab'
```

A named reactive scalar. Allowed value types: `string | number | boolean | null`.

### `signal(key, initial, options?)`

Factory function — returns a `Signal<T>`.

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | State key |
| `initial` | `SignalValue` | Initial value |
| `options.urlSync` | `string` | URL query param name (opt-in) |

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `toRx()` | `Rx` | `{{ key }}` expression |
| `toString()` | `string` | `{{ key }}` |
| `toJSON()` | `string` | Same as `toString()` |
| `toState()` | `Record<string, T>` | `{ key: initial }` |

---

## `Collection`

```ts
import { collection, Collection } from '@maxhealth.tech/prefab'
```

A named keyed array with typed lookup helpers.

### `collection(stateKey, rows, { key })`

| Param | Type | Description |
|-------|------|-------------|
| `stateKey` | `string` | State key |
| `rows` | `T[]` | Source data |
| `key` | `string` | Field used for identity lookups |

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `by(signal)` | `Ref<T>` | Lazy row reference via `find` pipe |
| `firstKey()` | `string \| null` | Key of first row |
| `lastKey()` | `string \| null` | Key of last row |
| `length` | `number` | Row count |
| `toRx()` | `Rx` | `{{ stateKey }}` expression |
| `toState()` | `Record<string, T[]>` | `{ stateKey: rows }` |

---

## `Ref`

```ts
import { Ref } from '@maxhealth.tech/prefab'
```

A lazy, serializable reference to a row in a collection. Returned by `collection.by(signal)`.

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `toRx()` | `Rx` | The find expression as `Rx` |
| `dot(field)` | `Ref` | Nested property access via `dot` pipe |
| `toString()` | `string` | `{{ expr }}` |
| `toJSON()` | `string` | Same as `toString()` |

---

## Custom Pipes

```ts
import { registerPipe, unregisterPipe, listPipes } from '@maxhealth.tech/prefab'
```

### `registerPipe(name, fn)`

Register a custom pipe. Built-in pipes always shadow custom pipes.

```ts
registerPipe('humanName', (value) => {
  const n = value as { given?: string[]; family?: string }
  return `${(n.given ?? []).join(' ')} ${n.family ?? ''}`.trim()
})
```

### `unregisterPipe(name): boolean`

Remove a custom pipe. Returns `true` if it existed.

### `listPipes(): string[]`

List registered custom pipe names.

---

## `resetAutoState()`

Clear the auto state collector. Call this between `PrefabApp` builds in long-running or serverless processes.

```ts
import { resetAutoState } from '@maxhealth.tech/prefab'

resetAutoState()
```
