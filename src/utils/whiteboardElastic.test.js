import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  kibanaPath, corsHelp, ElasticError, readAgentReply, elasticConfigured, askAgent,
  indexMapping, ensureIndex, bulkBody, bulkPassages, checkAgent, checkIndex,
  extractAttachment, ELASTIC_DEFAULT_AGENT,
} from './whiteboardElastic'

const cfg = {
  kibanaUrl: 'https://kb.example.com',
  esUrl: 'https://es.example.com',
  apiKey: 'abc123',
  agentId: 'my-agent',
  index: 'whiteboard-knowledge',
  origin: 'https://board.vercel.app',
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const fail = (status, body) => ({ ok: false, status, json: async () => body })
const stub = (...responses) => {
  const mock = vi.fn()
  for (const r of responses) mock.mockResolvedValueOnce(r)
  mock.mockResolvedValue(ok({}))
  vi.stubGlobal('fetch', mock)
  return mock
}
const sent = (mock, i = 0) => ({ url: mock.mock.calls[i][0], opts: mock.mock.calls[i][1] })

afterEach(() => vi.unstubAllGlobals())

describe('kibanaPath', () => {
  it('leaves the default space out of the path', () => {
    expect(kibanaPath('', '/api/x')).toBe('/api/x')
    expect(kibanaPath('default', '/api/x')).toBe('/api/x')
  })

  it('prefixes a named space', () => {
    expect(kibanaPath('sales', '/api/x')).toBe('/s/sales/api/x')
  })

  it('escapes a space name that needs it', () => {
    expect(kibanaPath('my space', '/api/x')).toBe('/s/my%20space/api/x')
  })
})

describe('askAgent', () => {
  it('sends the three headers Kibana requires, kbn-xsrf included', async () => {
    const mock = stub(ok({ response: 'hello', conversation_id: 'c1' }))
    await askAgent({ ...cfg, input: 'hi' })
    const { opts } = sent(mock)
    expect(opts.headers.Authorization).toBe('ApiKey abc123')
    expect(opts.headers['kbn-xsrf']).toBe('true')
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('sends the key as a header rather than a cookie, keeping the CORS policy simple', async () => {
    const mock = stub(ok({ response: 'hello' }))
    await askAgent({ ...cfg, input: 'hi' })
    expect(sent(mock).opts.credentials).toBe('omit')
  })

  it('posts to converse with the agent and the input', async () => {
    const mock = stub(ok({ response: 'hello' }))
    await askAgent({ ...cfg, input: 'what is the frozen tier?' })
    const { url, opts } = sent(mock)
    expect(url).toBe('https://kb.example.com/api/agent_builder/converse')
    expect(JSON.parse(opts.body)).toEqual({ input: 'what is the frozen tier?', agent_id: 'my-agent' })
  })

  it('defaults the agent id and trims a trailing slash off the URL', async () => {
    const mock = stub(ok({ response: 'hi' }))
    await askAgent({ ...cfg, kibanaUrl: 'https://kb.example.com/', agentId: '', input: 'hi' })
    expect(sent(mock).url).toBe('https://kb.example.com/api/agent_builder/converse')
    expect(JSON.parse(sent(mock).opts.body).agent_id).toBe(ELASTIC_DEFAULT_AGENT)
  })

  it('carries a conversation id when continuing', async () => {
    const mock = stub(ok({ response: 'hi' }))
    await askAgent({ ...cfg, input: 'and then?', conversationId: 'c9' })
    expect(JSON.parse(sent(mock).opts.body).conversation_id).toBe('c9')
  })

  it('honours a Kibana space', async () => {
    const mock = stub(ok({ response: 'hi' }))
    await askAgent({ ...cfg, space: 'sales', input: 'hi' })
    expect(sent(mock).url).toContain('/s/sales/api/agent_builder/converse')
  })
})

describe('readAgentReply', () => {
  it('reads the response when it is a plain string', () => {
    expect(readAgentReply({ response: 'the answer', conversation_id: 'c1' }))
      .toMatchObject({ text: 'the answer', conversationId: 'c1' })
  })

  it('reads it when the version wraps it in a message', () => {
    expect(readAgentReply({ response: { message: 'the answer' } }).text).toBe('the answer')
  })

  it('reports which of the agent\'s own tools ran', () => {
    const reply = readAgentReply({
      response: 'x',
      steps: [{ type: 'reasoning' }, { type: 'tool_call', tool_id: 'search_index' }],
    })
    expect(reply.steps).toEqual(['search_index'])
  })

  it('returns an empty string rather than throwing on a shape it doesn\'t know', () => {
    expect(readAgentReply({}).text).toBe('')
    expect(readAgentReply(null).text).toBe('')
  })
})

/* The four failure modes exist so the UI can say something actionable. A
   blocked preflight in particular is invisible to JavaScript, so it has to be
   inferred and explained. */
describe('failure modes', () => {
  it('reads a blocked preflight as CORS and prints the settings that fix it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const err = await askAgent({ ...cfg, input: 'hi' }).catch((e) => e)
    expect(err).toBeInstanceOf(ElasticError)
    expect(err.kind).toBe('cors')
    expect(err.help).toContain('server.cors.enabled: true')
    expect(err.help).toContain('https://board.vercel.app')
  })

  it('reads a 403 as the key, not the request', async () => {
    stub(fail(403, { message: 'unauthorised' }))
    const err = await askAgent({ ...cfg, input: 'hi' }).catch((e) => e)
    expect(err.kind).toBe('auth')
    expect(err.message).toMatch(/check the API key/)
  })

  it('reads a 404 as the URL, the agent id, or the space', async () => {
    stub(fail(404, { message: 'not found' }))
    const err = await askAgent({ ...cfg, input: 'hi' }).catch((e) => e)
    expect(err.kind).toBe('request')
    expect(err.message).toMatch(/agent id/)
  })

  it('reads a 400 as the request', async () => {
    stub(fail(400, { message: 'bad agent' }))
    const err = await askAgent({ ...cfg, input: 'hi' }).catch((e) => e)
    expect(err.kind).toBe('request')
    expect(err.status).toBe(400)
  })

  it('surfaces Elasticsearch\'s own reason, which sits somewhere else', async () => {
    stub(fail(500, { error: { reason: 'all shards failed' } }))
    const err = await askAgent({ ...cfg, input: 'hi' }).catch((e) => e)
    expect(err.message).toContain('all shards failed')
    expect(err.kind).toBe('server')
  })

  it('lets an abort through rather than dressing it as a CORS problem', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    const err = await askAgent({ ...cfg, input: 'hi' }).catch((e) => e)
    expect(err.name).toBe('AbortError')
  })
})

describe('corsHelp', () => {
  it('gives the Kibana settings with the caller\'s own origin filled in', () => {
    const help = corsHelp('kibana', 'https://board.vercel.app')
    expect(help).toContain('server.cors.allowOrigin: ["https://board.vercel.app"]')
  })

  it('gives the Elasticsearch settings, which are a different shape', () => {
    const help = corsHelp('elasticsearch', 'https://board.vercel.app')
    expect(help).toContain('http.cors.enabled: true')
    expect(help).toContain('http.cors.allow-headers: Authorization')
  })

  /* Serverless endpoints send no CORS headers and expose no user settings, so
     printing the hosted fix there sends someone looking for a page that does
     not exist. Verified against a live project: the preflight returns 200 with
     no Access-Control-Allow-Origin on it. */
  it('tells a serverless project it cannot be fixed rather than printing settings', () => {
    const help = corsHelp('elasticsearch', 'https://board.vercel.app',
      'https://whiteboard-context-c937fe.es.us-east-1.aws.elastic.cloud/whiteboard-knowledge')
    expect(help).toContain('Serverless')
    expect(help).not.toContain('http.cors.enabled')
    expect(help).toContain('hosted Elastic Cloud deployment')
  })

  it('keeps the hosted advice for hosted deployments and self-managed hosts', () => {
    for (const url of ['https://abc123.es.us-east-1.aws.elastic-cloud.com',
                       'https://abc123.es.us-east-1.aws.found.io',
                       'https://elastic.internal.example.com:9200']) {
      expect(corsHelp('elasticsearch', 'https://board.vercel.app', url))
        .toContain('http.cors.enabled: true')
    }
  })
})

describe('indexing', () => {
  it('maps the passage body as semantic_text so Elastic does the embedding', () => {
    expect(indexMapping().mappings.properties.content).toEqual({ type: 'semantic_text' })
    expect(indexMapping().mappings.properties.source).toEqual({ type: 'keyword' })
  })

  it('creates the index with PUT', async () => {
    const mock = stub(ok({ acknowledged: true }))
    expect(await ensureIndex(cfg)).toEqual({ created: true })
    expect(sent(mock).url).toBe('https://es.example.com/whiteboard-knowledge')
    expect(sent(mock).opts.method).toBe('PUT')
  })

  it('treats an index that already exists as success, since re-pushing is the workflow', async () => {
    stub(fail(400, { error: { reason: 'resource_already_exists_exception' } }))
    expect(await ensureIndex(cfg)).toEqual({ created: false })
  })

  it('still fails loudly on a real creation error', async () => {
    stub(fail(403, { message: 'no' }))
    await expect(ensureIndex(cfg)).rejects.toThrow(/check the API key/)
  })

  it('keys bulk lines on the passage id, so a corrected passage replaces itself', () => {
    const body = bulkBody('idx', [{ id: 'sizing-ratios', title: 'T', source: 'S', tags: ['elastic'], text: 'body' }], 2)
    const [action, doc] = body.trim().split('\n')
    expect(JSON.parse(action)).toEqual({ index: { _index: 'idx', _id: 'sizing-ratios' } })
    expect(JSON.parse(doc)).toMatchObject({ content: 'body', source: 'S', passage_id: 'sizing-ratios', version: 2 })
  })

  it('ends the bulk body with a newline, which the API requires', () => {
    expect(bulkBody('idx', [{ id: 'a', text: 'x', tags: [] }])).toMatch(/\n$/)
  })

  it('counts what landed and reports what did not', async () => {
    stub(ok({ items: [{ index: {} }, { index: { error: { reason: 'mapper error' } } }] }))
    const out = await bulkPassages({ ...cfg, passages: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }] })
    expect(out).toEqual({ indexed: 1, errors: ['mapper error'] })
  })

  it('does nothing, successfully, for no passages', async () => {
    const mock = stub()
    expect(await bulkPassages({ ...cfg, passages: [] })).toEqual({ indexed: 0, errors: [] })
    expect(mock).not.toHaveBeenCalled()
  })
})

