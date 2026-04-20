/**
 * Component tests — layout, typography, data, form, interactive, control flow
 */

import { describe, it, expect } from 'bun:test'
import {
  Column, Grid, GridItem, Div, Span, Container,
} from '../src/components/layout'
import {
  Heading, H1, H2, Text, Muted, Code, Markdown, Link, Kbd,
} from '../src/components/typography'
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from '../src/components/card'
import {
  DataTable, col, Badge, Metric, Separator, Progress, Icon,
} from '../src/components/data'
import {
  Form, Input, Button, Select, SelectOption, Checkbox, Slider,
} from '../src/components/form'
import {
  Tabs, Tab, Accordion, AccordionItem, Dialog,
} from '../src/components/interactive'
import { ForEach, If, Else } from '../src/components/control'
import { Alert, AlertTitle, AlertDescription } from '../src/components/alert'
import { Image, Mermaid } from '../src/components/media'
import { CallTool } from '../src/actions/mcp'
import { ShowToast, SetState } from '../src/actions/client'
import { rx } from '../src/rx/rx'

describe('Layout', () => {
  it('Column with gap and children', () => {
    const c = Column({ gap: 6, children: [Heading('Hi')] })
    const json = c.toJSON()
    expect(json.type).toBe('Column')
    expect(json.cssClass).toContain('gap-6')
    expect(json.children).toHaveLength(1)
    expect(json.children![0].type).toBe('Heading')
  })

  it('Grid with responsive columns', () => {
    const c = Grid({ columns: { sm: 1, md: 2, lg: 3 } })
    const json = c.toJSON()
    expect(json.columns).toEqual({ sm: 1, md: 2, lg: 3 })
  })

  it('GridItem with span', () => {
    const json = GridItem({ colSpan: 2, rowSpan: 1 }).toJSON()
    expect(json.colSpan).toBe(2)
    expect(json.rowSpan).toBe(1)
  })

  it('Div / Span / Container produce correct types', () => {
    expect(Div().toJSON().type).toBe('Div')
    expect(Span().toJSON().type).toBe('Span')
    expect(Container().toJSON().type).toBe('Container')
  })
})

describe('Typography', () => {
  it('Heading with level', () => {
    const json = Heading('Welcome', { level: 2 }).toJSON()
    expect(json.type).toBe('Heading')
    expect(json.content).toBe('Welcome')
    expect(json.level).toBe(2)
  })

  it('H1-H4 shortcuts', () => {
    expect(H1('Title').toJSON().level).toBe(1)
    expect(H2('Subtitle').toJSON().level).toBe(2)
  })

  it('Text with bold', () => {
    const json = Text('Important', { bold: true }).toJSON()
    expect(json.bold).toBe(true)
  })

  it('Muted', () => {
    const json = Muted('Secondary text').toJSON()
    expect(json.type).toBe('Muted')
    expect(json.content).toBe('Secondary text')
  })

  it('Link', () => {
    const json = Link('Click me', { href: 'https://example.com', target: '_blank' }).toJSON()
    expect(json.href).toBe('https://example.com')
    expect(json.target).toBe('_blank')
  })

  it('Code', () => {
    expect(Code('const x = 1').toJSON().content).toBe('const x = 1')
  })

  it('Markdown', () => {
    expect(Markdown('# Hello').toJSON().type).toBe('Markdown')
  })

  it('Kbd', () => {
    const json = Kbd('Ctrl+C').toJSON()
    expect(json.type).toBe('Kbd')
    expect(json.label).toBe('Ctrl+C')
  })
})

describe('Card', () => {
  it('full card structure', () => {
    const card = Card({
      children: [
        CardHeader({ children: [CardTitle('Users')] }),
        CardContent({ children: [Text('Content here')] }),
        CardFooter({ children: [Button('Save')] }),
      ],
    })
    const json = card.toJSON()
    expect(json.type).toBe('Card')
    expect(json.children).toHaveLength(3)
    expect(json.children![0].type).toBe('CardHeader')
    expect(json.children![0].children![0].type).toBe('CardTitle')
  })
})

describe('Data Display', () => {
  it('DataTable with columns and search', () => {
    const json = DataTable({
      rows: [{ name: 'John', age: 30 }],
      columns: [col('name', 'Name', { sortable: true }), col('age', 'Age')],
      search: true,
    }).toJSON()
    expect(json.type).toBe('DataTable')
    expect(json.columns).toHaveLength(2)
    expect((json.columns as { sortable?: boolean }[])[0].sortable).toBe(true)
    expect(json.search).toBe(true)
  })

  it('DataTable with reactive rows', () => {
    const json = DataTable({
      rows: rx('users'),
      columns: [col('name')],
    }).toJSON()
    expect(json.rows).toBe('{{ users }}')
  })

  it('Badge with variant', () => {
    const json = Badge('5 items', { variant: 'outline' }).toJSON()
    expect(json.label).toBe('5 items')
    expect(json.variant).toBe('outline')
  })

  it('Metric', () => {
    const json = Metric({ label: 'Users', value: '1,234', delta: '+12%', trend: 'up' }).toJSON()
    expect(json.label).toBe('Users')
    expect(json.value).toBe('1,234')
    expect(json.trend).toBe('up')
  })

  it('Separator', () => {
    expect(Separator().toJSON().type).toBe('Separator')
  })

  it('Progress', () => {
    const json = Progress({ value: 75, max: 100 }).toJSON()
    expect(json.value).toBe(75)
    expect(json.max).toBe(100)
  })

  it('Icon', () => {
    expect(Icon('settings').toJSON().name).toBe('settings')
  })
})

