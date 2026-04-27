# Common UI Patterns

Proven patterns with complete wire-format JSON you can adapt.

## Pattern 1: Analytics Dashboard

KPI metrics on top, chart + table below.

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Column", "gap": 16,
    "children": [
      { "type": "Row", "children": [
        { "type": "Heading", "content": "Analytics Dashboard", "level": 2 },
        { "type": "Badge", "label": "Live", "variant": "success" }
      ]},
      { "type": "Row", "gap": 16, "children": [
        { "type": "Card", "children": [{ "type": "CardContent", "children": [{ "type": "Metric", "label": "Users", "value": "12,847" }]}]},
        { "type": "Card", "children": [{ "type": "CardContent", "children": [{ "type": "Metric", "label": "Revenue", "value": "$48,290" }]}]},
        { "type": "Card", "children": [{ "type": "CardContent", "children": [{ "type": "Metric", "label": "Conversion", "value": "3.2%" }]}]}
      ]},
      { "type": "Row", "gap": 16, "children": [
        { "type": "Card", "children": [
          { "type": "CardHeader", "children": [{ "type": "CardTitle", "content": "Weekly Traffic" }]},
          { "type": "CardContent", "children": [
            { "type": "LineChart",
              "data": [
                { "day": "Mon", "visitors": 1200 }, { "day": "Tue", "visitors": 1800 },
                { "day": "Wed", "visitors": 1400 }, { "day": "Thu", "visitors": 2200 },
                { "day": "Fri", "visitors": 1900 }, { "day": "Sat", "visitors": 800 },
                { "day": "Sun", "visitors": 600 }
              ],
              "series": [{ "dataKey": "visitors", "label": "Visitors", "color": "#4f46e5" }],
              "xAxis": "day", "height": 220, "showGrid": true
            }
          ]}
        ]},
        { "type": "Card", "children": [
          { "type": "CardHeader", "children": [{ "type": "CardTitle", "content": "Top Pages" }]},
          { "type": "CardContent", "children": [
            { "type": "DataTable",
              "columns": [
                { "key": "page", "header": "Page" },
                { "key": "views", "header": "Views", "sortable": true },
                { "key": "bounce", "header": "Bounce Rate" }
              ],
              "rows": [
                { "page": "/home", "views": "4,280", "bounce": "32%" },
                { "page": "/pricing", "views": "2,190", "bounce": "45%" },
                { "page": "/docs", "views": "1,890", "bounce": "22%" }
              ],
              "search": false, "paginated": false
            }
          ]}
        ]}
      ]}
    ]
  }
}
```

## Pattern 2: Detail Card with Status

Entity summary with metadata, status badges, and key-value data.

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Card",
    "children": [
      { "type": "CardHeader", "children": [
        { "type": "CardTitle", "content": "Sarah Connor" },
        { "type": "CardDescription", "content": "DOB: 1965-02-28 · MRN: 00482917" }
      ]},
      { "type": "CardContent", "children": [
        { "type": "Column", "gap": 12, "children": [
          { "type": "Row", "gap": 16, "children": [
            { "type": "Metric", "label": "Heart Rate", "value": "72 bpm" },
            { "type": "Metric", "label": "Blood Pressure", "value": "120/80" },
            { "type": "Metric", "label": "Temperature", "value": "98.6°F" }
          ]},
          { "type": "Separator" },
          { "type": "Text", "content": "Patient is in stable condition. Follow-up in 2 weeks." }
        ]}
      ]},
      { "type": "CardFooter", "children": [
        { "type": "Badge", "label": "Stable", "variant": "success" },
        { "type": "Badge", "label": "Outpatient", "variant": "secondary" },
        { "type": "Badge", "label": "Labs pending", "variant": "warning" }
      ]}
    ]
  }
}
```

## Pattern 3: Interactive Form