describe('extractAttachment', () => {
  it('simulates the attachment pipeline and hands back the extracted text', async () => {
    const mock = stub(ok({ docs: [{ doc: { _source: {
      attachment: { content: '  Thirteen months of retention.  ', content_type: 'application/pdf' },
    } } }] }))

    const out = await extractAttachment({ ...cfg, base64: 'JVBERg==' })
    expect(out).toEqual({ text: 'Thirteen months of retention.', contentType: 'application/pdf' })

    const { url, opts } = sent(mock)
    expect(url).toBe('https://es.example.com/_ingest/pipeline/_simulate')
    const body = JSON.parse(opts.body)
    expect(body.pipeline.processors[0].attachment).toEqual({ field: 'data', remove_binary: true })
    expect(body.docs[0]._source.data).toBe('JVBERg==')
  })

  it('surfaces the processor error a simulate hides inside a 200', async () => {
    stub(ok({ docs: [{ error: { reason: 'Unable to parse the document' } }] }))
    await expect(extractAttachment({ ...cfg, base64: 'x' }))
      .rejects.toThrow(/Unable to parse/)
  })

  it('refuses without an Elasticsearch URL', async () => {
    await expect(extractAttachment({ apiKey: 'k', base64: 'x' }))
      .rejects.toThrow(/No Elasticsearch URL/)
  })
})

