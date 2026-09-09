// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 500))
    expect(result.current).toBe('a')
  })

  it('holds the previous value until the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(499))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('b')
  })

  it('emits only the final value of a rapid burst', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: 'a' },
    })

    for (const value of ['b', 'c', 'd']) {
      rerender({ value })
      act(() => vi.advanceTimersByTime(200))
    }
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(500))
    expect(result.current).toBe('d')
  })
})