Form with inputs, dropdown, actions, and reactive state.

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Card",
    "children": [
      { "type": "CardHeader", "children": [
        { "type": "CardTitle", "content": "Contact Us" },
        { "type": "CardDescription", "content": "We'll get back to you within 24 hours." }
      ]},
      { "type": "CardContent", "children": [
        { "type": "Column", "gap": 12, "children": [
          { "type": "Input", "name": "name", "inputType": "text", "placeholder": "Your name" },
          { "type": "Input", "name": "email", "inputType": "email", "placeholder": "you@example.com" },
          { "type": "Select", "name": "subject", "placeholder": "Select a subject",
            "options": [
              { "label": "General Inquiry", "value": "general" },
              { "label": "Bug Report", "value": "bug" },
              { "label": "Feature Request", "value": "feature" }
            ]
          },
          { "type": "Textarea", "name": "message", "placeholder": "Your message…", "rows": 4 },
          { "type": "Row", "gap": 8, "children": [
            { "type": "Button", "label": "Send", "variant": "default",
              "onClick": { "action": "showToast", "title": "Sent!", "description": "Message submitted." }},
            { "type": "Button", "label": "Clear", "variant": "outline",
              "onClick": [
                { "action": "setState", "key": "name", "value": "" },
                { "action": "setState", "key": "email", "value": "" },
                { "action": "setState", "key": "message", "value": "" }
              ]}
          ]}
        ]}
      ]}
    ]
  },
  "state": { "name": "", "email": "", "subject": "", "message": "" }
}
```

## Pattern 4: Tabbed Settings

Multi-section settings with alerts, toggles, and selects.

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Column", "gap": 16,
    "children": [
      { "type": "Heading", "content": "Settings", "level": 2 },
      { "type": "Tabs", "name": "settings_tab", "children": [
        { "type": "Tab", "title": "General", "children": [
          { "type": "Column", "gap": 12, "children": [
            { "type": "Alert", "variant": "default", "children": [
              { "type": "AlertTitle", "content": "Heads up" },
              { "type": "AlertDescription", "content": "These settings affect your workspace." }
            ]},
            { "type": "Input", "name": "workspace_name", "inputType": "text", "placeholder": "Workspace name" },
            { "type": "Checkbox", "name": "notifications", "label": "Enable notifications" }
          ]}
        ]},
        { "type": "Tab", "title": "Security", "children": [
          { "type": "Column", "gap": 12, "children": [
            { "type": "Checkbox", "name": "2fa", "label": "Require two-factor authentication" },
            { "type": "Select", "name": "session_timeout", "placeholder": "Session timeout",
              "options": [
                { "label": "15 minutes", "value": "15" },
                { "label": "1 hour", "value": "60" },
                { "label": "8 hours", "value": "480" }
              ]}
          ]}
        ]}
      ]}
    ]
  },
  "state": { "workspace_name": "", "notifications": true, "2fa": false, "session_timeout": "60" }
}
```

## Pattern 5: Comparison Chart