describe('health checks', () => {
  it('reports the agent answering, with the round trip', async () => {
    stub(ok({ response: 'ready' }))
    const out = await checkAgent(cfg)
    expect(out.ok).toBe(true)
    expect(out.detail).toBe('ready')
    expect(typeof out.ms).toBe('number')
  })

  it('reports how the agent failed rather than only that it did', async () => {
    stub(fail(403, { message: 'nope' }))
    const out = await checkAgent(cfg)
    expect(out).toMatchObject({ ok: false, kind: 'auth' })
    expect(out.error).toMatch(/API key/)
  })

  it('counts what is in the index', async () => {
    const mock = stub(ok({ count: 31 }))
    expect(await checkIndex(cfg)).toMatchObject({ ok: true, count: 31 })
    expect(sent(mock).url).toBe('https://es.example.com/whiteboard-knowledge/_count')
    expect(sent(mock).opts.method).toBe('GET')
  })

  it('says so plainly when no Elasticsearch URL is set', async () => {
    expect(await checkIndex({ ...cfg, esUrl: '' })).toMatchObject({ ok: false, kind: 'request' })
  })

  it('carries the CORS help onto a failed check', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const out = await checkIndex(cfg)
    expect(out.kind).toBe('cors')
    expect(out.help).toContain('http.cors.enabled: true')
  })
})

describe('elasticConfigured', () => {
  it('needs both a URL and a key', () => {
    expect(elasticConfigured({ kibanaUrl: 'https://kb', apiKey: 'k' })).toBe(true)
    expect(elasticConfigured({ kibanaUrl: 'https://kb', apiKey: '  ' })).toBe(false)
    expect(elasticConfigured({ kibanaUrl: '', apiKey: 'k' })).toBe(false)
    expect(elasticConfigured()).toBe(false)
  })
})
