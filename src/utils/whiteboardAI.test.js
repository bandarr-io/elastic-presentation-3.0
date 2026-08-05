import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  summaryPrompt, describeDoc, describeSections, buildCatalog, buildTool, systemPrompt,
  toConverseMessages, toConverseTools, callBedrock, callBedrockText, runLLM,
} from './whiteboardAI'
import { TYPES } from '../data/whiteboardTypes'
import { TEMPLATES, buildFromSections, defaultFill } from '../data/whiteboardTemplates'

const totals = {
  count: 8, cpu: 128, mem: 512, storageTB: 40,
  tiers: [{ label: 'Hot', count: 6, storageTB: 12 }, { label: 'Frozen', count: 2, storageTB: 28 }],
}

describe('summaryPrompt', () => {
  it('leads with the board name and its description', () => {
    const prompt = summaryPrompt({ boardName: 'Acme SIEM', board: 'Zones:\n  "Cluster": Hot Tier' })
    expect(prompt.startsWith('BOARD: Acme SIEM')).toBe(true)
    expect(prompt).toContain('"Cluster": Hot Tier')
  })

  it('includes the sizing rollup and the tier breakdown', () => {
    const prompt = summaryPrompt({ board: '', totals })
    expect(prompt).toContain('8 nodes, 128 vCPU, 512 GB RAM')
    expect(prompt).toContain('Hot: 6 nodes, Frozen: 2 nodes')
    expect(prompt).toContain('40.0 TB')
  })

  it('leaves the sizing section out when nothing is sized', () => {
    expect(summaryPrompt({ board: '', totals: { count: 0, tiers: [] } })).not.toContain('SIZING')
    expect(summaryPrompt({ board: '' })).not.toContain('SIZING')
  })

  it('passes the review findings through with their level', () => {
    const prompt = summaryPrompt({
      board: '',
      warnings: [{ level: 'warn', title: 'Only 1 master', detail: 'Needs three.' }],
    })
    expect(prompt).toContain('[warn] Only 1 master: Needs three.')
  })

  it('omits the findings section when the review is clean', () => {
    expect(summaryPrompt({ board: '', warnings: [] })).not.toContain('REVIEW FINDINGS')
  })

  it('names an untitled board rather than leaving a blank', () => {
    expect(summaryPrompt({ board: '' })).toContain('BOARD: Untitled')
  })
})

describe('Bedrock Converse plumbing', () => {
  afterEach(() => vi.unstubAllGlobals())

  const creds = {
    region: 'us-west-2', model: 'global.anthropic.claude-sonnet-4-6',
    accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'secret',
  }
  const mockFetch = (body, ok = true, status = 200) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('converts chat history to Converse content blocks', () => {
    expect(toConverseMessages([{ role: 'user', content: 'hi' }]))
      .toEqual([{ role: 'user', content: [{ text: 'hi' }] }])
  })

  it('wraps tool definitions as Converse toolSpecs', () => {
    const [spec] = toConverseTools([{ name: 'edit_whiteboard', description: 'd', input_schema: { type: 'object' } }])
    expect(spec.toolSpec.name).toBe('edit_whiteboard')
    expect(spec.toolSpec.inputSchema.json).toEqual({ type: 'object' })
  })

  it('sends a signed, tool-forced Converse request and returns the tool input', async () => {
    const fetchMock = mockFetch({
      output: { message: { content: [{ toolUse: { name: 'edit_whiteboard', input: { message: 'built' } } }] } },
    })
    const out = await callBedrock({
      ...creds, system: 'sys', messages: [{ role: 'user', content: 'design a SIEM' }],
      tools: [{ name: 'edit_whiteboard', description: 'd', input_schema: { type: 'object' } }],
    })
    expect(out).toEqual({ message: 'built' })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://bedrock-runtime.us-west-2.amazonaws.com/model/global.anthropic.claude-sonnet-4-6/converse')
    expect(opts.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-west-2\/bedrock\/aws4_request/)
    const body = JSON.parse(opts.body)
    expect(body.toolConfig.toolChoice).toEqual({ tool: { name: 'edit_whiteboard' } })
    expect(body.system).toEqual([{ text: 'sys' }])
  })

  it('reads prose out of the Converse response text blocks', async () => {
    mockFetch({ output: { message: { content: [{ text: 'A note.' }, { text: ' More.' }] } } })
    await expect(callBedrockText({ ...creds, system: 's', messages: [] })).resolves.toBe('A note. More.')
  })

  it('surfaces Bedrock error messages readably', async () => {
    mockFetch({ message: 'The provided model identifier is invalid.' }, false, 400)
    await expect(callBedrockText({ ...creds, system: 's', messages: [] }))
      .rejects.toThrow(/model identifier is invalid.*us-west-2/s)
  })

  it('refuses to run without an AWS key pair', async () => {
    await expect(runLLM({ region: 'us-east-1' }, {}, { text: true }))
      .rejects.toThrow(/AWS access key/)
  })
})