describe('Form', () => {
  it('Form with onSubmit CallTool', () => {
    const form = Form({
      onSubmit: new CallTool('create_user', {
        onSuccess: new ShowToast('Created!', { variant: 'success' }),
      }),
      children: [
        Input({ name: 'username', label: 'Username', required: true }),
        Button('Submit'),
      ],
    })
    const json = form.toJSON()
    expect(json.type).toBe('Form')
    expect((json.onSubmit as { action: string }).action).toBe('toolCall')
    expect(json.children).toHaveLength(2)
  })

  it('Input with all props', () => {
    const json = Input({ name: 'email', label: 'Email', inputType: 'email', required: true }).toJSON()
    expect(json.name).toBe('email')
    expect(json.label).toBe('Email')
    expect(json.inputType).toBe('email')
    expect(json.required).toBe(true)
  })

  it('Button with onClick', () => {
    const json = Button('Click', { onClick: new SetState('count', 0) }).toJSON()
    expect(json.label).toBe('Click')
    expect((json.onClick as { action: string }).action).toBe('setState')
  })

  it('Select with options', () => {
    const sel = Select({
      name: 'role',
      children: [SelectOption('admin', 'Admin'), SelectOption('user', 'User')],
    })
    const json = sel.toJSON()
    expect(json.type).toBe('Select')
    expect(json.name).toBe('role')
    expect(json.children).toHaveLength(2)
  })

  it('Checkbox', () => {
    const json = Checkbox({ name: 'agree', label: 'I agree', checked: false }).toJSON()
    expect(json.name).toBe('agree')
    expect(json.checked).toBe(false)
  })

  it('Slider', () => {
    const json = Slider({ name: 'volume', min: 0, max: 100, step: 5 }).toJSON()
    expect(json.min).toBe(0)
    expect(json.max).toBe(100)
    expect(json.step).toBe(5)
  })
})

describe('Interactive', () => {
  it('Tabs with Tab children', () => {
    const tabs = Tabs({
      children: [
        Tab({ title: 'Overview', children: [Text('Content 1')] }),
        Tab({ title: 'Details', children: [Text('Content 2')] }),
      ],
    })
    const json = tabs.toJSON()
    expect(json.children).toHaveLength(2)
    expect(json.children![0].title).toBe('Overview')
  })

  it('Accordion', () => {
    const acc = Accordion({
      children: [AccordionItem({ title: 'Section 1', children: [Text('Body')] })],
    })
    expect(acc.toJSON().children![0].title).toBe('Section 1')
  })

  it('Dialog', () => {
    const json = Dialog({ title: 'Confirm', description: 'Are you sure?', dismissible: true }).toJSON()
    expect(json.title).toBe('Confirm')
    expect(json.dismissible).toBe(true)
  })
})

describe('Control Flow', () => {
  it('ForEach', () => {
    const json = ForEach({ expression: rx('items'), children: [Text('item')] }).toJSON()
    expect(json.type).toBe('ForEach')
    expect(json.expression).toBe('{{ items }}')
  })

  it('If / Else', () => {
    const ifJson = If({ condition: rx('active'), children: [Text('Active')] }).toJSON()
    expect(ifJson.condition).toBe('{{ active }}')

    const elseJson = Else({ children: [Text('Inactive')] }).toJSON()
    expect(elseJson.type).toBe('Else')
  })
})

describe('Alert', () => {
  it('Alert with title and description', () => {
    const a = Alert({
      variant: 'destructive',
      children: [AlertTitle('Error'), AlertDescription('Something went wrong')],
    })
    const json = a.toJSON()
    expect(json.variant).toBe('destructive')
    expect(json.children![0].content).toBe('Error')
  })
})

describe('Media', () => {
  it('Image', () => {
    const json = Image({ src: '/photo.png', alt: 'A photo' }).toJSON()
    expect(json.src).toBe('/photo.png')
    expect(json.alt).toBe('A photo')
  })

  it('Mermaid', () => {
    const json = Mermaid('graph TD; A-->B').toJSON()
    expect(json.type).toBe('Mermaid')
    expect(json.content).toBe('graph TD; A-->B')
  })
})
