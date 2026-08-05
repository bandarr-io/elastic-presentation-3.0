import { describe, it, expect } from 'vitest'
import { translateEdgePts, snap } from './whiteboardGeometry'

const edge = (s, e, pts) => ({ id: `${s}-${e}`, s, e, ...(pts ? { pts } : {}) })

describe('translateEdgePts', () => {
  it('translates waypoints when both endpoints moved', () => {
    const edges = [edge('a', 'b', [{ x: 100, y: 200 }, { x: 108, y: 208 }])]
    const out = translateEdgePts(edges, new Set(['a', 'b']), 16, -8)
    expect(out[0].pts).toEqual([{ x: snap(116), y: snap(192) }, { x: snap(124), y: snap(200) }])
    expect(out[0]).not.toBe(edges[0])
  })

  it('leaves an edge unchanged when only one endpoint moved', () => {
    const edges = [edge('a', 'b', [{ x: 40, y: 40 }]), edge('a', 'c', [{ x: 80, y: 80 }])]
    const out = translateEdgePts(edges, new Set(['a']), 16, 16)
    expect(out[0]).toBe(edges[0])
    expect(out[1]).toBe(edges[1])
  })

  it('returns the same array when an edge has no waypoints', () => {
    const edges = [edge('a', 'b'), edge('b', 'c', [{ x: 0, y: 0 }])]
    const out = translateEdgePts(edges, new Set(['a', 'b', 'c']), 8, 8)
    expect(out[0]).toBe(edges[0])
    expect(out[1]).not.toBe(edges[1])
  })

  it('translates zone-terminated edges in zoneFrameOnly mode', () => {
    const edges = [edge('z1', 'n1', [{ x: 200, y: 100 }]), edge('n1', 'n2', [{ x: 300, y: 100 }])]
    const out = translateEdgePts(edges, new Set(['z1']), 24, 0, { zoneFrameOnly: true })
    expect(out[0].pts[0].x).toBe(snap(224))
    expect(out[1]).toBe(edges[1])
  })
})
