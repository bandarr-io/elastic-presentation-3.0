import { describe, it, expect } from 'vitest'
import {
  sizeCluster, romRows, romTSV, RU_SKU, RU_LEAD, RU_TERM, SIZING_DEFAULTS, MASTER_NODES,
  MASTER_RAM_GB, recommendInstance, recommendHardware, SIZING_PROVIDERS, ML_RAM_GB, ML_NODES_MIN,
  ECU_SKU, ECU_LEAD, LICENSE_ERU, LICENSE_ECU, licenseModelFor,
} from './whiteboardSizing'
import { echProfiles } from '../data/echInstanceConfigs'

const only = (result, key) => result.tiers.find((t) => t.key === key)

/* Most of the raw-ratio arithmetic is only exercised off Elastic Cloud, where
   node RAM is a free input instead of an ECH size ladder. */
const SELF = { provider: 'selfmanaged' }

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
    const hot = only(sizeCluster({ ...SELF, dailyGB: 1024, replicas: 0, nodeRAM: 64, days }), 'hot')
    expect(hot.perNodeTB).toBeCloseTo(1.875)
    expect(hot.nodes).toBe(3)
    expect(hot.ramGB).toBe(192)
  })

  it('holds far more per node on frozen than on hot', () => {
    const days = { hot: 0, warm: 0, cold: 0, frozen: 100 }
    const frozen = only(sizeCluster({ ...SELF, dailyGB: 1024, days }), 'frozen')
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

  it('rolls up nodes and memory across tiers, masters included', () => {
    const days = { hot: 4, warm: 0, cold: 0, frozen: 100 }
    const bare = sizeCluster({ ...SELF, dailyGB: 1024, nodeRAM: 64, days, masters: false })
    expect(bare.nodes).toBe(bare.tiers.reduce((n, t) => n + t.nodes, 0))
    expect(bare.ramGB).toBe(bare.nodes * 64)

    const withMasters = sizeCluster({ ...SELF, dailyGB: 1024, nodeRAM: 64, days, masters: true })
    expect(withMasters.nodes).toBe(bare.nodes + MASTER_NODES)
    expect(withMasters.ramGB).toBe(bare.ramGB + MASTER_NODES * MASTER_RAM_GB)
  })

  it('sizes Logstash from throughput when asked for, with a two-node HA floor', () => {
    const stackOf = (dailyGB, extra) => sizeCluster({ dailyGB, logstash: true, ...extra }).stack
    expect(stackOf(500).logstash).toBe(2)                 // under 1 TB/day still needs a pair
    expect(stackOf(3000).logstash).toBe(3)                // ~3 TB/day
    expect(stackOf(500, { logstash: false }).logstash).toBe(0)
    expect(stackOf(0).logstash).toBe(0)                   // nothing to ingest
  })

  it('leaves Logstash off by default — agent-direct is the default story', () => {
    expect(SIZING_DEFAULTS.logstash).toBe(false)
    expect(sizeCluster({ dailyGB: 500 }).stack.logstash).toBe(0)
  })

  it('sizes Kibana from concurrent users, with a two-instance HA floor', () => {
    const stackOf = (users) => sizeCluster({ dailyGB: 500, users }).stack
    expect(stackOf(50).kibana).toBe(2)
    expect(stackOf(250).kibana).toBe(3)
    expect(stackOf(0).kibana).toBe(0)
  })

  it('adds the three-master quorum once the data tiers reach six nodes', () => {
    // 500 GB/day lands 7 data nodes on the defaults; 50 GB/day only 4
    expect(sizeCluster({ dailyGB: 500 }).stack.masters).toBe(3)
    expect(sizeCluster({ dailyGB: 50 }).stack.masters).toBe(0)
    expect(sizeCluster({ dailyGB: 500, masters: false }).stack.masters).toBe(0)
  })

  it('marks a monitoring cluster for the drawing unless switched off', () => {
    expect(sizeCluster({ dailyGB: 500 }).stack.monitoring).toBe(1)
    expect(sizeCluster({ dailyGB: 500, monitoring: false }).stack.monitoring).toBe(0)
  })

  it('passes the agent count through as a whole number', () => {
    expect(sizeCluster({ dailyGB: 500, agents: '250' }).stack.agents).toBe(250)
    expect(sizeCluster({ dailyGB: 500, agents: 0 }).stack.agents).toBe(0)
  })

  it('lets one tier override the global RAM per node, recounting its nodes', () => {
    const days = { hot: 30, warm: 0, cold: 0, frozen: 0 }
    const base = sizeCluster({ ...SELF, dailyGB: 1024, nodeRAM: 64, days, masters: false })
    const halved = sizeCluster({ ...SELF, dailyGB: 1024, nodeRAM: 64, days, masters: false, ram: { hot: 32 } })
    const hot = (r) => r.tiers.find((t) => t.key === 'hot')
    expect(hot(halved).ram).toBe(32)
    expect(hot(halved).perNodeTB).toBe(hot(base).perNodeTB / 2)   // half the RAM carries half the disk
    expect(hot(halved).nodes).toBeGreaterThan(hot(base).nodes)
    expect(halved.ramGB).toBe(hot(halved).nodes * 32)
  })

  it('counts master RAM overrides into the rollup', () => {
    const days = { hot: 30, warm: 0, cold: 0, frozen: 0 }
    const base = sizeCluster({ ...SELF, dailyGB: 500, days })
    const bigger = sizeCluster({ ...SELF, dailyGB: 500, days, ram: { master: 16 } })
    expect(bigger.ramGB - base.ramGB).toBe(MASTER_NODES * (16 - MASTER_RAM_GB))
  })

  it('falls back to defaults for missing or junk input', () => {
    const out = sizeCluster({ dailyGB: 1024, nodeRAM: -5, overhead: 'x', replicas: undefined })
    expect(out.input.nodeRAM).toBe(SIZING_DEFAULTS.nodeRAM)
    expect(out.input.overhead).toBe(1)
    expect(out.input.replicas).toBe(SIZING_DEFAULTS.replicas)
  })
})

