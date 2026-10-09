import { renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModal } from './useModal'

describe('useModal', () => {
  it('closes on Escape', async () => {
    const onClose = vi.fn()
    renderHook(() => useModal(onClose))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop itself is pressed, not its content', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useModal(onClose))
    const backdrop = document.createElement('div')
    const content = document.createElement('div')

    result.current.onBackdropMouseDown({ target: content, currentTarget: backdrop } as never)
    expect(onClose).not.toHaveBeenCalled()

    result.current.onBackdropMouseDown({ target: backdrop, currentTarget: backdrop } as never)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('gives the dialog a stable title id', () => {
    const { result, rerender } = renderHook(() => useModal(vi.fn()))
    const id = result.current.titleId
    rerender()
    expect(result.current.titleId).toBe(id)
  })
})