describe('describeDoc', () => {
  it('reports an empty board plainly', () => {
    expect(describeDoc({}, TYPES)).toBe('(the board is currently empty)')
  })

  it('groups nodes under the zone that contains them', () => {
    const doc = {
      zones: [{ id: 'z', x: 0, y: 0, w: 400, h: 400, label: 'Cluster' }],
      nodes: [{ id: 'n', type: 'tier_hot', x: 10, y: 10 }, { id: 'o', type: 'kibana', x: 900, y: 900 }],
      edges: [{ s: 'n', e: 'o', lbl: 'queries' }],
    }
    const out = describeDoc(doc, TYPES)
    expect(out).toContain('"Cluster": Hot Tier')
    expect(out).toContain('Ungrouped nodes: Kibana')
    expect(out).toContain('Hot Tier -> Kibana (queries)')
  })

  it('surfaces the props set on a node so an edit preserves its numbers', () => {
    const doc = {
      zones: [{ id: 'z', x: 0, y: 0, w: 400, h: 400, label: 'Cluster' }],
      nodes: [
        { id: 'n', type: 'tier_hot', x: 10, y: 10, props: { nodes: 6, capacity: '12 TB' } },
        { id: 's', type: 'source', x: 900, y: 900, title: 'Web tier',
          props: { integration: 'Apache HTTP Server', ingest: 300 } },
      ],
    }
    const out = describeDoc(doc, TYPES)
    // node counts and hardware come through with their units…
    expect(out).toContain('Hot Tier [6 nodes, 12 TB]')
    // …as do a source's title, integration, and ingest volume
    expect(out).toContain('Data Source "Web tier" [Apache HTTP Server, 300 GB/day]')
  })

  it('leaves an unsized node as a bare label (no empty brackets)', () => {
    const out = describeDoc({ nodes: [{ id: 'n', type: 'kibana', x: 0, y: 0 }] }, TYPES)
    expect(out).toContain('Kibana')
    expect(out).not.toContain('Kibana [')
  })
})

describe('describeSections', () => {
  it('lists tracked sections with template, fill, and per-slot props', () => {
    const out = describeSections({
      cluster1: { template: 'cluster', fill: { label: 'SIEM', tiers: ['hot', 'frozen'] },
        props: { hot: { nodes: 6, mem: 64 } } },
    })
    expect(out).toContain('cluster1: cluster "SIEM"')
    expect(out).toContain('tiers=[hot,frozen]')
    expect(out).toContain('props{ hot: nodes=6 mem=64 }')
  })

  it('omits the props clause for a section that carries none', () => {
    const out = describeSections({ u: { template: 'userSpace', fill: {} } })
    expect(out).not.toContain('props{')
  })
})

