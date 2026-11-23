import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FONT_SIZE, FONT_MAX, FONT_MIN, FONT_STEP,
  normalizeLayoutPrefs, resolveFontSize, stepFontSize,
} from './presenterLayout'

describe('normalizeLayoutPrefs', () => {
  it('defaults to the notes-first layout with no stored font size', () => {
    expect(normalizeLayoutPrefs(null)).toEqual({ layout: 'notes', fontSize: null })
    expect(normalizeLayoutPrefs({ layout: 'bogus', fontSize: 'x' })).toEqual({ layout: 'notes', fontSize: null })
  })

  it('keeps the classic layout and clamps stored font sizes', () => {
    expect(normalizeLayoutPrefs({ layout: 'classic', fontSize: 400 })).toEqual({ layout: 'classic', fontSize: FONT_MAX })
    expect(normalizeLayoutPrefs({ layout: 'classic', fontSize: 2 })).toEqual({ layout: 'classic', fontSize: FONT_MIN })
  })
})

describe('font size', () => {
  it('falls back to the per-layout default', () => {
    expect(resolveFontSize({ layout: 'notes', fontSize: null })).toBe(DEFAULT_FONT_SIZE.notes)
    expect(resolveFontSize({ layout: 'classic', fontSize: null })).toBe(DEFAULT_FONT_SIZE.classic)
  })

  it('steps from the effective size and stays within bounds', () => {
    const grown = stepFontSize({ layout: 'classic', fontSize: null }, 1)
    expect(grown.fontSize).toBe(DEFAULT_FONT_SIZE.classic + FONT_STEP)
    expect(stepFontSize({ layout: 'notes', fontSize: FONT_MAX }, 1).fontSize).toBe(FONT_MAX)
    expect(stepFontSize({ layout: 'notes', fontSize: FONT_MIN }, -1).fontSize).toBe(FONT_MIN)
  })
})
