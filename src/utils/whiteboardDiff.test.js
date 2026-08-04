import { describe, it, expect } from 'vitest'
import { diffBoards, diffMarks, labelOf } from './whiteboardDiff'

const node = (id, type, props, title) => ({ id, type, x: 0, y: 0, props, ...(title ? { title } : {}) })
const board = (...nodes) => ({ nodes })
const labels = (entries) => entries.map((e) => e.label)

describe('diffBoards', () => {
  it('reports components the target adds', () => {
    const diff = diffBoards(board(node('a', 'tier_hot'), node('b', 'tier_frozen')), board(node('x', 'tier_hot')))
    expect(labels(diff.added)).toEqual(['Frozen Tier'])
    expect(diff.removed).toEqual([])
    expect(diff.unchanged).toBe(1)
  })

  it('reports components the target drops', () => {
    const diff = diffBoards(board(node('a', 'tier_hot')), board(node('x', 'tier_hot'), node('y', 'logstash')))
    expect(labels(diff.removed)).toEqual(['Logstash'])
    expect(diff.added).toEqual([])
  })

  it('matches on title as well as type', () => {
    const diff = diffBoards(
      board(node('a', 'tier_hot', {}, 'EU hot')),
      board(node('x', 'tier_hot', {}, 'US hot')),
    )
    expect(labels(diff.added)).toEqual(['EU hot'])
    expect(labels(diff.removed)).toEqual(['US hot'])
  })

  it('ignores case and padding when matching titles', () => {
    const diff = diffBoards(board(node('a', 'tier_hot', {}, ' EU Hot ')), board(node('x', 'tier_hot', {}, 'eu hot')))
    expect(diff.added).toEqual([])
    expect(diff.unchanged).toBe(1)
  })

  it('lists the properties that moved on a component present in both', () => {
    const diff = diffBoards(
      board(node('a', 'tier_hot', { nodes: 6, capacity: '4 TB', mem: 64 })),
      board(node('x', 'tier_hot', { nodes: 3, capacity: '4 TB', mem: 64 })),
    )
    expect(diff.changed).toHaveLength(1)
    expect(diff.changed[0].fields).toEqual([{ label: 'Nodes', from: '3', to: '6' }])
  })

  it('treats a newly set property as a change, not an addition', () => {
    const diff = diffBoards(board(node('a', 'tier_hot', { cpu: 16 })), board(node('x', 'tier_hot')))
    expect(diff.added).toEqual([])
    expect(diff.changed[0].fields).toEqual([{ label: 'vCPU', from: null, to: '16' }])
  })

  it('pairs repeated components one for one and counts only the surplus', () => {
    const diff = diffBoards(
      board(node('a', 'kibana'), node('b', 'kibana'), node('c', 'kibana')),
      board(node('x', 'kibana')),
    )
    expect(diff.added).toHaveLength(2)
    expect(diff.unchanged).toBe(1)
  })

  it('leaves annotations out of the comparison', () => {
    const diff = diffBoards(board(node('a', 'note', {}, 'ask about retention')), board())
    expect(diff.added).toEqual([])
  })

  it('summarises how the capacity rollup moves', () => {
    const diff = diffBoards(
      board(node('a', 'tier_hot', { nodes: 4, mem: 64, capacity: '2 TB' })),
      board(node('x', 'tier_hot', { nodes: 2, mem: 64, capacity: '2 TB' })),
    )
    expect(diff.capacity).toContainEqual({ label: 'Nodes', from: 2, to: 4, delta: 2, text: '2 → 4' })
    expect(diff.capacity.find((l) => l.label === 'Storage').text).toBe('4 TB → 8 TB')
  })

  it('omits capacity lines that are empty on both boards', () => {
    const diff = diffBoards(board(node('a', 'tier_hot')), board(node('x', 'tier_hot')))
    expect(diff.capacity).toEqual([])
  })

  it('handles empty and missing boards', () => {
    expect(diffBoards()).toMatchObject({ added: [], removed: [], changed: [], unchanged: 0 })
    expect(diffBoards(board(node('a', 'kibana')), {}).added).toHaveLength(1)
  })
})

describe('diffMarks', () => {
  it('tags the current board\'s nodes for tinting, and nothing else', () => {
    const diff = diffBoards(
      board(node('a', 'tier_hot', { nodes: 2 }), node('b', 'logstash')),
      board(node('x', 'tier_hot', { nodes: 5 }), node('y', 'kafka')),
    )
    expect(diffMarks(diff)).toEqual({ a: 'changed', b: 'added' })
  })
})

describe('labelOf', () => {
  it('prefers a custom title, falling back to the type name', () => {
    expect(labelOf(node('a', 'tier_hot', {}, 'EU hot'))).toBe('EU hot')
    expect(labelOf(node('a', 'tier_hot'))).toBe('Hot Tier')
    expect(labelOf({ type: 'nonsense' })).toBe('nonsense')
  })
})
