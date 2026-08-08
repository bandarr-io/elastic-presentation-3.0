import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  summaryPrompt, describeDoc, describeSections, describeFindings, buildCatalog, buildTool,
  systemPrompt, systemInstructions, boardContext, chatSystem,
  toConverseMessages, toConverseTools, toConverseSystem,
  callBedrock, callBedrockText, runLLM, runToolLoop, TOOL_LOOP_MAX_TURNS,
  SUMMARY_PROMPTS, SUMMARY_DEFAULT, SUMMARY_SYSTEM, summarySystem,
  FOLLOWUP_SYSTEM, followupPrompt,
} from './whiteboardAI'
import { TYPES } from '../data/whiteboardTypes'
import { TEMPLATES, buildFromSections, defaultFill } from '../data/whiteboardTemplates'
import { SIZING_TIERS, LICENSE_ERU, LICENSE_ECU } from './whiteboardSizing'

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

describe('followupPrompt', () => {
  it('builds on the summary facts: board, sizing, findings', () => {
    const prompt = followupPrompt({
      boardName: 'Acme SIEM', board: 'Zones:\n  "Cluster": Hot Tier', totals,
      warnings: [{ level: 'warn', title: 'Only 1 master', detail: 'Needs three.' }],
    })
    expect(prompt.startsWith('BOARD: Acme SIEM')).toBe(true)
    expect(prompt).toContain('8 nodes, 128 vCPU, 512 GB RAM')
    expect(prompt).toContain('[warn] Only 1 master: Needs three.')
  })

  it('carries the session transcript with roles, clipped to a sane length', () => {
    const prompt = followupPrompt({
      board: '',
      transcript: [
        { role: 'user', text: 'Can we go frozen after 30 days?' },
        { role: 'ai', text: 'x'.repeat(2000) },
      ],
    })
    expect(prompt).toContain('CONVERSATION')
    expect(prompt).toContain('architect: Can we go frozen after 30 days?')
    expect(prompt).toContain('assistant: ' + 'x'.repeat(600) + ' …')
    expect(prompt).not.toContain('x'.repeat(700))
  })

  it('names the account and opportunity, and only those customer fields', () => {
    const prompt = followupPrompt({
      board: '',
      customer: { account: 'Acme Corp', opportunity: 'Acme Expansion FY27', value: 250000 },
    })
    expect(prompt).toContain('account — Acme Corp')
    expect(prompt).toContain('opportunity — Acme Expansion FY27')
    expect(prompt).not.toContain('250000')          // deal value never reaches this prompt
  })

  it('keeps the system brief customer-facing', () => {
    expect(FOLLOWUP_SYSTEM).toContain('## heading')
    expect(FOLLOWUP_SYSTEM).toMatch(/never invent/i)
    expect(FOLLOWUP_SYSTEM).toMatch(/deal value/i)
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

  const tools = [{ name: 'edit_whiteboard', description: 'd', input_schema: { type: 'object' } }]

  it('sends a signed Converse request with the tools offered, not forced', async () => {
    const fetchMock = mockFetch({
      output: { message: { content: [{ toolUse: { name: 'edit_whiteboard', input: { message: 'built' } } }] } },
    })
    const out = await callBedrock({
      ...creds, system: 'sys', messages: [{ role: 'user', content: 'design a SIEM' }], tools,
    })
    expect(out.toolUse.input).toEqual({ message: 'built' })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://bedrock-runtime.us-west-2.amazonaws.com/model/global.anthropic.claude-sonnet-4-6/converse')
    expect(opts.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-west-2\/bedrock\/aws4_request/)
    const body = JSON.parse(opts.body)
    // a forced tool could never answer a question
    expect(body.toolConfig.toolChoice).toEqual({ auto: {} })
    expect(body.system).toEqual([{ text: 'sys' }])
  })

  it('reads a turn that only answers, without a tool call', async () => {
    mockFetch({ output: { message: { content: [{ text: 'Three masters, always.' }] } } })
    const out = await callBedrock({ ...creds, system: 'sys', messages: [], tools })
    expect(out.text).toBe('Three masters, always.')
    expect(out.toolUse).toBeNull()
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

  /* The retry pause is scheduled only after signing and the first fetch have
     settled, so a single "run all timers" lands on an empty queue. Stepping
     the fake clock flushes microtasks between steps and picks the pause up
     whenever it appears. */
  const stepClockUntil = async (done) => {
    for (let i = 0; i < 50 && !done(); i++) await vi.advanceTimersByTimeAsync(200)
  }

  it('rides out a throttled call: pauses, retries, and succeeds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ message: 'Too many requests' }) })
      .mockResolvedValueOnce({ ok: true, status: 200,
        json: async () => ({ output: { message: { content: [{ text: 'OK' }] } } }) })
    vi.stubGlobal('fetch', fetchMock)

    const retries = []
    const pending = callBedrock({ ...creds, onRetry: (r) => retries.push(r), system: 's', messages: [] })
    await stepClockUntil(() => fetchMock.mock.calls.length >= 2)
    expect((await pending).text).toBe('OK')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(retries).toEqual([{ status: 429, attempt: 1 }])
    vi.useRealTimers()
  })

  it('gives up once throttling outlasts the retry budget, and says so', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false, status: 429, json: async () => ({ message: 'Too many requests' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const outcome = expect(callBedrockText({ ...creds, system: 's', messages: [] }))
      .rejects.toThrow(/Too many requests.*rate-limiting/s)
    await stepClockUntil(() => fetchMock.mock.calls.length >= 3)
    await outcome
    expect(fetchMock).toHaveBeenCalledTimes(3)   // first try + two retries
    vi.useRealTimers()
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

  it('lets a design target a named side board, for alternatives drawn side by side', () => {
    expect(tool.input_schema.properties.board.type).toBe('string')
    expect(tool.input_schema.properties.board.description).toMatch(/alternatives to compare/)
    expect(tool.input_schema.properties.board.description).toMatch(/no Apply step/)
    // and the prompt says when to reach for it
    expect(systemInstructions('CAT')).toMatch(/one edit_whiteboard call per design/)
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

describe('the tool loop', () => {
  afterEach(() => vi.unstubAllGlobals())

  const creds = { region: 'us-east-1', model: 'm', accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 's' }
  /* one queued Converse response per turn */
  const mockTurns = (...bodies) => {
    const fetchMock = vi.fn()
    for (const body of bodies) fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body })
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => bodies[bodies.length - 1] })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }
  const turn = (content, usage) => ({ output: { message: { content } }, ...(usage ? { usage } : {}) })
  const toolTurn = (name, input) => turn([{ toolUse: { toolUseId: 't1', name, input } }])

  it('hands a tool result back and returns the narration that follows', async () => {
    const fetchMock = mockTurns(
      toolTurn('edit_whiteboard', { message: 'building' }),
      turn([{ text: 'Staged a three-tier cluster.' }]))
    const onToolUse = vi.fn().mockReturnValue({ ok: true, added: ['Elastic Cluster'] })

    const out = await runToolLoop({ ...creds, system: 'sys', messages: [{ role: 'user', content: 'draw it' }],
                                    tools: [], onToolUse })
    expect(out.text).toBe('Staged a three-tier cluster.')
    expect(out.calls).toEqual([{ name: 'edit_whiteboard', input: { message: 'building' },
                                 result: { ok: true, added: ['Elastic Cluster'] } }])
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // the second call carries the assistant's toolUse and our toolResult
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(sent.messages).toHaveLength(3)
    expect(sent.messages[1].role).toBe('assistant')
    expect(sent.messages[1].content[0].toolUse.name).toBe('edit_whiteboard')
    const result = sent.messages[2].content[0].toolResult
    expect(result.toolUseId).toBe('t1')
    expect(JSON.parse(result.content[0].text)).toEqual({ ok: true, added: ['Elastic Cluster'] })
    expect(result.status).toBeUndefined()
  })

  it('marks a failed tool result as an error for the model', async () => {
    const fetchMock = mockTurns(toolTurn('size_deployment', {}), turn([{ text: 'I need a volume.' }]))
    await runToolLoop({ ...creds, system: 'sys', messages: [], tools: [],
                        onToolUse: () => ({ ok: false, error: 'Nothing to size.' }) })
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(sent.messages[1].content[0].toolResult.status).toBe('error')
  })

  it('answers without calling anything, leaving the tool dispatcher alone', async () => {
    const onToolUse = vi.fn()
    const fetchMock = mockTurns(turn([{ text: 'Three, so a quorum survives one loss.' }]))
    const out = await runToolLoop({ ...creds, system: 'sys', messages: [], tools: [], onToolUse })
    expect(out.text).toBe('Three, so a quorum survives one loss.')
    expect(out.calls).toEqual([])
    expect(onToolUse).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('streams the steps of the turn as they happen', async () => {
    mockTurns(
      toolTurn('search_knowledge', { query: 'retention' }),
      turn([{ text: 'Thirteen months, per the requirements.' }]))
    const steps = []
    await runToolLoop({ ...creds, system: 'sys', messages: [], tools: [],
                        onToolUse: () => ({ ok: true }), onStep: (s) => steps.push(s) })
    expect(steps).toEqual([
      { kind: 'model', turn: 0 },
      { kind: 'tool', name: 'search_knowledge', input: { query: 'retention' } },
      { kind: 'result', name: 'search_knowledge', ok: true },
      { kind: 'model', turn: 1 },
    ])
  })

  /* Bedrock rejects the whole conversation ("Expected toolResult blocks at
     messages.N.content") if any toolUse Id goes unanswered, so a turn that
     asks for two tools gets two results back in the same user message. */
  it('answers every tool the model asks for in one turn', async () => {
    const fetchMock = mockTurns(
      turn([
        { toolUse: { toolUseId: 't1', name: 'search_knowledge', input: { query: 'hot tier ratio' } } },
        { toolUse: { toolUseId: 't2', name: 'size_deployment', input: { dailyGB: 1000 } } },
      ]),
      turn([{ text: 'Sized for the spike.' }]))
    const onToolUse = vi.fn((use) => ({ ok: true, tool: use.name }))

    const out = await runToolLoop({ ...creds, system: 'sys', messages: [], tools: [], onToolUse })
    expect(out.calls.map((c) => c.name)).toEqual(['search_knowledge', 'size_deployment'])
    expect(onToolUse).toHaveBeenCalledTimes(2)

    const sent = JSON.parse(fetchMock.mock.calls[1][1].body)
    const answered = sent.messages[1].content.map((c) => c.toolResult.toolUseId)
    expect(answered).toEqual(['t1', 't2'])
  })

  it('marks a failed tool in the step stream', async () => {
    mockTurns(toolTurn('size_deployment', {}), turn([{ text: 'I need a volume.' }]))
    const steps = []
    await runToolLoop({ ...creds, system: 'sys', messages: [], tools: [],
                        onToolUse: () => ({ ok: false, error: 'Nothing to size.' }),
                        onStep: (s) => steps.push(s) })
    expect(steps.find((s) => s.kind === 'result')).toEqual(
      { kind: 'result', name: 'size_deployment', ok: false })
  })

  it('stops after the turn cap, however many tools the model wants', async () => {
    const fetchMock = mockTurns(toolTurn('edit_whiteboard', {}))   // every turn calls a tool
    const out = await runToolLoop({ ...creds, system: 'sys', messages: [], tools: [],
                                    onToolUse: () => ({ ok: true }), maxTurns: 3 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(out.calls).toHaveLength(3)
  })

  it('sums the cache token counts across the loop', async () => {
    mockTurns(
      toolTurn('edit_whiteboard', {}),
      turn([{ text: 'done' }], { inputTokens: 20, cacheReadInputTokens: 900, cacheWriteInputTokens: 0 }))
    const out = await runToolLoop({ ...creds, system: 'sys', messages: [], tools: [],
                                    onToolUse: () => ({ ok: true }) })
    expect(out.usage.cacheReadInputTokens).toBe(900)
    expect(out.usage.inputTokens).toBe(20)
  })

  it('runs through runLLM, which still refuses without credentials', async () => {
    await expect(runLLM({ region: 'us-east-1' }, {}, { loop: true })).rejects.toThrow(/AWS access key/)
  })
})

describe('prompt caching', () => {
  it('puts a cachePoint between the static instructions and the live board', () => {
    const blocks = chatSystem('CATALOG', 'DOC')
    expect(blocks).toHaveLength(3)
    expect(blocks[0].text).toContain('CATALOG')
    expect(blocks[1]).toEqual({ cachePoint: { type: 'default' } })
    expect(blocks[2].text).toContain('DOC')
    // nothing that changes per turn may sit in the cached half
    expect(blocks[0].text).not.toContain('DOC')
  })

  it('normalises a plain string, a block array, and a cachePoint alike', () => {
    expect(toConverseSystem('sys')).toEqual([{ text: 'sys' }])
    expect(toConverseSystem(['a', { cachePoint: { type: 'default' } }]))
      .toEqual([{ text: 'a' }, { cachePoint: { type: 'default' } }])
  })

  it('keeps the one-string prompt equivalent to the two halves', () => {
    expect(systemPrompt('CAT', 'DOC')).toBe(`${systemInstructions('CAT')}\n\n${boardContext('DOC')}`)
  })
})

describe('review findings in the board context', () => {
  const warnings = [{ level: 'warn', title: 'Only 1 master-eligible node', detail: 'Needs three.' }]

  it('formats findings the same way the written summary does', () => {
    expect(describeFindings(warnings)).toContain('[warn] Only 1 master-eligible node: Needs three.')
    expect(summaryPrompt({ board: '', warnings })).toContain('[warn] Only 1 master-eligible node: Needs three.')
  })

  it('reaches the chat through the dynamic half of the system prompt', () => {
    expect(chatSystem('CAT', 'DOC', warnings)[2].text).toContain('REVIEW FINDINGS')
  })

  it('says nothing at all when the review is clean', () => {
    expect(describeFindings([])).toBe('')
    expect(boardContext('DOC', [])).not.toContain('REVIEW FINDINGS')
  })
})

describe('size_deployment tool', () => {
  const tool = buildTool().find((t) => t.name === 'size_deployment')
  const props = tool.input_schema.properties

  it('is offered alongside every other engine the app can reach', () => {
    expect(buildTool().map((t) => t.name)).toEqual([
      'edit_whiteboard', 'size_deployment', 'search_knowledge',
      'review_board', 'lookup_integrations', 'quote_deployment',
    ])
  })

  it('mirrors the Build dialog: a volume or per-source rows, and retention per tier', () => {
    expect(props.dailyGB.type).toBe('number')
    expect(props.sources.items.properties.gb.type).toBe('number')
    expect(props.sources.items.required).toEqual(['gb'])
    expect(Object.keys(props.days.properties)).toEqual(SIZING_TIERS.map((t) => t.key))
  })

  it('offers only providers the sizing engine knows, and the stack toggles', () => {
    expect(props.provider.enum).toContain('selfmanaged')
    expect(props.provider.enum).toContain('aws')
    for (const key of ['logstash', 'ml', 'masters', 'monitoring'])
      expect(props[key].type).toBe('boolean')
    expect(props.agents.type).toBe('number')
    expect(props.users.type).toBe('number')
  })

  it('names the default it will fall back to, so the model can state assumptions', () => {
    expect(props.provider.description).toMatch(/Default "aws"/)
    expect(props.days.properties.hot.description).toMatch(/Default 1\./)
    // Logstash ships off: agent-direct is the default story, so the model has
    // to be asked for it rather than assuming it
    expect(props.logstash.description).toMatch(/Default false\./)
  })
})

describe('staged reveal', () => {
  const section = buildTool()[0].input_schema.properties.sections.items.properties

  it('lets the model put a section on a build step', () => {
    expect(section.step.type).toBe('integer')
    expect(section.step.minimum).toBe(1)
  })

  it('gives the flow as the ordering, and answers questions without drawing', () => {
    const prompt = systemInstructions('CAT')
    expect(prompt).toMatch(/sources first, then ingestion, then the cluster/)
    expect(prompt).toMatch(/answer in plain prose and call no tool/)
    expect(prompt).toMatch(/call size_deployment/)
  })

  it('reports the step in the snapshot so a later edit keeps it', () => {
    expect(describeSections({ c: { template: 'cluster', fill: {}, step: 2 } })).toContain('step=2')
    expect(describeSections({ c: { template: 'cluster', fill: {} } })).not.toContain('step=')
  })
})

describe('summary genres', () => {
  it('offers the five artifacts a session produces, the note first', () => {
    expect(Object.keys(SUMMARY_PROMPTS)).toEqual(['note', 'email', 'questions', 'risks', 'sow'])
    expect(SUMMARY_DEFAULT).toBe('note')
    expect(SUMMARY_PROMPTS.note.label).toBe('Follow-up note')
  })

  it('describes each artifact for the picker, since the choice is made before anything is written', () => {
    for (const [key, genre] of Object.entries(SUMMARY_PROMPTS)) {
      expect(genre.label, key).toBeTruthy()
      expect(genre.hint, key).toMatch(/\w+\s\w+/)
      expect(genre.hint, key).not.toBe(genre.label)
    }
    expect(SUMMARY_PROMPTS.sow.hint).toMatch(/scope/i)
  })

  it('holds every genre to facts-only, and keeps the original export', () => {
    for (const genre of Object.values(SUMMARY_PROMPTS))
      expect(genre.system).toContain('never invent components, numbers, or requirements')
    expect(SUMMARY_SYSTEM).toBe(SUMMARY_PROMPTS.note.system)
    expect(SUMMARY_SYSTEM).toContain('solutions architect')
  })

  it('briefs each genre differently over the same facts', () => {
    expect(summarySystem('email')).toMatch(/subject line/i)
    expect(summarySystem('questions')).toMatch(/questions the design cannot be finished without/)
    expect(summarySystem('risks')).toMatch(/assumptions the design rests on/)
    expect(summarySystem('sow')).toMatch(/statement of work/)
  })

  it('falls back to the follow-up note for an unknown genre', () => {
    expect(summarySystem('bogus')).toBe(SUMMARY_PROMPTS.note.system)
  })
})

describe('search_knowledge tool', () => {
  const tool = buildTool().find((t) => t.name === 'search_knowledge')

  it('takes a query, and a scope that separates the two bodies of knowledge', () => {
    expect(tool.input_schema.required).toEqual(['query'])
    expect(tool.input_schema.properties.scope.enum).toEqual(['all', 'elastic', 'customer'])
  })

  it('tells the model both what it covers and when to reach for it', () => {
    expect(tool.description).toMatch(/reference architectures/)
    expect(tool.description).toMatch(/attached to this board/)
    expect(tool.description).toMatch(/verifiable/)
  })
})

describe('grounding instructions', () => {
  const prompt = systemInstructions('CAT')

  it('sends the model to retrieval before it answers from memory', () => {
    expect(prompt).toMatch(/call search_knowledge first/)
    expect(prompt).toMatch(/Prefer a retrieved passage over your own recollection/)
  })

  it('asks for citations inline rather than a bibliography', () => {
    expect(prompt).toMatch(/Cite what you used/)
    expect(prompt).toMatch(/Don't append a bibliography/)
  })

  it('allows an honest unsourced answer but not a fabricated citation', () => {
    expect(prompt).toMatch(/answer from your own knowledge, flagged as such/)
    expect(prompt).toMatch(/Never cite a source you weren't given/)
  })

  it('keeps the customer requirement and the Elastic recommendation apart', () => {
    expect(prompt).toMatch(/different kinds of fact/)
  })
})

describe('tools over the deterministic engines', () => {
  const tool = (name) => buildTool().find((t) => t.name === name)

  it('lets the model rerun the review, and says why it would want to', () => {
    expect(tool('review_board').input_schema.properties).toEqual({})
    expect(tool('review_board').description).toMatch(/check your own work/)
    // a staged change isn't on the board, and the model has to know that
    expect(tool('review_board').description).toMatch(/not on the board until the user applies it/)
  })

  it('sends the model to the integration catalog instead of guessing a name', () => {
    const lookup = tool('lookup_integrations')
    expect(lookup.input_schema.required).toEqual(['query'])
    expect(lookup.input_schema.properties.category).toBeTruthy()
    expect(lookup.description).toMatch(/has to match the catalog exactly/)
  })

  it('offers both meters and refuses to let the model do the arithmetic', () => {
    const quote = tool('quote_deployment')
    expect(quote.input_schema.properties.model.enum).toEqual([LICENSE_ERU, LICENSE_ECU])
    expect(quote.description).toMatch(/never do this arithmetic yourself/i)
    expect(quote.input_schema.properties.ecuTotal.description).toMatch(/cannot be derived from a diagram/)
  })

  it('tells the model when to reach for each of them', () => {
    const prompt = systemInstructions('CAT')
    expect(prompt).toMatch(/call review_board/)
    expect(prompt).toMatch(/call quote_deployment/)
    expect(prompt).toMatch(/call lookup_integrations first/)
    expect(prompt).toMatch(/You can call several tools in one turn/)
  })

  it('allows a long enough chain to look something up, draw it, and check it', () => {
    expect(TOOL_LOOP_MAX_TURNS).toBeGreaterThanOrEqual(5)
  })
})
