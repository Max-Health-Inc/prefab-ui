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
rx`Hello, ${STATE}.name!`          // → "Hello, {{ state.name }}!" (tagged template)
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
| `capitalize` | Capitalize first letter | `{{ name \| capitalize }}` |
| `truncate:N` | Truncate to N chars | `{{ desc \| truncate:50 }}` |
| `currency` / `currency:'USD'` | Format as currency | `{{ price \| currency:'EUR' }}` |
| `number` | Format number | `{{ count \| number }}` |
| `percent` | Format as percentage | `{{ rate \| percent }}` |
| `date` | Format date | `{{ created \| date }}` |
| `time` | Format time | `{{ created \| time }}` |
| `datetime` | Format date + time | `{{ created \| datetime }}` |
| `length` | Array/string length | `{{ items \| length }}` |
| `default:'fallback'` | Default if null/empty | `{{ name \| default:'Unknown' }}` |
| `json` | JSON stringify | `{{ data \| json }}` |
| `keys` | Object keys | `{{ obj \| keys }}` |
| `values` | Object values | `{{ obj \| values }}` |
| `first` | First element | `{{ items \| first }}` |
| `last` | Last element | `{{ items \| last }}` |

Pipes can be chained: `{{ name | upper | truncate:20 }}`

## Built-in Variables

| Variable | Builder | Description |
|----------|---------|-------------|
| `state.*` | `STATE` | Reactive state store |
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
