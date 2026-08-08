import { describe, it, expect } from 'vitest'
import { translateEdgePts, snap, nodePorts, nearestPort, edgePolyline, elbowPath,
         alignmentGuides } from './whiteboardGeometry'

const edge = (s, e, pts) => ({ id: `${s}-${e}`, s, e, ...(pts ? { pts } : {}) })

describe('nodePorts', () => {
  const r = { x: 100, y: 200, w: 200, h: 80 }

  it('offers twelve connection points: three per side', () => {
    const ports = nodePorts(r)
    expect(ports).toHaveLength(12)
    for (const side of ['l', 'r', 't', 'b'])
      expect(ports.filter((p) => p.side === side).map((p) => p.t)).toEqual([0.25, 0.5, 0.75])
  })

  it('places each port on its side at its fraction', () => {
    const ports = nodePorts(r)
    expect(ports.find((p) => p.side === 't' && p.t === 0.25)).toMatchObject({ x: 150, y: 200 })
    expect(ports.find((p) => p.side === 'r' && p.t === 0.75)).toMatchObject({ x: 300, y: 260 })
  })
})

describe('nearestPort', () => {
  const r = { x: 0, y: 0, w: 200, h: 100 }

  it('picks the port closest to the point', () => {
    // just inside the top-left area: closest is the top side's first quarter
    expect(nearestPort(r, { x: 45, y: 5 })).toMatchObject({ side: 't', t: 0.25 })
    // dead centre of the right side
    expect(nearestPort(r, { x: 200, y: 50 })).toMatchObject({ side: 'r', t: 0.5 })
  })
})

describe('alignmentGuides', () => {
  const moving = { x: 96, y: 200, w: 100, h: 60 }        // centre (146, 230)

  it('snaps onto a column centre within tolerance and reports the guide', () => {
    const other = { x: 100, y: 0, w: 100, h: 60 }        // centre-x 150, 4px off
    const out = alignmentGuides(moving, [other])
    expect(out.x).toBe(100)                              // centres now share x=150
    expect(out.y).toBeUndefined()
    expect(out.guides).toEqual([{ axis: 'v', at: 150 }])
  })

  it('snaps onto a row centre within tolerance', () => {
    const other = { x: 400, y: 204, w: 100, h: 60 }      // centre-y 234, 4px off
    const out = alignmentGuides(moving, [other])
    expect(out.y).toBe(204)
    expect(out.x).toBeUndefined()
    expect(out.guides).toEqual([{ axis: 'h', at: 234 }])
  })

  it('ignores rects beyond the tolerance', () => {
    const other = { x: 120, y: 400, w: 100, h: 60 }      // centre-x 170, 24px off
    expect(alignmentGuides(moving, [other])).toEqual({ guides: [] })
  })

  it('prefers the nearest candidate on each axis', () => {
    const near = { x: 98, y: 0, w: 100, h: 60 }          // centre-x 148, 2px off
    const far = { x: 92, y: 0, w: 100, h: 60 }           // centre-x 142, 4px off
    const out = alignmentGuides(moving, [far, near])
    expect(out.guides).toEqual([{ axis: 'v', at: 148 }])
  })

  it('can match both axes at once against different rects', () => {
    const col = { x: 100, y: 0, w: 100, h: 60 }
    const row = { x: 400, y: 204, w: 100, h: 60 }
    const out = alignmentGuides(moving, [col, row])
    expect(out.x).toBe(100)
    expect(out.y).toBe(204)
    expect(out.guides).toHaveLength(2)
  })
})

describe('anchored routing', () => {
  const a = { x: 0, y: 0, w: 100, h: 100 }
  const b = { x: 300, y: 0, w: 100, h: 100 }

  it('routes from the pinned start port instead of the auto midpoint', () => {
    const pl = edgePolyline(a, b, { side: 'r', t: 0.25 })
    expect(pl[0]).toEqual({ x: 100, y: 25 })
  })

  it('routes into the pinned end port', () => {
    const pl = edgePolyline(a, b, undefined, { side: 'l', t: 0.75 })
    expect(pl[pl.length - 1]).toEqual({ x: 300, y: 75 })
  })

  it('turns one corner when the pinned sides are on different axes', () => {
    const pl = edgePolyline(a, b, { side: 'r', t: 0.5 }, { side: 'b', t: 0.5 })
    expect(pl).toEqual([{ x: 100, y: 50 }, { x: 350, y: 50 }, { x: 350, y: 100 }])
  })

  it('keeps the auto route when no ports are pinned', () => {
    const pl = edgePolyline(a, b)
    expect(pl[0]).toEqual({ x: 100, y: 50 })
    expect(pl[pl.length - 1]).toEqual({ x: 300, y: 50 })
  })

  it('honours pinned ports even with manual waypoints', () => {
    const pl = elbowPath(a, b, [{ x: 200, y: 200 }], { side: 'b', t: 0.25 }, { side: 'b', t: 0.75 })
    expect(pl[0]).toEqual({ x: 25, y: 100 })
    expect(pl[pl.length - 1]).toEqual({ x: 375, y: 100 })
  })
})

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
