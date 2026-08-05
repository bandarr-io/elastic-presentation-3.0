import { describe, it, expect } from 'vitest'
import { tidyLayout, laneOf, flowHops, validateBoard, capacityTotals, parseCapacityTB, formatTB } from './whiteboardAnalysis'

const node = (id, type, extra = {}) => ({ id, type, x: 0, y: 0, ...extra })
const sizeOf = () => ({ w: 248, h: 96 })
const ids = (warnings) => warnings.map((w) => w.id)

describe('tidyLayout', () => {
  it('orders lanes left to right by data-flow stage', () => {
    const nodes = [node('k', 'kibana'), node('h', 'tier_hot'), node('a', 'agent')]
    const pos = tidyLayout(nodes, sizeOf)
    // agent collects, hot tier stores, Kibana serves
    expect(pos.a.x).toBeLessThan(pos.h.x)
    expect(pos.h.x).toBeLessThan(pos.k.x)
  })

  it('stacks a lane vertically without overlapping', () => {
    const nodes = [node('h1', 'tier_hot'), node('h2', 'tier_warm', { y: 400 })]
    const pos = tidyLayout(nodes, sizeOf)
    expect(pos.h1.x).toBe(pos.h2.x)
    expect(pos.h2.y - pos.h1.y).toBeGreaterThanOrEqual(96)
  })

  it('preserves the existing top-to-bottom order within a lane', () => {
    const nodes = [node('lower', 'tier_hot', { y: 500 }), node('upper', 'tier_warm', { y: 100 })]
    const pos = tidyLayout(nodes, sizeOf)
    expect(pos.upper.y).toBeLessThan(pos.lower.y)
  })

  it('leaves annotations where the user put them', () => {
    const nodes = [node('k', 'kibana'), node('note', 'note', { x: 900, y: 900 })]
    const pos = tidyLayout(nodes, sizeOf)
    expect(pos.note).toBeUndefined()
    expect(pos.k).toBeDefined()
  })

  it('routes generic sources into the collect lane via their flow override', () => {
    expect(laneOf(node('s', 'source'))).toBe('collect')
    expect(laneOf(node('k', 'kibana'))).toBe('serve')
  })

  it('returns nothing for an empty or annotation-only board', () => {
    expect(tidyLayout([], sizeOf)).toEqual({})
    expect(tidyLayout([node('n', 'note')], sizeOf)).toEqual({})
  })
})

describe('flowHops', () => {
  const hopIds = (hops) => hops.map((hop) => hop.join('+'))

  it('walks a chain one connection at a time', () => {
    const hops = flowHops([
      { id: 'b', s: 'mid', e: 'end' },
      { id: 'a', s: 'start', e: 'mid' },
    ])
    expect(hopIds(hops)).toEqual(['a', 'b'])
  })

  it('fans parallel connections into the same hop', () => {
    const hops = flowHops([
      { id: 'a', s: 'src', e: 'one' },
      { id: 'b', s: 'src', e: 'two' },
      { id: 'c', s: 'one', e: 'sink' },
    ])
    expect(hopIds(hops)).toEqual(['a+b', 'c'])
  })

  it('starts every source at once so disconnected branches move together', () => {
    const hops = flowHops([
      { id: 'a', s: 'src1', e: 'sink1' },
      { id: 'b', s: 'src2', e: 'sink2' },
    ])
    expect(hopIds(hops)).toEqual(['a+b'])
  })

  it('stops rather than spinning on a cycle', () => {
    const hops = flowHops([
      { id: 'a', s: 'one', e: 'two' },
      { id: 'b', s: 'two', e: 'three' },
      { id: 'c', s: 'three', e: 'one' },
    ])
    expect(hops.flat().sort()).toEqual(['a', 'b', 'c'])
  })

  it('sweeps up connections only reachable inside a cycle', () => {
    const hops = flowHops([
      { id: 'in', s: 'src', e: 'ring1' },
      { id: 'x', s: 'ring1', e: 'ring2' },
      { id: 'y', s: 'ring2', e: 'ring1' },
    ])
    expect(hops.flat().sort()).toEqual(['in', 'x', 'y'])
  })

  it('ignores half-built connections and empty boards', () => {
    expect(flowHops()).toEqual([])
    expect(flowHops([])).toEqual([])
    expect(flowHops([{ id: 'a', s: 'src' }])).toEqual([])
  })
})