describe('sizeCluster from per-source volumes', () => {
  it('sums the sources into the ingest total', () => {
    const out = sizeCluster({ ...SELF, logstash: true, sources: [{ gb: 300 }, { gb: 200 }] })
    expect(out.input.dailyGB).toBe(500)
    // Logstash is derived from the summed rate like any other input
    expect(out.stack.logstash).toBe(2)
  })

  it('ages each source only as far as its own retention', () => {
    const out = sizeCluster({
      ...SELF, replicas: 0, overhead: 1,
      days: { hot: 1, warm: 0, cold: 10, frozen: 358 },
      sources: [{ gb: 100, days: 5 }, { gb: 100 }],
    })
    const tier = (key) => out.tiers.find((t) => t.key === key)
    // both sources spend the hot day; the 5-day source only gets 4 cold days
    expect(tier('hot').dataTB).toBeCloseTo(200 / 1024)
    expect(tier('cold').dataTB).toBeCloseTo((4 * 100 + 10 * 100) / 1024)
    // and never reaches frozen, which holds the open-ended source alone
    expect(tier('frozen').dataTB).toBeCloseTo((358 * 100) / 1024)
  })

  it('drops tiers that every source expires before', () => {
    const out = sizeCluster({
      ...SELF, days: { hot: 1, warm: 0, cold: 10, frozen: 358 },
      sources: [{ gb: 100, days: 5 }],
    })
    expect(out.tiers.map((t) => t.key)).toEqual(['hot', 'cold'])
    expect(out.objectStoreTB).toBeCloseTo((4 * 100) / 1024)
  })
})

