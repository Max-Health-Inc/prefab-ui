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

## Signals & Collections

Signals and Collections are the typed reactive data layer. They produce `{{ }}` expressions and auto-register their initial values with `PrefabApp` state — no manual `.toState()` needed.

### `signal(key, initial, options?)`

A named reactive scalar (string, number, boolean, or null).

```ts
import { signal } from '@maxhealth.tech/prefab'

const selectedId = signal('selectedPatientId', 'p1')

selectedId.key       // 'selectedPatientId'
selectedId.initial   // 'p1'
selectedId.toRx()    // Rx → "{{ selectedPatientId }}"
selectedId.toString() // "{{ selectedPatientId }}"
selectedId.toState() // { selectedPatientId: 'p1' }
```

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | State key name |
| `initial` | `string \| number \| boolean \| null` | Initial value |
| `options.urlSync` | `string` | Sync with URL query parameter (opt-in) |

### `collection(key, rows, { key: field })`

A named keyed array with typed lookups.

```ts
import { collection } from '@maxhealth.tech/prefab'

const patients = collection('patients', fhirPatients, { key: 'id' })

patients.stateKey    // 'patients'
patients.keyField    // 'id'
patients.rows        // the array
patients.length      // row count
patients.firstKey()  // key of first row, or null
patients.lastKey()   // key of last row, or null
patients.toRx()      // Rx → "{{ patients }}"
patients.toState()   // { patients: [...] }
```

### `collection.by(signal)` → `Ref`

Lazily resolve a row by a signal's value. Returns a `Ref` that compiles to a `find` pipe expression:

```ts
const selected = patients.by(selectedId)

selected.expr        // "patients | find:'id',selectedPatientId"
selected.toString()  // "{{ patients | find:'id',selectedPatientId }}"
selected.dot('name') // Rx → "{{ patients | find:'id',selectedPatientId | dot:'name' }}"
```

The `Ref.dot()` method returns another `Ref`, so you can chain further:

```ts
selected.dot('address').dot('city')
// → "{{ patients | find:'id',selectedPatientId | dot:'address' | dot:'city' }}"
```

### Auto State Collection

When you create signals and collections, their state is auto-collected by `PrefabApp`:

```ts
const patients = collection('patients', data, { key: 'id' })
const selectedId = signal('selectedPatientId', patients.firstKey())

const app = new PrefabApp({
  title: 'Patient Browser',
  view: myView,
  // No need for: state: { ...patients.toState(), ...selectedId.toState() }
  // State is auto-collected from signal() and collection() calls!
})

// wire.state === { patients: [...], selectedPatientId: 'p1' }
```

Use `resetAutoState()` to clear the collector between app builds (important in long-running processes or serverless).

---

## `find` and `dot` Pipes

These pipes enable collection lookups in the wire format. They're used internally by `Ref` but can also be written manually.

### `find:'field',keyRef`

Find a row in an array where `row[field]` matches the value of a state key:

```
{{ patients | find:'id',selectedPatientId }}
```

- The second argument can be a state key, a scope variable (`$item.parentId`), or a quoted literal (`'p1'`).
- Numeric coercion: string `'2'` matches number `2` and vice versa.
- Returns `undefined` if no match is found.

### `dot:'field'`

Extract a property from an object:

```
{{ patients | find:'id',selectedPatientId | dot:'name' }}
```

Returns `undefined` if the input is null/undefined.

---

## Custom Pipes

Register domain-specific pipes that work in `{{ }}` expressions:

```ts
import { registerPipe, unregisterPipe, listPipes } from '@maxhealth.tech/prefab'

// Register a FHIR human name formatter
registerPipe('humanName', (value) => {
  if (!value || typeof value !== 'object') return ''
  const name = value as { given?: string[]; family?: string }
  return `${(name.given ?? []).join(' ')} ${name.family ?? ''}`.trim()
})

// Use in expressions:
// {{ patient | dot:'name' | humanName }}

// Debugging
listPipes()           // → ['humanName']
unregisterPipe('humanName')
```

Built-in pipes always take precedence over custom pipes. Re-registering a pipe with the same name warns and overwrites (HMR-friendly).