describe('validateBoard', () => {
  it('stays quiet on boards that are not cluster diagrams', () => {
    expect(validateBoard([node('k', 'kibana')], [])).toEqual([])
  })

  it('flags a master count below quorum', () => {
    const nodes = [node('h', 'tier_hot'), node('m', 'node_master', { props: { nodes: 1 } })]
    expect(ids(validateBoard(nodes, []))).toContain('masters-few')
  })

  it('flags an even master count', () => {
    const nodes = [node('h', 'tier_hot'), node('m', 'node_master', { props: { nodes: 4 } })]
    expect(ids(validateBoard(nodes, []))).toContain('masters-even')
  })

  it('accepts a healthy odd quorum', () => {
    const nodes = [node('h', 'tier_hot'), node('m', 'node_master', { props: { nodes: 3 } })]
    const found = ids(validateBoard(nodes, []))
    expect(found).not.toContain('masters-few')
    expect(found).not.toContain('masters-even')
  })

  it('flags a frozen tier with no object storage, and clears once added', () => {
    const frozen = [node('h', 'tier_hot'), node('f', 'tier_frozen')]
    expect(ids(validateBoard(frozen, []))).toContain('frozen-no-store')
    expect(ids(validateBoard([...frozen, node('s', 'storage')], []))).not.toContain('frozen-no-store')
  })

  it('flags a warm tier with no hot tier', () => {
    expect(ids(validateBoard([node('w', 'tier_warm')], []))).toContain('warm-no-hot')
  })

  it('flags a replication flow with no remote cluster', () => {
    const nodes = [node('h', 'tier_hot')]
    const edges = [{ id: 'e', s: 'h', e: 'h2', lbl: 'CCR replication' }]
    expect(ids(validateBoard(nodes, edges))).toContain('ccr-no-remote')
    expect(ids(validateBoard([...nodes, node('r', 'remote')], edges))).not.toContain('ccr-no-remote')
  })

  it('flags a single data node as having no fault tolerance', () => {
    expect(ids(validateBoard([node('h', 'tier_hot')], []))).toContain('single-data-node')
  })

  it('reports unconnected components', () => {
    const nodes = [node('h', 'tier_hot'), node('k', 'kibana'), node('lonely', 'logstash')]
    const edges = [{ id: 'e', s: 'h', e: 'k' }]
    const orphan = validateBoard(nodes, edges).find((w) => w.id === 'orphans')
    expect(orphan.detail).toContain('Logstash')
  })

  it('ignores annotations when looking for orphans', () => {
    const nodes = [node('h', 'tier_hot'), node('k', 'kibana'), node('n', 'note')]
    const orphan = validateBoard(nodes, [{ id: 'e', s: 'h', e: 'k' }]).find((w) => w.id === 'orphans')
    expect(orphan).toBeUndefined()
  })

  it('treats nodes inside a connected zone as connected', () => {
    // logstash sits inside a zone that has a flow to the hot tier
    const nodes = [node('h', 'tier_hot', { x: 900 }), node('k', 'kibana', { x: 1200 }),
                   node('ls', 'logstash', { x: 60, y: 60 })]
    const zones = [{ id: 'z', x: 0, y: 0, w: 300, h: 300 }]
    const edges = [{ id: 'e1', s: 'z', e: 'h' }, { id: 'e2', s: 'h', e: 'k' }]
    expect(validateBoard(nodes, edges, zones).find((w) => w.id === 'orphans')).toBeUndefined()
    // without the zone flow it is still an orphan
    const orphan = validateBoard(nodes, [{ id: 'e2', s: 'h', e: 'k' }], zones).find((w) => w.id === 'orphans')
    expect(orphan.detail).toContain('Logstash')
  })
})

describe('capacity', () => {
  it('reads capacity units, defaulting bare numbers to TB', () => {
    expect(parseCapacityTB('40 TB')).toBe(40)
    expect(parseCapacityTB('2PB')).toBe(2048)
    expect(parseCapacityTB('512gb')).toBeCloseTo(0.5)
    expect(parseCapacityTB('12')).toBe(12)
    expect(parseCapacityTB('lots')).toBe(0)
    expect(parseCapacityTB(undefined)).toBe(0)
  })

  it('multiplies per-node capacity and hardware by the node count', () => {
    const nodes = [node('h', 'tier_hot', { props: { nodes: 3, capacity: '2 TB', cpu: 16, mem: 64 } })]
    const t = capacityTotals(nodes)
    expect(t.count).toBe(3)
    expect(t.cpu).toBe(48)
    expect(t.mem).toBe(192)
    expect(t.storageTB).toBe(6)
  })

  it('breaks storage down per tier', () => {
    const nodes = [
      node('h', 'tier_hot', { props: { nodes: 2, capacity: '2 TB' } }),
      node('f', 'tier_frozen', { props: { nodes: 1, capacity: '100 TB' } }),
    ]
    const t = capacityTotals(nodes)
    expect(t.tiers.map((x) => x.label)).toEqual(['Hot', 'Frozen'])
    expect(t.storageTB).toBe(104)
  })

  it('excludes annotations from the totals', () => {
    const t = capacityTotals([node('n', 'note', { props: { nodes: 99 } })])
    expect(t.count).toBe(0)
  })

  it('formats terabytes into readable units', () => {
    expect(formatTB(0)).toBe('0 TB')
    expect(formatTB(0.5)).toBe('0.5 TB')
    expect(formatTB(40)).toBe('40 TB')
    expect(formatTB(2048)).toBe('2 PB')
  })
})
