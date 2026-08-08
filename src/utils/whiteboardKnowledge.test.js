import { describe, it, expect } from 'vitest'
import {
  tokenize, chunkDocument, buildIndex, searchPassages, renderPassages, citedSources,
  looksBinaryText, CHUNK_MAX,
} from './whiteboardKnowledge'

const passage = (id, title, text, tags = ['elastic'], source = `src:${id}`) =>
  ({ id, title, source, tags, text })

const ids = (hits) => hits.map((h) => h.id)

describe('tokenize', () => {
  it('drops stopwords and single characters', () => {
    expect(tokenize('the frozen tier is a searchable snapshot')).toEqual(['frozen', 'tier', 'searchable', 'snapshot'])
  })

  it('keeps the underscores in Elastic identifiers', () => {
    expect(tokenize('set data_hot on semantic_text')).toEqual(['set', 'data_hot', 'semantic_text'])
  })

  it('keeps digits, which are what sizing questions are made of', () => {
    expect(tokenize('3 master nodes at 64 GB')).toContain('64')
    expect(tokenize('3 master nodes at 64 GB')).toContain('3')
  })

  it('survives empty and nullish input', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize(null)).toEqual([])
  })
})

describe('chunkDocument — label-only documents', () => {
  /* How a vision model transcribes a diagram: short capitalized lines, every
     one of which the heading detector would otherwise eat, leaving the
     document attached but invisible to search. */
  it('still yields a passage when every line looks like a heading', () => {
    const out = chunkDocument('Elasticsearch Cluster\nKibana\nKafka\nLogstash',
      { id: 'img', title: 'arch.png', source: 'arch.png', tags: ['customer'] })
    expect(out).toHaveLength(1)
    expect(out[0].text).toContain('Kibana')
    expect(out[0].text).toContain('Logstash')
    expect(out[0].title).toBe('arch.png')
  })

  it('yields nothing for genuinely empty text, which attach already refuses', () => {
    expect(chunkDocument('   \n\n  ')).toHaveLength(0)
  })
})

describe('looksBinaryText', () => {
  it('recognises a PDF read as text by its NULs and stream noise', () => {
    expect(looksBinaryText('%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n1 0 obj\nstream\n\u0000\u0001\u0002\u0014\u0018')).toBe(true)
  })

  it('recognises a DOCX, which is a zip, by its control characters', () => {
    expect(looksBinaryText('PK\u0003\u0004\u0014\u0000\u0006\u0000\u0008\u0000word/document.xml')).toBe(true)
  })

  it('passes ordinary prose, markdown, and tab-separated text', () => {
    expect(looksBinaryText('## Retention\n\nThirteen months,\tsearchable.\r\n')).toBe(false)
    expect(looksBinaryText('')).toBe(false)
    expect(looksBinaryText(null)).toBe(false)
  })
})

