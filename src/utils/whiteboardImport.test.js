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

  it('imports the default ?v column set even though it carries no ram.max/disk.total', () => {
    // exactly what `GET _cat/nodes?v` returns: ip, heap, ram%, cpu, loads, role, master, name
    const parsed = parseClusterInput(
      `ip         heap.percent ram.percent cpu load_1m load_5m load_15m node.role master name
127.0.0.1            65          99  42    3.07    3.10     3.15 himr      *      es-hot-1
127.0.0.2            34          81   3    0.14    0.39     0.45 mr        -      es-master-1`)
    expect(parsed.source).toBe('_cat/nodes')
    expect(parsed.nodes).toHaveLength(2)
    // the name is the trailing column and the roles still expand
    expect(parsed.nodes[0].name).toBe('es-hot-1')
    expect(parsed.nodes[0].roles).toEqual(expect.arrayContaining(['hot', 'ingest', 'master']))
    // no ram.max/disk.total in the default set: hardware is absent, not fabricated
    expect(parsed.nodes[0].ramBytes).toBe(0)
    expect(parsed.nodes[0].diskBytes).toBe(0)
    // cpu here is utilisation %, never a core count
    expect(parsed.nodes[0].cpu).toBe(0)
  })

  it('does not read the _cat cpu utilisation column as a vCPU core count', () => {
    const parsed = parseClusterInput('name node.role cpu\nhot-1 hir 87')
    expect(parsed.nodes[0].cpu).toBe(0)
    expect(summarizeCluster(parsed).groups.find((g) => g.type === 'tier_hot').cpu).toBe(0)
  })

  it('strips a Dev Tools request line pasted above the table', () => {
    const parsed = parseClusterInput(
      `GET _cat/nodes?v&h=name,node.role,ram.max,disk.total\nname node.role ram.max disk.total\nhot-1 hir 62.9gb 2tb`)
    expect(parsed.source).toBe('_cat/nodes')
    expect(parsed.nodes).toHaveLength(1)
    expect(parsed.nodes[0].ramBytes).toBe(parseSize('62.9gb'))
  })

  it('strips a curl wrapper (with a continued line) from a paste', () => {
    const parsed = parseClusterInput(
      `curl -X GET "http://localhost:9200/_cat/nodes?v&h=name,node.role,ram.max,disk.total" \\\n  -H "Authorization: ApiKey abc123"\nname node.role ram.max disk.total\nhot-1 hir 62.9gb 2tb`)
    expect(parsed.source).toBe('_cat/nodes')
    expect(parsed.nodes).toHaveLength(1)
    expect(parsed.nodes[0].name).toBe('hot-1')
  })

  it('parses _cat/nodes?format=json array output', () => {
    const parsed = parseClusterInput(JSON.stringify([
      { name: 'hot-1', 'node.role': 'hir', 'ram.max': '62.9gb', 'disk.total': '2tb' },
      { name: 'master-1', 'node.role': 'mr', 'ram.max': '15.7gb', 'disk.total': '100gb' },
    ]))
    expect(parsed.source).toBe('_cat/nodes')
    expect(parsed.nodes).toHaveLength(2)
    expect(parsed.nodes[0].roles).toEqual(expect.arrayContaining(['hot', 'ingest']))
    expect(parsed.nodes[0].ramBytes).toBe(parseSize('62.9gb'))
  })

  it('tolerates Windows CRLF line endings', () => {
    const parsed = parseClusterInput('name node.role ram.max disk.total\r\nhot-1 hir 62.9gb 2tb\r\nmaster-1 mr 15.7gb 100gb\r\n')
    expect(parsed.nodes).toHaveLength(2)
    expect(parsed.nodes[0].ramBytes).toBe(parseSize('62.9gb'))
  })

  it('reconciles overlapping _cluster/stats buckets against count.total', () => {
    // a hot node that is also master-eligible is tallied in data_hot, data, and
    // master; summing would give 5+8=… — the reconstruction must equal total
    const parsed = parseClusterInput(JSON.stringify({
      cluster_name: 'overlap',
      nodes: {
        count: { total: 8, data: 5, data_hot: 3, data_warm: 2, master: 3, ingest: 5 },
        versions: ['8.13.2'],
        os: { available_processors: 128, mem: { total_in_bytes: 549755813888 } },
        fs: { total_in_bytes: 10995116277760 },
      },
    }))
    expect(parsed.source).toBe('_cluster/stats')
    expect(parsed.nodes).toHaveLength(8)
    expect(summarizeCluster(parsed).total).toBe(8)
    // 5 data nodes (3 hot + 2 warm) + 3 dedicated masters = 8; ingest folds into data
    const byType = Object.fromEntries(summarizeCluster(parsed).groups.map((g) => [g.type, g.count]))
    expect(byType.tier_hot).toBe(3)
    expect(byType.tier_warm).toBe(2)
    expect(byType.node_master).toBe(3)
  })

  it('keeps content-only data nodes on the board as data nodes', () => {
    // `s` (data_content) matched nothing in the old grouping and vanished
    const parsed = parseClusterInput('name node.role\ncontent-1 s\ncontent-2 s')
    const summary = summarizeCluster(parsed)
    expect(summary.total).toBe(2)
    expect(summary.groups.map((g) => g.type)).toEqual(['es'])
    expect(summary.groups[0].count).toBe(2)
  })

  it('does not drop transform/voting-only nodes from the total', () => {
    const parsed = parseClusterInput('name node.role\ntf-1 t\nvote-1 v')
    const summary = summarizeCluster(parsed)
    expect(summary.total).toBe(2)
    // no dedicated box type exists, so they land in the coordinating catch-all
    expect(summary.groups.reduce((sum, g) => sum + g.count, 0)).toBe(2)
    expect(summary.groups.find((g) => g.type === 'node_coord').count).toBe(2)
  })

  it('lands the Elasticsearch version from _nodes JSON on the board', () => {
    // generic data nodes (no explicit tier) fold into the es box, which is the
    // only imported type declaring a version field
    const parsed = parseClusterInput(JSON.stringify({
      cluster_name: 'versioned',
      nodes: {
        aaa: { name: 'd-1', version: '8.13.2', roles: ['data', 'ingest', 'master'],
               os: { available_processors: 8, mem: { total_in_bytes: 34359738368 } },
               fs: { total: { total_in_bytes: 1099511627776 } } },
      },
    }))
    expect(parsed.nodes[0].version).toBe('8.13.2')
    const { board } = clusterToBoard(parsed)
    const es = board.nodes.find((n) => n.type === 'es')
    expect(es.props.version).toBe('8.13.2')
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
