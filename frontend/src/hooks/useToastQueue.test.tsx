import { act, renderHook } from '@testing-library/react'
import { TOAST_DURATION_MS, useToastQueue } from './useToastQueue'

describe('useToastQueue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows toasts in order, defaulting to success', () => {
    const { result } = renderHook(() => useToastQueue())
    act(() => {
      result.current.notify('Saved')
      result.current.notify('Oops', 'error')
    })
    expect(result.current.toasts.map((t) => [t.message, t.tone])).toEqual([
      ['Saved', 'success'],
      ['Oops', 'error'],
    ])
  })

  it('dismisses each toast after a while', () => {
    const { result } = renderHook(() => useToastQueue())
    act(() => result.current.notify('Saved'))

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(result.current.toasts).toEqual([])
  })
})
