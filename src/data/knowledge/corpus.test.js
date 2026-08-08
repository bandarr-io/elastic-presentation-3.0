import { describe, it, expect } from 'vitest'
import { ELASTIC_CORPUS, elasticIndex, SCOPE_ELASTIC } from './index'
import { searchPassages } from '../../utils/whiteboardKnowledge'
import { MASTER_NODES, MASTER_DATA_NODE_THRESHOLD, RU_GB } from '../../utils/whiteboardSizing'

/* The corpus is the AI's evidence, so its contract is worth guarding: every
   passage citable, every id unique, and the guidance still agreeing with the
   engine that implements it. */
describe('the curated corpus', () => {
  it('has passages', () => {
    expect(ELASTIC_CORPUS.length).toBeGreaterThan(20)
  })

  it('gives every passage a source to cite', () => {
    const uncited = ELASTIC_CORPUS.filter((p) => !p.source?.trim())
    expect(uncited.map((p) => p.id)).toEqual([])
  })

  it('gives every passage an id, a title and a body', () => {
    for (const p of ELASTIC_CORPUS) {
      expect(p.id, `${p.id} id`).toBeTruthy()
      expect(p.title?.trim(), `${p.id} title`).toBeTruthy()
      expect(p.text?.trim().length, `${p.id} text`).toBeGreaterThan(80)
    }
  })

  it('keeps ids unique, since retrieval cites by id', () => {
    const ids = ELASTIC_CORPUS.map((p) => p.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('scopes every curated passage as Elastic guidance', () => {
    expect(ELASTIC_CORPUS.every((p) => p.tags?.includes(SCOPE_ELASTIC))).toBe(true)
  })

  it('never labels its own guidance as the customer talking', () => {
    expect(ELASTIC_CORPUS.some((p) => p.tags.includes('customer'))).toBe(false)
  })
})

/* The numbers in the prose are interpolated from whiteboardSizing, so these
   assert the wiring rather than the values: if a constant changes, the
   guidance the model retrieves has to change with it. */
describe('the corpus tracks the engine', () => {
  const textOf = (id) => ELASTIC_CORPUS.find((p) => p.id === id).text

  it('states the quorum size the sizing engine uses', () => {
    expect(textOf('sizing-masters')).toContain(String(MASTER_NODES))
    expect(textOf('sizing-masters')).toContain(String(MASTER_DATA_NODE_THRESHOLD))
  })

  it('states the resource-unit divisor the quote maths uses', () => {
    expect(textOf('licensing-models')).toContain(String(RU_GB))
  })

  it('quotes the tier ratios the sizing engine applies', () => {
    expect(textOf('sizing-ratios')).toContain('30:1')
    expect(textOf('sizing-ratios')).toContain('1000:1')
  })
})

/* Retrieval over the real corpus: the questions an SA actually asks should
   reach the passage that answers them. */
describe('retrieval over the corpus', () => {
  const ask = (query) => searchPassages(elasticIndex(), query)

  it('answers a question about master node counts', () => {
    expect(ask('how many master nodes do I need for a quorum')[0].id).toMatch(/masters/)
  })

  it('answers a question about the frozen tier and object storage', () => {
    const hit = ask('does the frozen tier need S3')[0]
    expect(`${hit.title} ${hit.text}`.toLowerCase()).toContain('object storage')
  })

  it('answers a question about resource units', () => {
    expect(ask('how are enterprise resource units counted')[0].id).toMatch(/licensing/)
  })

  it('finds the reasoning behind a review finding by its topic', () => {
    expect(ask('why is a single data node a problem')[0].id).toBe('review-single-data-node')
  })

  it('distinguishes Security from Observability tiering', () => {
    expect(ask('reference architecture for Elastic Security')[0].id).toBe('arch-security')
    expect(ask('reference architecture for observability logs and APM')[0].id).toBe('arch-observability')
  })

  it('returns nothing rather than a bad guess for an unrelated question', () => {
    expect(ask('what is the capital of France')).toEqual([])
  })

  it('reuses one index across searches', () => {
    expect(elasticIndex()).toBe(elasticIndex())
  })
})