describe('sizeCluster on Elastic Cloud', () => {
  it('offers every ECH provider plus self-managed', () => {
    expect(SIZING_PROVIDERS.map(([key]) => key)).toEqual(['aws', 'gcp', 'azure', 'selfmanaged'])
  })

  it('sizes hot from the documented disk:RAM ratio, scaling out past the top rung', () => {
    // 10 TB at i8g's 27:1 needs ~379 GB RAM; the ladder tops out at 60 GB nodes
    const days = { hot: 10, warm: 0, cold: 0, frozen: 0 }
    const hot = only(sizeCluster({ provider: 'aws', dailyGB: 1024, replicas: 0, days }), 'hot')
    expect(hot.config).toBe('aws.es.datahot.i8g')
    expect(hot.ram).toBe(60)
    expect(hot.nodes).toBe(7)
    expect(hot.perNodeTB).toBeCloseTo((60 * 27) / 1024)
  })

  it('scales a small workload up the RAM ladder instead of out', () => {
    // ~0.5 TB needs ~19 GB RAM at 27:1 -> one 30 GB node, not several small ones
    const days = { hot: 5, warm: 0, cold: 0, frozen: 0 }
    const hot = only(sizeCluster({ provider: 'aws', dailyGB: 100, replicas: 0, days }), 'hot')
    expect(hot.ram).toBe(30)
    expect(hot.nodes).toBe(1)
  })

  it('snaps RAM overrides up the ladder — ECH has no 20 GB node', () => {
    const days = { hot: 10, warm: 0, cold: 0, frozen: 0 }
    const hot = only(sizeCluster({ provider: 'aws', dailyGB: 1024, days, ram: { hot: 20 } }), 'hot')
    expect(hot.ram).toBe(30)
  })

  it('uses each provider\'s own ratios and ladders', () => {
    // GCP warm is 190:1 on a 2..64 GB ladder: 19 TB -> ~102 GB RAM -> 2 x 64 GB
    const days = { hot: 0, warm: 19, cold: 0, frozen: 0 }
    const warm = only(sizeCluster({ provider: 'gcp', dailyGB: 1024, replicas: 0, days }), 'warm')
    expect(warm.config).toBe('gcp.es.datawarm.n2.68x10x190')
    expect(warm.ram).toBe(64)
    expect(warm.nodes).toBe(2)
  })

  it('counts frozen against the object store it addresses, not its local cache', () => {
    // 1 PB addressed at 1000:1 -> ~1 TB of RAM -> 18 x 60 GB cache nodes,
    // where the cache's own 74:1 ratio would have demanded hundreds
    const days = { hot: 0, warm: 0, cold: 0, frozen: 1000 }
    const frozen = only(sizeCluster({ provider: 'aws', dailyGB: 1024, days }), 'frozen')
    expect(frozen.nodes).toBe(18)
    expect(frozen.ram).toBe(60)
  })

  it('snaps master RAM to the master ladder', () => {
    // 16 GB isn't a c8gd master size; it becomes 30 GB
    const days = { hot: 30, warm: 0, cold: 0, frozen: 0 }
    const base = sizeCluster({ provider: 'aws', dailyGB: 500, days })
    const bigger = sizeCluster({ provider: 'aws', dailyGB: 500, days, ram: { master: 16 } })
    expect(bigger.ramGB - base.ramGB).toBe(MASTER_NODES * (30 - MASTER_RAM_GB))
  })

  it('lets the hot profile swap the hot-tier hardware', () => {
    const days = { hot: 10, warm: 30, cold: 0, frozen: 0 }
    const base = sizeCluster({ provider: 'aws', dailyGB: 1024, replicas: 0, days })
    const vector = sizeCluster({ provider: 'aws', dailyGB: 1024, replicas: 0, days,
                                 profile: 'Vector Search Optimized' })
    // r6gd carries far less disk per GB of RAM (6:1 vs i8g's 27:1)
    expect(only(vector, 'hot').config).toBe('aws.es.datahot.r6gd')
    expect(only(vector, 'hot').nodes).toBeGreaterThan(only(base, 'hot').nodes)
    // the profile is a hot-tier choice; warm is untouched
    expect(only(vector, 'warm').config).toBe(only(base, 'warm').config)
  })

  it('falls back to the default profile when the name is unknown', () => {
    const days = { hot: 10, warm: 0, cold: 0, frozen: 0 }
    const out = sizeCluster({ provider: 'gcp', dailyGB: 1024, days, profile: 'Mainframe Optimized' })
    expect(only(out, 'hot').config).toBe('gcp.es.datahot.n2.68x10x45')
  })

  it('narrows hardware to what the region offers', () => {
    const days = { hot: 10, warm: 0, cold: 0, frozen: 0 }
    // Paris has no i8g, so Storage Optimized falls through to the dense i3en
    const paris = sizeCluster({ provider: 'aws', dailyGB: 1024, days, region: 'aws-eu-west-3' })
    expect(only(paris, 'hot').config).toBe('aws.es.datahot.i3en')
    // N. Virginia has the full current generation
    const virginia = sizeCluster({ provider: 'aws', dailyGB: 1024, days, region: 'us-east-1' })
    expect(only(virginia, 'hot').config).toBe('aws.es.datahot.i8g')
  })

  it('lists only the profiles a region offers', () => {
    expect(echProfiles('gcp', 'gcp-us-central1')).toContain('CPU Optimized (ARM)')
    expect(echProfiles('gcp', 'gcp-us-west1')).not.toContain('CPU Optimized (ARM)')
    expect(echProfiles('azure', 'azure-centralus')).not.toContain('Vector Search Optimized')
    // no region means everything
    expect(echProfiles('aws')).toHaveLength(5)
  })
})

