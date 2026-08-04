import { describe, it, expect } from 'vitest'
import { wrapText, inkPath, stepCountOf, visibleAtStep } from '../ElasticWhiteboard'

describe('wrapText', () => {
  it('wraps on word boundaries within the character budget', () => {
    expect(wrapText('the quick brown fox jumps', 10)).toEqual(['the quick', 'brown fox', 'jumps'])
  })

  it('keeps explicit newlines', () => {
    expect(wrapText('one\ntwo', 40)).toEqual(['one', 'two'])
  })

  it('does not split a word that is longer than the budget', () => {
    expect(wrapText('supercalifragilistic', 5)).toEqual(['supercalifragilistic'])
  })

  it('handles empty input', () => {
    expect(wrapText('', 10)).toEqual([''])
    expect(wrapText(undefined, 10)).toEqual([''])
  })
})

describe('inkPath', () => {
  const pts = [{ x: 0, y: 0 }, { x: 5, y: 9 }, { x: 20, y: 3 }]

  it('traces every point of a freehand stroke', () => {
    expect(inkPath({ kind: 'pen', pts })).toBe('M 0 0 L 5 9 L 20 3')
  })

  it('reduces an arrow to first and last point', () => {
    expect(inkPath({ kind: 'arrow', pts })).toBe('M 0 0 L 20 3')
  })

  it('returns nothing for a stroke with a single point', () => {
    expect(inkPath({ kind: 'pen', pts: [{ x: 1, y: 1 }] })).toBe('')
    expect(inkPath({ kind: 'pen' })).toBe('')
  })
})

describe('build steps', () => {
  it('counts the highest step across every list', () => {
    expect(stepCountOf([{ step: 1 }, {}], [{ step: 3 }])).toBe(3)
    expect(stepCountOf([{}, {}], [])).toBe(0)
  })

  it('treats untagged elements as base content, always visible', () => {
    expect(visibleAtStep({}, 0)).toBe(true)
    expect(visibleAtStep({ step: 2 }, 0)).toBe(false)
    expect(visibleAtStep({ step: 2 }, 1)).toBe(false)
    expect(visibleAtStep({ step: 2 }, 2)).toBe(true)
    expect(visibleAtStep({ step: 2 }, 3)).toBe(true)
  })
})