describe('buildCatalog', () => {
  const catalog = buildCatalog(TYPES)

  it('annotates numeric fields with their unit so the model knows the scale', () => {
    // a Data Source: ingest is GB/day, retention is in days
    expect(catalog).toContain('ingest:num GB/day')
    expect(catalog).toContain('retention:num days')
    expect(catalog).toContain('users:num users')
  })

  it('enumerates the options of a select field', () => {
    // Elastic Defend's protection mode is a two-value enum
    expect(catalog).toContain('mode(Detect|Prevent)')
  })

  it('marks toggles as booleans', () => {
    expect(catalog).toContain('ml:bool')
  })

  it('points integration search fields at the catalog without inlining it', () => {
    expect(catalog).toContain('integration(Elastic integration name)')
    // the ~384 integration titles must not be dumped into every prompt
    expect(catalog).not.toContain('1Password')
  })
})

describe('buildTool schema', () => {
  const tool = buildTool()[0]
  const section = tool.input_schema.properties.sections.items.properties
  const edge = tool.input_schema.properties.edges.items.properties

  it('lets the model set node props on a section', () => {
    expect(section.props.type).toBe('object')
    expect(section.props.description).toMatch(/slot/i)
  })

  it('exposes the below placement relationship', () => {
    expect(section.below.type).toBe('string')
    expect(section.below.description).toMatch(/beneath|below|under/i)
  })

  it('exposes zone-pinned flags on both ends of an edge', () => {
    expect(edge.sourceZone.type).toBe('boolean')
    expect(edge.targetZone.type).toBe('boolean')
    expect(edge.sourceZone.description).toMatch(/zone/i)
  })

  it('documents every template the builder supports', () => {
    // fails the moment a template is added to TEMPLATES without documenting it
    expect(section.template.enum).toEqual(Object.keys(TEMPLATES))
    for (const id of Object.keys(TEMPLATES))
      expect(section.template.description).toContain(`- ${id}:`)
  })
})

describe('systemPrompt cluster guidance', () => {
  const prompt = systemPrompt('CATALOG', 'DOC')
  const df = defaultFill('cluster')

  it('matches the app default: no ingest/coord/master, object storage on', () => {
    // the guidance must agree with what the Patterns sidebar produces
    expect(df).toMatchObject({ ingest: false, coord: false, master: false, objectStorage: true })
    expect(prompt).not.toMatch(/ingest\/coord\/master by default/)
    expect(prompt).toMatch(/ingest and coord OFF/)
    expect(prompt).toMatch(/objectStorage on/)
  })

  it('states the six-node rule for dedicated masters', () => {
    expect(prompt).toMatch(/six or more nodes/)
  })
})

describe('section round trip through buildFromSections', () => {
  const sections = [
    { id: 'cluster1', template: 'cluster', fill: { tiers: ['hot', 'frozen'], objectStorage: true },
      props: { hot: { nodes: 7, mem: 64 } } },
    { id: 'user1', template: 'userSpace', fill: { consumers: ['kibana', 'users'] } },
    { id: 'mon1', template: 'management', below: 'user1', fill: { tools: ['monitoring'] } },
  ]
  const edges = [{ source: 'cluster1', target: 'mon1', label: 'stack monitoring', sourceZone: true }]
  const board = buildFromSections(sections, edges)

  it('lands section props on the built nodes', () => {
    const hot = board.nodes.find((n) => n.id === 'cluster1__hot')
    expect(hot.props).toEqual({ nodes: 7, mem: 64 })
    // and the props ride along in meta for the next incremental edit
    expect(board.meta.cluster1.props).toEqual({ hot: { nodes: 7, mem: 64 } })
  })

  it('hangs a `below` section directly under its host zone', () => {
    const uz = board.zones.find((z) => z.id === 'user1__zone')
    const mz = board.zones.find((z) => z.id === 'mon1__zone')
    expect(mz.x).toBe(uz.x)
    expect(mz.y).toBeGreaterThan(uz.y + uz.h)
    // the management node itself made it onto the board
    expect(board.nodes.some((n) => n.id === 'mon1__mgmt0')).toBe(true)
  })

  it('pins a zone-flagged edge to the whole zone box, not a port node', () => {
    const e = board.edges.find((ed) => ed.lbl === 'stack monitoring')
    expect(e.s).toBe('cluster1__zone')
    expect(e.e).toBe('mon1__zone')
  })
})
