import { describe, it, expect } from 'vitest'
import { tidyLayout, alignLayout, laneOf, validateBoard, capacityTotals, parseCapacityTB, formatTB } from './whiteboardAnalysis'

const node = (id, type, extra = {}) => ({ id, type, x: 0, y: 0, ...extra })
const sizeOf = () => ({ w: 248, h: 96 })
const ids = (warnings) => warnings.map((w) => w.id)

describe('tidyLayout', () => {
  const tidy = (nodes, zones = []) => tidyLayout(nodes, zones, sizeOf)

  it('orders lanes left to right by data-flow stage', () => {
    const nodes = [node('k', 'kibana'), node('h', 'tier_hot'), node('a', 'agent')]
    const { nodes: pos } = tidy(nodes)
    // agent collects, hot tier stores, Kibana serves
    expect(pos.a.x).toBeLessThan(pos.h.x)
    expect(pos.h.x).toBeLessThan(pos.k.x)
  })

  it('stacks a lane vertically without overlapping', () => {
    const nodes = [node('h1', 'tier_hot'), node('h2', 'tier_warm', { y: 400 })]
    const { nodes: pos } = tidy(nodes)
    expect(pos.h1.x).toBe(pos.h2.x)
    expect(pos.h2.y - pos.h1.y).toBeGreaterThanOrEqual(96)
  })

  it('preserves the existing top-to-bottom order within a lane', () => {
    const nodes = [node('lower', 'tier_hot', { y: 500 }), node('upper', 'tier_warm', { y: 100 })]
    const { nodes: pos } = tidy(nodes)
    expect(pos.upper.y).toBeLessThan(pos.lower.y)
  })

  it('leaves annotations where the user put them', () => {
    const nodes = [node('k', 'kibana'), node('note', 'note', { x: 900, y: 900 })]
    const { nodes: pos } = tidy(nodes)
    expect(pos.note).toBeUndefined()
    expect(pos.k).toBeDefined()
  })

  it('routes generic sources into the collect lane via their flow override', () => {
    expect(laneOf(node('s', 'source'))).toBe('collect')
    expect(laneOf(node('k', 'kibana'))).toBe('serve')
  })

  it('returns nothing for an empty or annotation-only board', () => {
    expect(tidy([])).toEqual({ nodes: {}, zones: {} })
    expect(tidy([node('n', 'note')])).toEqual({ nodes: {}, zones: {} })
  })

  describe('zones', () => {
    // two store-tier nodes inside a frame, one collector outside it
    const zone = { id: 'z1', x: 0, y: 0, w: 600, h: 600, label: 'Cluster' }
    const nodes = [
      node('h', 'tier_hot', { x: 40, y: 60 }),
      node('w', 'tier_warm', { x: 40, y: 300 }),
      node('a', 'agent', { x: 900, y: 900 }),      // centre outside the zone
    ]

    it('keeps members inside their zone and refits the frame around them', () => {
      const { nodes: pos, zones: zpos } = tidy(nodes, [zone])
      const z = zpos.z1
      expect(z).toBeTruthy()
      for (const id of ['h', 'w']) {
        expect(pos[id].x).toBeGreaterThan(z.x)
        expect(pos[id].x + sizeOf().w).toBeLessThan(z.x + z.w)
        expect(pos[id].y).toBeGreaterThan(z.y)
        expect(pos[id].y + sizeOf().h).toBeLessThan(z.y + z.h)
      }
    })

    it('lanes the zone by its members: a store zone sits right of a free collector', () => {
      const { nodes: pos, zones: zpos } = tidy(nodes, [zone])
      expect(zpos.z1.x).toBeGreaterThan(pos.a.x)
    })

    it('does not overlap the zone with free nodes in another lane', () => {
      const { nodes: pos, zones: zpos } = tidy(nodes, [zone])
      const z = zpos.z1
      // the free agent is fully clear of the refitted frame
      const clear = pos.a.x + sizeOf().w <= z.x || pos.a.x >= z.x + z.w
        || pos.a.y + sizeOf().h <= z.y || pos.a.y >= z.y + z.h
      expect(clear).toBe(true)
    })

    it('leaves an empty zone frame alone', () => {
      const empty = { id: 'z2', x: 2000, y: 2000, w: 300, h: 200, label: 'Later' }
      const { zones: zpos } = tidy(nodes, [zone, empty])
      expect(zpos.z2).toBeUndefined()
    })

    it('gives a node sitting in two overlapping frames to the last-drawn zone', () => {
      const zb = { id: 'z2', x: 30, y: 250, w: 600, h: 600, label: 'Also storage' }
      // h sits in both frames; z2 is later in draw order, so it wins h
      const two = [node('h', 'tier_hot', { x: 40, y: 300 }), node('c', 'tier_cold', { x: 40, y: 700 })]
      const { zones: zpos } = tidy(two, [{ ...zone, h: 400 }, zb])
      // zone (empty after membership) is untouched; z2 wraps both tiers
      expect(zpos.z1).toBeUndefined()
      expect(zpos.z2).toBeTruthy()
    })
  })
})