describe('sizeCluster machine learning nodes', () => {
  it('leaves ML out of the result unless it is switched on', () => {
    const out = sizeCluster({ dailyGB: 500 })
    expect(SIZING_DEFAULTS.ml).toBe(false)
    expect(out.stack.ml).toBe(0)
    expect(recommendHardware(out).ml).toBeUndefined()
  })

  it('adds an HA pair at or above the 16 GB floor when enabled', () => {
    const out = sizeCluster({ provider: 'aws', dailyGB: 500, ml: true })
    expect(out.stack.ml).toBeGreaterThanOrEqual(ML_NODES_MIN)
    expect(out.stack.mlRAM).toBeGreaterThanOrEqual(ML_RAM_GB)
    // a light workload lands exactly on the HA pair of floor-sized nodes
    expect(out.stack.ml).toBe(2)
    expect(out.stack.mlRAM).toBe(16)
  })

  it('grows ML capacity with ingest volume', () => {
    const small = sizeCluster({ provider: 'aws', dailyGB: 500, ml: true })
    const large = sizeCluster({ provider: 'aws', dailyGB: 20000, ml: true })
    const capacity = (r) => r.stack.ml * r.stack.mlRAM
    expect(capacity(large)).toBeGreaterThan(capacity(small))
  })

  it('re-derives the node count from a RAM override, snapping up the ladder', () => {
    const base = sizeCluster({ provider: 'aws', dailyGB: 20000, ml: true })
    const override = sizeCluster({ provider: 'aws', dailyGB: 20000, ml: true, ram: { ml: 16 } })
    expect(override.stack.mlRAM).toBe(16)              // ECH has a 16 GB ML rung
    expect(override.stack.ml).toBeGreaterThan(base.stack.ml)   // smaller nodes, more of them
  })

  it('keeps ML nodes out of the data-node count and storage rollups', () => {
    // 500 GB/day is 7 data nodes -> three masters either way; ML must not shift that
    const withMl = sizeCluster({ provider: 'aws', dailyGB: 500, ml: true })
    const without = sizeCluster({ provider: 'aws', dailyGB: 500 })
    expect(withMl.stack.masters).toBe(without.stack.masters)
    // 50 GB/day stays below the six-node threshold, and ML can't tip it over
    expect(sizeCluster({ provider: 'aws', dailyGB: 50, ml: true }).stack.masters).toBe(0)
    // ML holds no shards, so data and object-store totals are untouched
    expect(withMl.dataTB).toBe(without.dataTB)
    expect(withMl.objectStoreTB).toBe(without.objectStoreTB)
  })

  it('rolls ML memory into the totals a quote is billed from', () => {
    const withMl = sizeCluster({ provider: 'aws', dailyGB: 500, ml: true })
    const without = sizeCluster({ provider: 'aws', dailyGB: 500 })
    expect(withMl.nodes - without.nodes).toBe(withMl.stack.ml)
    expect(withMl.ramGB - without.ramGB).toBe(withMl.stack.ml * withMl.stack.mlRAM)
    // and the quote bills resource units against that memory, ML included
    const rows = romRows({ mem: withMl.ramGB, tiers: [] })
    expect(rows[0].ramGB).toBe(withMl.ramGB)
    expect(rows[0].quantity).toBe(Math.ceil(withMl.ramGB / 64))
  })
})

