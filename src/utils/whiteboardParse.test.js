import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  docKind, fileBase64, describeImage, parseDocument, ParseError,
  JINA_VLM_URL, PARSE_MAX_BYTES,
} from './whiteboardParse'

const jsonResponse = (body, status = 200) =>
  ({ ok: status < 400, status, json: async () => body })

afterEach(() => vi.unstubAllGlobals())

describe('docKind', () => {
  it('routes by extension', () => {
    expect(docKind(new File([''], 'rfp.pdf'))).toBe('pdf')
    expect(docKind(new File([''], 'notes.docx'))).toBe('docx')
    expect(docKind(new File([''], 'volumes.xlsx'))).toBe('xlsx')
    expect(docKind(new File([''], 'whiteboard.png'))).toBe('image')
    expect(docKind(new File([''], 'requirements.md'))).toBe('text')
  })

  it('routes by MIME type when the name gives nothing away', () => {
    expect(docKind(new File([''], 'download', { type: 'application/pdf' }))).toBe('pdf')
    expect(docKind(new File([''], 'download', { type: 'image/jpeg' }))).toBe('image')
    expect(docKind(new File([''], 'download',
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))).toBe('docx')
    expect(docKind(new File([''], 'download',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))).toBe('xlsx')
  })

  it('treats anything unrecognised as text, to be judged after reading', () => {
    expect(docKind(new File([''], 'mystery.bin'))).toBe('text')
  })
})

describe('fileBase64', () => {
  it('round-trips bytes through base64', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70, 0, 255, 128])
    expect(atob(await fileBase64(new File([bytes], 'x.pdf')))
      .split('').map((c) => c.charCodeAt(0))).toEqual([...bytes])
  })
})

describe('parseDocument — text', () => {
  it('reads a text file directly', async () => {
    const out = await parseDocument(new File(['## Retention\n\nThirteen months.'], 'rfp.md'))
    expect(out.text).toContain('Thirteen months')
    expect(out.via).toBe('read as text')
  })

  it('turns an unrecognised binary away with paste advice', async () => {
    const file = new File(['PK\u0003\u0004\u0000\u0001\u0002\u0014'], 'mystery.bin')
    await expect(parseDocument(file)).rejects.toThrow(/paste/)
  })

  it('refuses a file too big to parse here', async () => {
    const file = new File(['x'], 'huge.pdf')
    Object.defineProperty(file, 'size', { value: PARSE_MAX_BYTES + 1 })
    await expect(parseDocument(file)).rejects.toThrow(/too big/)
  })
})

describe('parseDocument — images through Jina', () => {
  it('asks for a key before it can read an image', async () => {
    await expect(parseDocument(new File([''], 'arch.png'), { jinaKey: '' }))
      .rejects.toThrow(/Jina API key/)
  })

  it('sends the image to the vision model and attaches what it read', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(
      { choices: [{ message: { content: 'Hot tier: 8 nodes. Kafka feeds Logstash.' } }] }))
    vi.stubGlobal('fetch', fetchMock)

    const out = await parseDocument(new File([new Uint8Array([137, 80])], 'arch.png',
      { type: 'image/png' }), { jinaKey: 'jina_test' })
    expect(out.via).toBe("read by Jina's vision model")
    expect(out.text).toContain('Kafka feeds Logstash')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(JINA_VLM_URL)
    expect(init.headers.Authorization).toBe('Bearer jina_test')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('jina-vlm')
    expect(body.messages[0].content[1].image_url.url).toMatch(/^data:image\/png;base64,/)
  })

  it('reads content delivered as an array of blocks — the other OpenAI-compatible dialect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(
      { choices: [{ message: { content: [{ type: 'text', text: 'Kafka feeds ' }, { type: 'text', text: 'Logstash.' }] } }] })))
    const out = await describeImage({ apiKey: 'k', file: new File([''], 'x.png', { type: 'image/png' }) })
    expect(out).toBe('Kafka feeds Logstash.')
  })

  it('shows what came back when there is no text in it, so the shape is diagnosable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: {} }] })))
    await expect(describeImage({ apiKey: 'k', file: new File([''], 'x.png', { type: 'image/png' }) }))
      .rejects.toThrow(/Response started: \{"choices"/)
  })

  it('explains the cold start instead of a bare 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 503)))
    await expect(describeImage({ apiKey: 'k', file: new File([''], 'x.png') }))
      .rejects.toThrow(/starting up/)
  })

  it('points a rejected key back at settings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))
    await expect(describeImage({ apiKey: 'bad', file: new File([''], 'x.png') }))
      .rejects.toThrow(/API key/)
  })
})

describe('parseDocument — PDF, DOCX, XLSX', () => {
  const elastic = { esUrl: 'https://es.example.com', apiKey: 'key' }
  const pdf = () => new File(['%PDF-fake'], 'rfp.pdf')
  const simulateReply = (content) =>
    ({ docs: [{ doc: { _source: { attachment: { content, content_type: 'application/pdf' } } } }] })

  it('parses through the Elastic attachment processor when a deployment is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(simulateReply('Thirteen months of retention.')))
    vi.stubGlobal('fetch', fetchMock)

    const out = await parseDocument(pdf(), { elastic })
    expect(out.via).toBe('parsed by your Elastic deployment')
    expect(out.text).toBe('Thirteen months of retention.')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://es.example.com/_ingest/pipeline/_simulate')
    const body = JSON.parse(init.body)
    expect(body.pipeline.processors[0].attachment.remove_binary).toBe(true)
    expect(body.docs[0]._source.data).toBe(btoa('%PDF-fake'))
  })

  it('falls back to the browser parser when Elastic is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const parsers = { pdf: vi.fn().mockResolvedValue('Parsed locally.') }

    const out = await parseDocument(pdf(), { elastic, parsers })
    expect(out.via).toBe('parsed in this browser')
    expect(out.text).toBe('Parsed locally.')
    expect(parsers.pdf).toHaveBeenCalledOnce()
  })

  it('goes straight to the browser parser when Elastic is not configured', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const parsers = { docx: vi.fn().mockResolvedValue('From the Word file.') }

    const out = await parseDocument(new File(['PK'], 'notes.docx'), { parsers })
    expect(out.via).toBe('parsed in this browser')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gives paste advice when the parser finds nothing — a scanned PDF has no text layer', async () => {
    const parsers = { pdf: vi.fn().mockResolvedValue('   ') }
    await expect(parseDocument(pdf(), { parsers })).rejects.toThrow(/paste/)
  })

  it('gives paste advice when the parser chokes, not a stack trace', async () => {
    const parsers = { pdf: vi.fn().mockRejectedValue(new Error('Invalid PDF structure')) }
    await expect(parseDocument(pdf(), { parsers })).rejects.toBeInstanceOf(ParseError)
  })
})