describe('chunkDocument', () => {
  it('titles each passage with the heading it fell under', () => {
    const out = chunkDocument('## Retention\n\nKeep 30 days hot.\n\n## Ingest\n\nExpect 2 TB a day.',
      { id: 'rfp', title: 'RFP', source: 'customer RFP', tags: ['customer'] })
    expect(out).toHaveLength(2)
    expect(out[0].title).toBe('RFP — Retention')
    expect(out[1].title).toBe('RFP — Ingest')
    expect(out[1].text).toBe('Expect 2 TB a day.')
  })

  it('carries the source and tags onto every passage', () => {
    const out = chunkDocument('## A\n\nfirst\n\n## B\n\nsecond',
      { id: 'd', source: 'notes.md', tags: ['customer'] })
    expect(out.every((p) => p.source === 'notes.md')).toBe(true)
    expect(out.every((p) => p.tags.includes('customer'))).toBe(true)
  })

  it('gives every passage a distinct id', () => {
    const out = chunkDocument('## A\n\none\n\n## B\n\ntwo\n\n## C\n\nthree', { id: 'doc' })
    expect(ids(out)).toEqual(['doc#1', 'doc#2', 'doc#3'])
  })

  it('groups short paragraphs from one section together', () => {
    const out = chunkDocument('## One\n\nalpha\n\nbeta\n\ngamma', { id: 'd' })
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe('alpha\n\nbeta\n\ngamma')
  })

  it('never merges across a heading', () => {
    const out = chunkDocument('## One\n\nalpha\n\n## Two\n\nbeta', { id: 'd' })
    expect(out).toHaveLength(2)
  })

  it('splits a wall of text on sentence boundaries rather than mid-claim', () => {
    const body = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} says something about retention.`).join(' ')
    const out = chunkDocument(body, { id: 'd' })
    expect(out.length).toBeGreaterThan(1)
    expect(out.every((p) => p.text.length <= CHUNK_MAX)).toBe(true)
    // no passage begins mid-sentence
    expect(out.every((p) => /^[A-Z]/.test(p.text))).toBe(true)
  })

  it('reads a bare title-case line as a heading, for documents that are not Markdown', () => {
    const out = chunkDocument('Retention Policy\n\nKeep 30 days.\n\nIngest Volume\n\n2 TB a day.', { id: 'd', title: 'Notes' })
    expect(out.map((p) => p.title)).toEqual(['Notes — Retention Policy', 'Notes — Ingest Volume'])
  })

  it('falls back to the source when there is no title or heading', () => {
    const out = chunkDocument('just some prose here.', { id: 'd', source: 'paste' })
    expect(out[0].title).toBe('paste')
  })

  it('returns nothing for an empty document', () => {
    expect(chunkDocument('', { id: 'd' })).toEqual([])
    expect(chunkDocument('   \n\n  ', { id: 'd' })).toEqual([])
  })
})

describe('searchPassages', () => {
  const corpus = [
    passage('frozen', 'Frozen tier', 'The frozen tier mounts searchable snapshots from object storage and needs a local cache.'),
    passage('hot', 'Hot tier', 'The hot tier is sized for indexing throughput at a 30:1 disk to RAM ratio.'),
    passage('masters', 'Master nodes', 'Production clusters need three master-eligible nodes to hold a quorum when one is lost.'),
    passage('rfp', 'Customer RFP — Retention', 'They require 13 months of searchable retention for audit.', ['customer']),
  ]

  it('ranks the passage that answers the question first', () => {
    expect(searchPassages(corpus, 'how many master nodes for a quorum')[0].id).toBe('masters')
  })

  it('returns nothing rather than noise when no term matches', () => {
    expect(searchPassages(corpus, 'kubernetes helm chart')).toEqual([])
  })

  it('returns nothing for an empty query', () => {
    expect(searchPassages(corpus, '')).toEqual([])
    expect(searchPassages(corpus, '   ')).toEqual([])
  })

  it('scopes to the customer document so a requirement is never cited as guidance', () => {
    const hits = searchPassages(corpus, 'retention', { scope: 'customer' })
    expect(ids(hits)).toEqual(['rfp'])
  })

  it('scopes to Elastic guidance the same way', () => {
    const hits = searchPassages(corpus, 'retention snapshots tier', { scope: 'elastic' })
    expect(hits.every((h) => h.tags.includes('elastic'))).toBe(true)
  })

  it('honours the limit', () => {
    expect(searchPassages(corpus, 'tier nodes storage', { limit: 2 })).toHaveLength(2)
  })

  it('prefers an exact phrase over the same words scattered', () => {
    const scattered = passage('a', 'Notes', 'The tier is frozen when the storage is object storage and searchable.')
    const exact = passage('b', 'Notes', 'A searchable snapshot is how the frozen tier reads its data.')
    const hits = searchPassages([scattered, exact], 'searchable snapshot')
    expect(hits[0].id).toBe('b')
  })

  it('weights a term in the title above one buried in the body', () => {
    const titled = passage('a', 'Index lifecycle management', 'Ages data between tiers on a schedule.')
    const buried = passage('b', 'Assorted notes', 'Some prose. More prose. Index lifecycle management gets a passing mention here among many other words.')
    expect(searchPassages([titled, buried], 'index lifecycle management')[0].id).toBe('a')
  })

  it('attaches a score and orders by it', () => {
    const hits = searchPassages(corpus, 'frozen tier searchable snapshots')
    expect(hits[0].score).toBeGreaterThan(0)
    expect(hits.map((h) => h.score)).toEqual([...hits.map((h) => h.score)].sort((a, b) => b - a))
  })

  it('takes a prebuilt index as well as an array', () => {
    const index = buildIndex(corpus)
    expect(searchPassages(index, 'quorum')[0].id).toBe('masters')
  })

  it('copes with an empty corpus', () => {
    expect(searchPassages([], 'anything')).toEqual([])
    expect(searchPassages(corpus, 'quorum', { scope: 'nothing-tagged-this' })).toEqual([])
  })
})

describe('renderPassages', () => {
  it('numbers the passages and puts the source on its own line', () => {
    const out = renderPassages([passage('a', 'Frozen tier', 'Body text.', ['elastic'], 'Elastic sizing guidance')])
    expect(out).toContain('[1] Frozen tier')
    expect(out).toContain('Source: Elastic sizing guidance')
    expect(out).toContain('Body text.')
  })

  it('says so plainly when nothing matched', () => {
    expect(renderPassages([])).toBe('No passages matched.')
  })
})

describe('citedSources', () => {
  it('lists each source once, in ranked order', () => {
    const hits = [
      passage('a', 'A', '', ['elastic'], 'Sizing guidance'),
      passage('b', 'B', '', ['elastic'], 'Tier guidance'),
      passage('c', 'C', '', ['elastic'], 'Sizing guidance'),
    ]
    expect(citedSources(hits)).toEqual(['Sizing guidance', 'Tier guidance'])
  })

  it('is empty for no hits', () => {
    expect(citedSources()).toEqual([])
  })
})