describe('recommendInstance', () => {
  it('maps each role to its best-practice family', () => {
    expect(recommendInstance('hot', 64).instance).toBe('i3en.2xlarge')       // local NVMe for indexing
    expect(recommendInstance('frozen', 64).instance).toBe('i3en.2xlarge')    // NVMe snapshot cache
    expect(recommendInstance('cold', 64).instance).toBe('d3en.4xlarge')      // dense cheap disk
    expect(recommendInstance('master', 8).instance).toBe('m6g.large')
    expect(recommendInstance('logstash', 16).instance).toBe('c6i.2xlarge')
    expect(recommendInstance('kibana', 8).instance).toBe('m6i.large')
  })

  it('rounds up to the smallest rung that fits the RAM', () => {
    expect(recommendInstance('hot', 48).instance).toBe('i3en.2xlarge')   // 48 GB needs the 64 GB box
    expect(recommendInstance('hot', 16).instance).toBe('i3en.large')
  })

  it('tops out at the biggest rung and rejects unknown roles', () => {
    expect(recommendInstance('hot', 4096).instance).toBe('i3en.6xlarge')
    expect(recommendInstance('mainframe', 64)).toBeNull()
  })
})

describe('recommendHardware', () => {
  it('produces a complete hardware row for every drawn component', () => {
    const rows = recommendHardware(sizeCluster({ ...SELF, dailyGB: 500, logstash: true }))
    expect(Object.keys(rows)).toEqual(['hot', 'cold', 'frozen', 'master', 'logstash', 'kibana'])
    expect(rows.hot).toMatchObject({ mem: 64, instance: 'i3en.2xlarge', cpu: 8, disk: '5 TB NVMe' })
    expect(rows.master).toMatchObject({ count: 3, mem: MASTER_RAM_GB, instance: 'm6g.large' })
    expect(rows.logstash.countLabel).toBe('inst')
  })

  it('follows RAM overrides into a different instance pick', () => {
    const rows = recommendHardware(sizeCluster({ ...SELF, dailyGB: 500, ram: { hot: 32, master: 16 } }))
    expect(rows.hot.instance).toBe('i3en.xlarge')
    expect(rows.master.instance).toBe('m6g.xlarge')
  })

  it('leaves out the pieces that are not drawn', () => {
    const rows = recommendHardware(sizeCluster({ ...SELF, dailyGB: 500, users: 0, logstash: false, masters: false }))
    expect(Object.keys(rows)).toEqual(['hot', 'cold', 'frozen'])
  })

  it('names ECH instance configurations with documented ratios on Elastic Cloud', () => {
    const rows = recommendHardware(sizeCluster({ dailyGB: 500 }))   // default provider: aws
    expect(rows.hot.instance).toBe('aws.es.datahot.i8g')
    expect(rows.hot.cpu).toBe(Math.round(0.133 * rows.hot.mem))    // published vCPU/RAM ratio
    expect(rows.hot.disk).toBe('1.6 TB NVMe')                      // 60 GB x 27:1
    expect(rows.master).toMatchObject({ instance: 'aws.es.master.c8gd', mem: 8, disk: 'NVMe' })
    expect(rows.kibana).toMatchObject({ instance: 'aws.kibana.c8gd', mem: 8, cpu: 4 })
  })

  it('walks the master generations down by region on AWS', () => {
    const rowsFor = (region) => recommendHardware(sizeCluster({ provider: 'aws', dailyGB: 500, region }))
    expect(rowsFor('us-east-1').master.instance).toBe('aws.es.master.c8gd')     // Graviton4 present
    expect(rowsFor('aws-eu-west-3').master.instance).toBe('aws.es.master.c6gd') // Paris: no c8gd
    expect(rowsFor('aws-me-south-1').master.instance).toBe('aws.es.master.c5d') // Bahrain: Intel only
    expect(rowsFor('us-gov-east-1').master.instance).toBe('aws.es.master.c7gd') // GovCloud
  })

  it('follows the hot profile into the hardware row', () => {
    const rows = recommendHardware(sizeCluster({ provider: 'aws', dailyGB: 500,
                                                 profile: 'CPU Optimized' }))
    expect(rows.hot.instance).toBe('aws.es.datahot.c8gd')
    expect(rows.hot.cpu).toBe(Math.round(0.533 * rows.hot.mem))   // CPU-optimized ratio
    expect(rows.cold.instance).toBe('aws.es.datacold.i3en')       // other tiers unaffected
  })

  it('adds an ML hardware row with each provider\'s ML instance configuration', () => {
    const aws = recommendHardware(sizeCluster({ provider: 'aws', dailyGB: 500, ml: true }))
    expect(aws.ml).toMatchObject({ label: 'ML nodes', instance: 'aws.es.ml.c5d', mem: 16 })
    expect(aws.ml.count).toBeGreaterThanOrEqual(2)
    // GovCloud has no c5d ML config, so it falls through to m5dn
    const gov = recommendHardware(sizeCluster({ provider: 'aws', dailyGB: 500, ml: true, region: 'us-gov-east-1' }))
    expect(gov.ml.instance).toBe('aws.es.ml.m5dn')
    expect(recommendHardware(sizeCluster({ provider: 'gcp', dailyGB: 500, ml: true })).ml.instance)
      .toBe('gcp.es.ml.n2.68x32x45')
    expect(recommendHardware(sizeCluster({ provider: 'azure', dailyGB: 500, ml: true })).ml.instance)
      .toBe('azure.es.ml.fsv2')
    // self-managed falls back to a general-purpose compute box
    expect(recommendHardware(sizeCluster({ ...SELF, dailyGB: 500, ml: true })).ml.instance)
      .toBe('m6i.xlarge')
  })

  it('keeps Logstash on plain compute boxes from the matching cloud', () => {
    const aws = recommendHardware(sizeCluster({ provider: 'aws', dailyGB: 500, logstash: true }))
    const gcp = recommendHardware(sizeCluster({ provider: 'gcp', dailyGB: 500, logstash: true }))
    const azure = recommendHardware(sizeCluster({ provider: 'azure', dailyGB: 500, logstash: true }))
    expect(aws.logstash.instance).toBe('c6i.2xlarge')
    expect(gcp.logstash.instance).toBe('n2-standard-4')
    expect(azure.logstash.instance).toBe('F8s v2')
    expect(gcp.hot.instance).toBe('gcp.es.datahot.n2.68x10x45')
    expect(azure.hot.instance).toBe('azure.es.datahot.edsv4')
  })
})