Side-by-side bar chart with multiple series and metrics.

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Column", "gap": 16,
    "children": [
      { "type": "Heading", "content": "Revenue vs Costs — H1 2026", "level": 2 },
      { "type": "Row", "gap": 16, "children": [
        { "type": "Card", "children": [{ "type": "CardContent", "children": [{ "type": "Metric", "label": "Revenue", "value": "$25,580" }]}]},
        { "type": "Card", "children": [{ "type": "CardContent", "children": [{ "type": "Metric", "label": "Costs", "value": "$15,706" }]}]},
        { "type": "Card", "children": [{ "type": "CardContent", "children": [{ "type": "Metric", "label": "Profit", "value": "$9,874" }]}]}
      ]},
      { "type": "Card", "children": [
        { "type": "CardContent", "children": [
          { "type": "BarChart",
            "data": [
              { "month": "Jan", "revenue": 4000, "costs": 2400 },
              { "month": "Feb", "revenue": 3000, "costs": 1398 },
              { "month": "Mar", "revenue": 5200, "costs": 3100 },
              { "month": "Apr", "revenue": 2780, "costs": 3908 },
              { "month": "May", "revenue": 6100, "costs": 2800 },
              { "month": "Jun", "revenue": 4500, "costs": 2100 }
            ],
            "series": [
              { "dataKey": "revenue", "label": "Revenue", "color": "#4f46e5" },
              { "dataKey": "costs", "label": "Costs", "color": "#ef4444" }
            ],
            "xAxis": "month", "height": 300, "showLegend": true, "showGrid": true, "barRadius": 4
          }
        ]}
      ]}
    ]
  }
}
```

## Pattern 6: Interactive Todo with ForEach

Reactive list with add/remove using state actions.

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Card",
    "children": [
      { "type": "CardHeader", "children": [
        { "type": "CardTitle", "content": "Todo List" },
        { "type": "CardDescription", "content": "{{ state.tasks | length }} tasks" }
      ]},
      { "type": "CardContent", "children": [
        { "type": "Column", "gap": 12, "children": [
          { "type": "Row", "gap": 8, "children": [
            { "type": "Input", "name": "newTask", "placeholder": "What needs to be done?" },
            { "type": "Button", "label": "Add", "onClick": [
              { "action": "appendState", "key": "tasks", "item": "{{ state.newTask }}" },
              { "action": "setState", "key": "newTask", "value": "" }
            ]}
          ]},
          { "type": "Separator" },
          { "type": "ForEach", "each": "{{ state.tasks }}", "as": "item", "children": [
            { "type": "Row", "gap": 8, "children": [
              { "type": "Text", "content": "{{ item }}" },
              { "type": "Button", "label": "×", "variant": "ghost", "size": "sm",
                "onClick": { "action": "popState", "key": "tasks", "index": "{{ index }}" }}
            ]}
          ]}
        ]}
      ]}
    ]
  },
  "state": {
    "newTask": "",
    "tasks": ["Review PRs", "Update docs", "Deploy v2.0"]
  }
}
```

## Pattern 7: MCP Tool Integration

Form that calls an MCP tool and displays results.

```json
{
  "$prefab": { "version": "0.2" },
  "view": {
    "type": "Column", "gap": 16,
    "children": [
      { "type": "Heading", "content": "Search", "level": 2 },
      { "type": "Row", "gap": 8, "children": [
        { "type": "Input", "name": "query", "placeholder": "Search..." },
        { "type": "Button", "label": "Search", "onClick": {
          "action": "toolCall",
          "tool": "search_records",
          "arguments": { "query": "{{ state.query }}" },
          "resultKey": "results",
          "onSuccess": { "action": "setState", "key": "items", "value": "{{ result.data }}" },
          "onError": { "action": "showToast", "title": "Error", "description": "{{ error }}", "variant": "destructive" }
        }}
      ]},
      { "type": "If", "condition": "{{ state.loading }}", "children": [{ "type": "Loader" }] },
      { "type": "If", "condition": "{{ state.items | length > 0 }}", "children": [
        { "type": "DataTable",
          "columns": [
            { "key": "name", "header": "Name", "sortable": true },
            { "key": "type", "header": "Type" },
            { "key": "updated", "header": "Updated", "format": "date" }
          ],
          "rows": "{{ state.items }}",
          "search": false
        }
      ]}
    ]
  },
  "state": { "query": "", "items": [], "loading": false }
}
```

## Anti-Patterns to Avoid

1. **Missing envelope** — Always wrap in `{ "$prefab": { "version": "0.2" }, "view": { ... } }`
2. **Flat layout** — Don't put 10 children at root level. Group into Cards/Rows/Columns.
3. **Missing state** — If you use `{{ state.x }}`, declare `x` in `"state"`
4. **camelCase types** — Wrong: `"type": "dataTable"` → Right: `"type": "DataTable"`
5. **Orphan options** — `SelectOption` must be inside `Select.children` (or use `options` shorthand)
6. **Giant JSON** — Keep responses under ~200 components. Split into pages if larger.
