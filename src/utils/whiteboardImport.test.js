import { describe, it, expect } from 'vitest'
import { parseClusterInput, parseSize, summarizeCluster, clusterToBoard } from './whiteboardImport'

const CAT_NODES = `name    node.role ram.max disk.total
es-hot-1  himr     62.9gb  2tb
es-hot-2  himr     62.9gb  2tb
es-warm-1 wmr      31.4gb  8tb
es-master-1 mr     15.7gb  100gb
es-master-2 mr      15.7gb  100gb
es-master-3 mr      15.7gb  100gb`

const NODES_JSON = JSON.stringify({
  cluster_name: 'acme-prod',
  nodes: {
    aaa: { name: 'hot-1', roles: ['data_hot', 'ingest'], os: { available_processors: 16, mem: { total_in_bytes: 68719476736 } }, fs: { total: { total_in_bytes: 2199023255552 } } },
    bbb: { name: 'frozen-1', roles: ['data_frozen'], os: { available_processors: 8, mem: { total_in_bytes: 34359738368 } }, fs: { total: { total_in_bytes: 1099511627776 } } },
    ccc: { name: 'master-1', roles: ['master'], os: { available_processors: 4, mem: { total_in_bytes: 17179869184 } } },
  },
})

const CLUSTER_STATS = JSON.stringify({
  cluster_name: 'stats-cluster',
  nodes: {
    count: { total: 5, data_hot: 3, master: 2 },
    os: { available_processors: 80, mem: { total_in_bytes: 343597383680 } },
    fs: { total_in_bytes: 6597069766656 },
  },
})

describe('parseSize', () => {
  it('reads Elasticsearch byte strings', () => {
    expect(parseSize('1gb')).toBe(1024 ** 3)
    expect(parseSize('1.5tb')).toBe(1.5 * 1024 ** 4)
    expect(parseSize('512mb')).toBe(512 * 1024 ** 2)
    expect(parseSize('n/a')).toBe(0)
    expect(parseSize(undefined)).toBe(0)
  })
})

describe('parseClusterInput', () => {
  it('parses _cat/nodes tabular output and expands the role letters', () => {
    const parsed = parseClusterInput(CAT_NODES)
    expect(parsed.source).toBe('_cat/nodes')
    expect(parsed.nodes).toHaveLength(6)
    expect(parsed.nodes[0].roles).toEqual(expect.arrayContaining(['hot', 'ingest', 'master']))
    expect(parsed.nodes[0].ramBytes).toBe(parseSize('62.9gb'))
  })

  it('rejects _cat output pasted without a header row', () => {
    expect(parseClusterInput('es-hot-1 himr 62.9gb 2tb')).toBeNull()
  })

  it('parses _nodes JSON including cluster name and hardware', () => {
    const parsed = parseClusterInput(NODES_JSON)
    expect(parsed.source).toBe('_nodes')
    expect(parsed.clusterName).toBe('acme-prod')
    expect(parsed.nodes[0].cpu).toBe(16)
  })

  it('parses _cluster/stats aggregates into representative nodes', () => {
    const parsed = parseClusterInput(CLUSTER_STATS)
    expect(parsed.source).toBe('_cluster/stats')
    expect(parsed.nodes).toHaveLength(5)
  })

  it('returns null for junk', () => {
    expect(parseClusterInput('')).toBeNull()
    expect(parseClusterInput('hello world')).toBeNull()
    expect(parseClusterInput('{ not json')).toBeNull()
  })
})

describe('summarizeCluster', () => {
  it('groups nodes by tier and dedicated role', () => {
    const summary = summarizeCluster(parseClusterInput(CAT_NODES))
    const byType = Object.fromEntries(summary.groups.map((g) => [g.type, g]))
    expect(byType.tier_hot.count).toBe(2)
    expect(byType.tier_warm.count).toBe(1)
    expect(byType.node_master.count).toBe(3)
  })

  it('does not double-count a data node that is also master-eligible', () => {
    const summary = summarizeCluster(parseClusterInput(CAT_NODES))
    // the two hot nodes carry the master role too, but only dedicated masters count
    expect(summary.groups.find((g) => g.type === 'node_master').count).toBe(3)
    expect(summary.total).toBe(6)
  })

  it('averages hardware across the members of a group', () => {
    const summary = summarizeCluster(parseClusterInput(NODES_JSON))
    const hot = summary.groups.find((g) => g.type === 'tier_hot')
    expect(hot.cpu).toBe(16)
    expect(hot.ramGB).toBe(64)
    expect(hot.diskTB).toBe(2)
  })

  it('folds tierless data nodes into a single Elasticsearch box', () => {
    const parsed = parseClusterInput('name node.role\nd-1 dmr\nd-2 dmr')
    const summary = summarizeCluster(parsed)
    expect(summary.groups.map((g) => g.type)).toEqual(['es'])
    expect(summary.groups[0].count).toBe(2)
  })
})

describe('clusterToBoard', () => {
  it('builds tier boxes with node counts, hardware, and an ILM flow', () => {
    const { board } = clusterToBoard(parseClusterInput(CAT_NODES))
    const hot = board.nodes.find((n) => n.type === 'tier_hot')
    expect(hot.props).toMatchObject({ nodes: 2, mem: 63, capacity: '2 TB' })
    expect(board.edges.some((e) => e.lbl === 'ILM')).toBe(true)
  })

  it('wraps the cluster in a zone named after it', () => {
    const { board } = clusterToBoard(parseClusterInput(NODES_JSON))
    expect(board.zones[0].label).toBe('acme-prod')
  })

  it('lays tiers and roles out in two non-overlapping columns', () => {
    const { board } = clusterToBoard(parseClusterInput(CAT_NODES))
    const hot = board.nodes.find((n) => n.type === 'tier_hot')
    const master = board.nodes.find((n) => n.type === 'node_master')
    expect(master.x).toBeGreaterThan(hot.x + 248)
  })

  it('returns null when there is nothing to draw', () => {
    expect(clusterToBoard({ nodes: [] })).toBeNull()
  })
})
