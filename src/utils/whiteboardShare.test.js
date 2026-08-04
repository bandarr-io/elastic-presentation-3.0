import { describe, it, expect } from 'vitest'
import { encodeBoard, decodeBoard, boardParamFromHash, shareUrl } from './whiteboardShare'

const board = {
  name: 'Acme',
  nodes: [
    { id: 'n1', type: 'kibana', x: 0, y: 0 },
    { id: 'n2', type: 'tier_hot', x: 320, y: 0, props: { nodes: 3 } },
  ],
  edges: [{ id: 'e1', s: 'n1', e: 'n2', lbl: 'queries' }],
  zones: [{ id: 'z1', x: -40, y: -40, w: 600, h: 240, label: 'Prod', color: '#FEC514' }],
}

describe('whiteboard share links', () => {
  it('round-trips a board through the URL payload', async () => {
    const decoded = await decodeBoard(await encodeBoard(board))
    expect(decoded).toEqual(board)
  })

  it('drops local-only state from the payload', async () => {
    const decoded = await decodeBoard(await encodeBoard({ ...board, view: { x: 1, y: 2, k: 3 }, sections: { a: 1 } }))
    expect(decoded).not.toHaveProperty('view')
    expect(decoded).not.toHaveProperty('sections')
  })

  it('compresses rather than inflating the payload', async () => {
    const many = { ...board, nodes: Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, type: 'kibana', x: i * 8, y: 0 })) }
    const payload = await encodeBoard(many)
    expect(payload[0]).toBe('z')
    expect(payload.length).toBeLessThan(JSON.stringify(many).length)
  })

  it('returns null for junk payloads', async () => {
    expect(await decodeBoard('')).toBeNull()
    expect(await decodeBoard('znot-real-data')).toBeNull()
    expect(await decodeBoard('u' + btoa('{"nope":1}'))).toBeNull()
  })

  it('reads and writes the board param on a hash route', () => {
    expect(boardParamFromHash('#/whiteboard?board=abc')).toBe('abc')
    expect(boardParamFromHash('#/whiteboard')).toBeNull()

    const url = shareUrl('http://x.dev', '/', '#/whiteboard', 'abc')
    expect(url).toBe('http://x.dev/#/whiteboard?board=abc')
    expect(boardParamFromHash(url.slice(url.indexOf('#')))).toBe('abc')
  })

  it('replaces an existing payload rather than appending one', () => {
    expect(shareUrl('http://x.dev', '/', '#/whiteboard?board=old', 'new'))
      .toBe('http://x.dev/#/whiteboard?board=new')
  })
})