describe('alignLayout', () => {
  const align = (nodes, zones = []) => alignLayout(nodes, zones, sizeOf)

  it('snaps a near-row onto one centre line', () => {
    const nodes = [
      node('a', 'agent', { x: 0, y: 100 }),
      node('b', 'kafka', { x: 400, y: 130 }),   // 30px of drift — clearly the same row
    ]
    const { nodes: pos } = align(nodes)
    expect(pos.a.y).toBe(pos.b.y)
    expect(pos.a.x ?? 0).toBe(0)                // columns are far apart, x untouched
  })

  it('snaps a near-column onto one centre line', () => {
    const nodes = [
      node('a', 'tier_hot', { x: 80, y: 0 }),
      node('b', 'tier_warm', { x: 110, y: 300 }),
    ]
    const { nodes: pos } = align(nodes)
    const xOf = (id, n) => pos[id]?.x ?? n.x
    expect(xOf('a', nodes[0])).toBe(xOf('b', nodes[1]))
  })

  it('leaves a block placed below everything exactly where it is', () => {
    // the management-components case: below the flow, its own row and column
    const nodes = [
      node('a', 'agent', { x: 0, y: 0 }),
      node('h', 'tier_hot', { x: 400, y: 0 }),
      node('mgmt', 'node_master', { x: 200, y: 600 }),
    ]
    const { nodes: pos } = align(nodes)
    expect(pos.mgmt).toBeUndefined()            // no nudge needed, no lane reshuffle
  })

  it('reports only the nodes that actually move', () => {
    const nodes = [node('a', 'agent', { x: 0, y: 0 }), node('b', 'kibana', { x: 800, y: 400 })]
    expect(align(nodes)).toEqual({ nodes: {}, zones: {} })
  })

  it('grows a zone rather than let an aligned member poke out of it', () => {
    const zone = { id: 'z1', x: 0, y: 0, w: 280, h: 200, label: 'Cluster' }
    const nodes = [
      node('m', 'tier_hot', { x: 8, y: 40 }),     // inside the frame
      node('o', 'tier_warm', { x: 88, y: 400 }),  // same column, outside the frame
    ]
    const { nodes: pos, zones: zpos } = align(nodes, [zone])
    expect(pos.m.x).toBe(pos.o.x)                 // the column straightened
    // the nudge pushed m's right edge past 280, so the frame widened to keep it
    expect(pos.m.x + sizeOf().w).toBeGreaterThan(280)
    expect(zpos.z1.w).toBeGreaterThanOrEqual(pos.m.x + sizeOf().w - zpos.z1.x)
  })

  it('ignores annotations on both sides of the nudge', () => {
    const nodes = [node('k', 'kibana', { x: 0, y: 0 }), node('n', 'note', { x: 8, y: 30 })]
    const { nodes: pos } = align(nodes)
    expect(pos.n).toBeUndefined()                 // notes stay put
    expect(pos.k).toBeUndefined()                 // and don't pull real nodes around
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

  it('counts master-eligible data nodes, not just dedicated master boxes', () => {
    // the small-cluster shape: three nodes that are each master + data
    const nodes = [node('d', 'node_data', { props: { nodes: 3, roles: ['master', 'data'] } })]
    const found = ids(validateBoard(nodes, []))
    expect(found).not.toContain('masters-missing')
    expect(found).not.toContain('masters-few')
  })

  it('still flags a quorum that the roles leave short', () => {
    const nodes = [node('d', 'node_data', { props: { nodes: 2, roles: ['master', 'data'] } })]
    expect(ids(validateBoard(nodes, []))).toContain('masters-few')
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
