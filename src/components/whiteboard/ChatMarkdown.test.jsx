// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import ChatMarkdown, { parseMarkdown } from './ChatMarkdown'

afterEach(cleanup)

const kinds = (src) => parseMarkdown(src).map((b) => b.kind)

describe('parseMarkdown', () => {
  it('splits paragraphs on blank lines and keeps soft wraps inside one', () => {
    const blocks = parseMarkdown('First thought.\nstill the first\n\nSecond thought.')
    expect(kinds('First thought.\nstill the first\n\nSecond thought.')).toEqual(['p', 'p'])
    expect(blocks[0].text).toBe('First thought.\nstill the first')
    expect(blocks[1].text).toBe('Second thought.')
  })

  it('reads a bullet list as one block, whichever marker it uses', () => {
    const [list] = parseMarkdown('- one\n* two\n• three')
    expect(list).toEqual({ kind: 'list', ordered: false, items: ['one', 'two', 'three'] })
  })

  it('reads a numbered list as ordered, dropping the numbering', () => {
    const [list] = parseMarkdown('1. first\n2) second')
    expect(list).toEqual({ kind: 'list', ordered: true, items: ['first', 'second'] })
  })

  it('starts a new block when the list changes kind', () => {
    expect(kinds('- one\n1. two')).toEqual(['list', 'list'])
  })

  it('folds a wrapped line into the item it continues', () => {
    const [list] = parseMarkdown('- a finding that runs\n  onto a second line\n- the next one')
    expect(list.items).toEqual(['a finding that runs onto a second line', 'the next one'])
  })

  it('reads a GFM table, taking the divider row as what makes a header', () => {
    const [table] = parseMarkdown('| Topic | What I need |\n|---|---|\n| **Use case** | SIEM or search? |\n| Retention | Days per tier |')
    expect(table.kind).toBe('table')
    expect(table.header).toEqual(['Topic', 'What I need'])
    expect(table.rows).toEqual([['**Use case**', 'SIEM or search?'], ['Retention', 'Days per tier']])
  })

  it('reads a headerless run of rows as a table with no header', () => {
    const [table] = parseMarkdown('| hot | 8 nodes |\n| warm | 4 nodes |')
    expect(table.header).toBeNull()
    expect(table.rows).toHaveLength(2)
  })

  it('ends the table at the first line that is not a row', () => {
    expect(kinds('| a | b |\n|---|---|\n| c | d |\nplain prose after')).toEqual(['table', 'p'])
  })

  it('takes any heading level as a heading, without the hashes', () => {
    expect(parseMarkdown('## Missing pieces')).toEqual([{ kind: 'h', text: 'Missing pieces' }])
    expect(parseMarkdown('###### deep')).toEqual([{ kind: 'h', text: 'deep' }])
  })

  it('keeps a fenced block verbatim, blank lines and markers included', () => {
    const [code] = parseMarkdown('```json\n{ "a": 1 }\n\n**not bold**\n```')
    expect(code).toEqual({ kind: 'code', text: '{ "a": 1 }\n\n**not bold**' })
  })

  it('still shows the content of an unterminated fence', () => {
    expect(parseMarkdown('```\nGET _cat/nodes')).toEqual([{ kind: 'code', text: 'GET _cat/nodes' }])
  })

  it('is empty for nothing at all', () => {
    expect(parseMarkdown('')).toEqual([])
    expect(parseMarkdown(undefined)).toEqual([])
    expect(parseMarkdown('\n\n  \n')).toEqual([])
  })
})

describe('ChatMarkdown', () => {
  const md = (text) => render(<ChatMarkdown text={text} />).container

  it('renders bold, italic, and inline code as elements', () => {
    const el = md('The **hot tier** holds `data_hot` and is *fast*.')
    expect(el.querySelector('strong').textContent).toBe('hot tier')
    expect(el.querySelector('code').textContent).toBe('data_hot')
    expect(el.querySelector('em').textContent).toBe('fast')
    expect(el.textContent).toBe('The hot tier holds data_hot and is fast.')
  })

  it('renders a heading and a bullet list the way the model writes a review', () => {
    const el = md('**Missing pieces**\n\n- **No entry point.** There is no Kibana.\n- Two data nodes.')
    expect(el.querySelectorAll('ul li').length).toBe(2)
    expect(el.querySelector('ul li strong').textContent).toBe('No entry point.')
    expect(el.querySelector('ol')).toBe(null)
  })

  it('renders an ordered list as an ordered list', () => {
    expect(md('1. size it\n2. draw it').querySelectorAll('ol li').length).toBe(2)
  })

  it('leaves unpaired markers as the characters they are', () => {
    const el = md('A 2 * 3 node grid, 40% of ILM_POLICY_NAME, and a lone `tick')
    expect(el.querySelector('em')).toBe(null)
    expect(el.querySelector('code')).toBe(null)
    expect(el.textContent).toBe('A 2 * 3 node grid, 40% of ILM_POLICY_NAME, and a lone `tick')
  })

  it('renders a table as a table, inline markup and all', () => {
    const el = md('| Topic | What I need |\n|---|---|\n| **Use case** | SIEM or search? |')
    expect(el.querySelectorAll('th').length).toBe(2)
    expect(el.querySelector('td strong').textContent).toBe('Use case')
    expect(el.textContent).not.toContain('|')
  })

  it('builds elements rather than HTML, so a reply cannot inject markup', () => {
    const el = md('<img src=x onerror="boom"> and <b>bold?</b>')
    expect(el.querySelector('img')).toBe(null)
    expect(el.querySelector('b')).toBe(null)
    expect(el.textContent).toBe('<img src=x onerror="boom"> and <b>bold?</b>')
  })
})
