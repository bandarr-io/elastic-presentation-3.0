import { describe, it, expect } from 'vitest'
import { sizeCluster, romRows, romTSV, RU_SKU, SIZING_DEFAULTS } from './whiteboardSizing'

const only = (result, key) => result.tiers.find((t) => t.key === key)

describe('sizeCluster', () => {
  it('skips tiers with no retention', () => {
    const out = sizeCluster({ dailyGB: 100, days: { hot: 30, warm: 0, cold: 0, frozen: 0 } })
    expect(out.tiers.map((t) => t.key)).toEqual(['hot'])
  })

  it('returns nothing when there is no ingest', () => {
    expect(sizeCluster({ dailyGB: 0 }).tiers).toEqual([])
    expect(sizeCluster({ dailyGB: 'not a number' }).tiers).toEqual([])
  })

  it('multiplies replicated tiers by the replica count', () => {
    const days = { hot: 10, warm: 0, cold: 0, frozen: 0 }
    const one = only(sizeCluster({ dailyGB: 1024, replicas: 1, days }), 'hot')
    const none = only(sizeCluster({ dailyGB: 1024, replicas: 0, days }), 'hot')
    expect(none.dataTB).toBe(10)
    expect(one.dataTB).toBe(20)
  })

  it('leaves searchable-snapshot tiers unreplicated', () => {
    const days = { hot: 0, warm: 0, cold: 0, frozen: 10 }
    const frozen = only(sizeCluster({ dailyGB: 1024, replicas: 2, days }), 'frozen')
    expect(frozen.dataTB).toBe(10)
    expect(frozen.copies).toBe(1)
  })

  it('applies the index overhead factor', () => {
    const days = { hot: 10, warm: 0, cold: 0, frozen: 0 }
    const out = only(sizeCluster({ dailyGB: 1024, replicas: 0, overhead: 1.5, days }), 'hot')
    expect(out.dataTB).toBe(15)
  })

  it('derives node count from the tier disk-to-RAM ratio', () => {
    // 64 GB RAM x 30 = 1920 GB per hot node, so 4 TB needs 3 of them
    const days = { hot: 4, warm: 0, cold: 0, frozen: 0 }
    const hot = only(sizeCluster({ dailyGB: 1024, replicas: 0, nodeRAM: 64, days }), 'hot')
    expect(hot.perNodeTB).toBeCloseTo(1.875)
    expect(hot.nodes).toBe(3)
    expect(hot.ramGB).toBe(192)
  })

  it('holds far more per node on frozen than on hot', () => {
    const days = { hot: 0, warm: 0, cold: 0, frozen: 100 }
    const frozen = only(sizeCluster({ dailyGB: 1024, days }), 'frozen')
    expect(frozen.perNodeTB).toBeCloseTo(62.5)
    expect(frozen.nodes).toBe(2)
  })

  it('keeps two nodes on a replicated tier so a replica has somewhere to go', () => {
    const days = { hot: 1, warm: 0, cold: 0, frozen: 0 }
    expect(only(sizeCluster({ dailyGB: 1, replicas: 1, days }), 'hot').nodes).toBe(2)
    expect(only(sizeCluster({ dailyGB: 1, replicas: 0, days }), 'hot').nodes).toBe(1)
  })

  it('counts only searchable-snapshot tiers towards object storage', () => {
    const out = sizeCluster({
      dailyGB: 1024, replicas: 1, days: { hot: 10, warm: 0, cold: 10, frozen: 10 },
    })
    expect(out.objectStoreTB).toBe(20)
    expect(out.dataTB).toBe(40)   // hot is 20 with its replica
    expect(out.retentionDays).toBe(30)
  })

  it('rolls up nodes and memory across tiers', () => {
    const out = sizeCluster({ dailyGB: 1024, nodeRAM: 64, days: { hot: 4, warm: 0, cold: 0, frozen: 100 } })
    expect(out.nodes).toBe(out.tiers.reduce((n, t) => n + t.nodes, 0))
    expect(out.ramGB).toBe(out.nodes * 64)
  })

  it('falls back to defaults for missing or junk input', () => {
    const out = sizeCluster({ dailyGB: 1024, nodeRAM: -5, overhead: 'x', replicas: undefined })
    expect(out.input.nodeRAM).toBe(SIZING_DEFAULTS.nodeRAM)
    expect(out.input.overhead).toBe(1)
    expect(out.input.replicas).toBe(SIZING_DEFAULTS.replicas)
  })
})

describe('romRows', () => {
  const totals = {
    mem: 1024,
    tiers: [
      { type: 'tier_hot', label: 'Hot', count: 6, storageTB: 12, mem: 384 },
      { type: 'tier_frozen', label: 'Frozen', count: 2, storageTB: 500, mem: 128 },
    ],
  }

  it('emits a resource-unit line per tier, rounded up', () => {
    const rows = romRows(totals)
    expect(rows[0]).toMatchObject({ sku: RU_SKU, quantity: 6 })
    expect(rows[0].description).toBe('Hot tier — 6 nodes, 12 TB storage')
    expect(rows[1]).toMatchObject({ quantity: 2 })
    expect(rows[1].description).toBe('Frozen tier — 2 nodes, 500 TB storage')
  })

  it('rolls the non-tier nodes into one line', () => {
    const rows = romRows(totals)
    expect(rows[2].description).toBe('Master, ML, and coordinating nodes')
    expect(rows[2].quantity).toBe(8)   // 1024 total - 512 in tiers = 512 GB
  })

  it('omits the remainder line when every node is in a tier', () => {
    const rows = romRows({ mem: 512, tiers: totals.tiers })
    expect(rows).toHaveLength(2)
  })

  it('rounds a part-used resource unit up to a whole one', () => {
    const rows = romRows({ mem: 0, tiers: [{ label: 'Hot', count: 1, storageTB: 0, mem: 65 }] })
    expect(rows[0].quantity).toBe(2)
  })

  it('skips tiers with no memory set', () => {
    expect(romRows({ mem: 0, tiers: [{ label: 'Hot', count: 3, storageTB: 6, mem: 0 }] })).toEqual([])
  })

  it('handles an empty board', () => {
    expect(romRows()).toEqual([])
    expect(romRows({})).toEqual([])
  })
})

describe('romTSV', () => {
  it('lays rows out in the importer column order with prices left blank', () => {
    const text = romTSV(romRows({ mem: 0, tiers: [{ label: 'Hot', count: 2, storageTB: 4, mem: 128 }] }))
    expect(text).toBe(`${RU_SKU}\tHot tier — 2 nodes, 4 TB storage\t2\t\t`)
  })

  it('puts one line item per row', () => {
    const rows = romRows({ mem: 256, tiers: [{ label: 'Hot', count: 2, storageTB: 4, mem: 128 }] })
    expect(romTSV(rows).split('\n')).toHaveLength(2)
  })

  it('handles no rows', () => {
    expect(romTSV()).toBe('')
  })
})