describe('romRows', () => {
  const totals = {
    mem: 1024,
    count: 8,
    storageTB: 512,
    tiers: [
      { type: 'tier_hot', label: 'Hot', count: 6, storageTB: 12, mem: 384 },
      { type: 'tier_frozen', label: 'Frozen', count: 2, storageTB: 500, mem: 128 },
    ],
  }

  it('rolls the whole deployment into one resource-unit line', () => {
    const rows = romRows(totals)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ sku: RU_SKU, descLead: RU_LEAD, term: RU_TERM, quantity: 16 })
    expect(rows[0].description).toBe('1,024 GB memory, 8 nodes, 512 TB storage (Hot, Frozen)')
  })

  it('rounds total memory up once rather than each tier separately', () => {
    // 65 + 65 GB is three part-used units billed per tier, but only three whole
    // units in total — rounding per tier would over-count the deal.
    const split = { mem: 130, tiers: [{ label: 'Hot', count: 1, mem: 65 }, { label: 'Cold', count: 1, mem: 65 }] }
    expect(romRows(split)[0].quantity).toBe(3)
  })

  it('counts memory that no tier holds, like masters and ML', () => {
    const rows = romRows({ mem: 1024, tiers: [{ label: 'Hot', count: 6, storageTB: 12, mem: 384 }] })
    expect(rows[0].quantity).toBe(16)   // all 1024 GB, not just the tier's 384
    expect(rows[0].ramGB).toBe(1024)
  })

  it('falls back to the tier rollup when the board totals omit it', () => {
    const rows = romRows({ mem: 128, tiers: [{ label: 'Hot', count: 2, storageTB: 4, mem: 128 }] })
    expect(rows[0].description).toBe('128 GB memory, 2 nodes, 4 TB storage (Hot)')
  })

  it('carries the list price and discount it is given', () => {
    const rows = romRows(totals, { unitPrice: 13400, discount: 10 })
    expect(rows[0]).toMatchObject({ unitPrice: '13400', discount: '10' })
  })

  it('leaves price and discount blank when none are set', () => {
    expect(romRows(totals)[0]).toMatchObject({ unitPrice: '', discount: '' })
  })

  it('has nothing to quote without memory', () => {
    expect(romRows()).toEqual([])
    expect(romRows({})).toEqual([])
    expect(romRows({ mem: 0, tiers: [{ label: 'Hot', count: 3, storageTB: 6, mem: 0 }] })).toEqual([])
  })

  it('bills no resource units for Logstash memory', () => {
    // Elastic counts Logstash for information only, so it can't reach the count
    const rows = romRows({ ...totals, logstashMem: 64 })
    expect(rows[0].quantity).toBe(15)     // (1024 - 64) / 64, not 16
    expect(rows[0].ramGB).toBe(960)
    expect(rows[0].description).toContain('960 GB memory')
    expect(rows[0].descNote).toContain('Logstash')
  })

  it('says nothing about Logstash when the board has none', () => {
    expect(romRows(totals)[0].descNote).toBe('')
  })
})

/* Cloud is metered consumption rather than licensed capacity, so the quantity
   is the ECU figure off the pricing calculator at the fixed $1.00 rate. */
describe('romRows on the Cloud consumption meter', () => {
  const totals = { mem: 1024, count: 8, storageTB: 512, tiers: [{ label: 'Hot', count: 8, storageTB: 512, mem: 1024 }] }
  const cloud = (ecuTotal, extra) => romRows(totals, { model: LICENSE_ECU, ecuTotal, ...extra })

  it('quotes the consumption total at one dollar an ECU', () => {
    const row = cloud(250000)[0]
    expect(row).toMatchObject({ sku: ECU_SKU, descLead: ECU_LEAD, quantity: 250000, unitPrice: '1' })
  })

  it('ignores the resource-unit list price, which does not apply to Cloud', () => {
    expect(cloud(1000, { unitPrice: 13400 })[0].unitPrice).toBe('1')
  })

  it('still carries a negotiated discount', () => {
    expect(cloud(1000, { discount: 20 })[0].discount).toBe('20')
  })

  it('describes the deployment the consumption pays for', () => {
    expect(cloud(1000)[0].description).toBe('1,024 GB memory, 8 nodes, 512 TB storage (Hot)')
  })

  it('has nothing to quote until the calculator figure is in', () => {
    expect(cloud('')).toEqual([])
    expect(cloud(0)).toEqual([])
  })

  it('quotes consumption even for a board carrying no memory', () => {
    expect(romRows({}, { model: LICENSE_ECU, ecuTotal: 5000 })[0].quantity).toBe(5000)
  })
})

describe('licenseModelFor', () => {
  it('puts self-managed on resource units and every cloud on consumption', () => {
    expect(licenseModelFor('selfmanaged')).toBe(LICENSE_ERU)
    for (const p of ['aws', 'gcp', 'azure']) expect(licenseModelFor(p)).toBe(LICENSE_ECU)
  })
})

describe('romTSV', () => {
  const totals = { mem: 128, tiers: [{ label: 'Hot', count: 2, storageTB: 4, mem: 128 }] }

  it('lays the line out in the importer column order with the bold lead last', () => {
    // SKU | Description | Qty | Unit Price | Discount% | Bold label — the 6th
    // column carries the lead so a pasted row matches the builder's own rows.
    const text = romTSV(romRows(totals, { unitPrice: 13400, discount: 10 }))
    expect(text).toBe(`${RU_SKU}\t128 GB memory, 2 nodes, 4 TB storage (Hot)\t2\t13400\t10\t${RU_LEAD}`)
  })

  it('leaves the price and discount cells empty when unpriced', () => {
    expect(romTSV(romRows(totals))).toContain('\t2\t\t\t')
  })

  it('emits a single line for a whole board', () => {
    expect(romTSV(romRows({ mem: 256, tiers: totals.tiers })).split('\n')).toHaveLength(1)
  })

  it('handles no rows', () => {
    expect(romTSV()).toBe('')
  })
})
