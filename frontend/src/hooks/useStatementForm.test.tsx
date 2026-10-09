import { act, renderHook } from '@testing-library/react'
import { statementFile } from '../test/utils'
import { useStatementForm } from './useStatementForm'

const today = new Date('2026-10-08T12:00:00Z')

describe('useStatementForm', () => {
  it('defaults the statement date to today', () => {
    const { result } = renderHook(() => useStatementForm({ today, onValid: vi.fn() }))
    expect(result.current.values.statementDate).toBe('2026-10-08')
  })

  it('does not submit without a file and explains why', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useStatementForm({ today, onValid }))

    act(() => result.current.handleSubmit())

    expect(onValid).not.toHaveBeenCalled()
    expect(result.current.errors.file).toBe('Choose a statement file')
  })

  it('rejects a future statement date', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useStatementForm({ today, onValid }))

    act(() => {
      result.current.setFile(statementFile('a.pdf'))
      result.current.setStatementDate('2026-12-01')
    })
    act(() => result.current.handleSubmit())

    expect(onValid).not.toHaveBeenCalled()
    expect(result.current.errors.statementDate).toMatch(/future/)
  })

  it('warns, without blocking, when the date would already be outdated', () => {
    const { result } = renderHook(() => useStatementForm({ today, onValid: vi.fn() }))
    act(() => result.current.setStatementDate('2026-01-01'))
    expect(result.current.wouldBeOutdated).toBe(true)
  })

  it('passes valid values through', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useStatementForm({ today, onValid }))

    const file = statementFile('hsbc.pdf')
    act(() => result.current.setFile(file))
    act(() => result.current.handleSubmit())

    expect(onValid).toHaveBeenCalledWith({ file, statementDate: '2026-10-08' })
  })

  it('accepts only PDF, PNG or JPEG files', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useStatementForm({ today, onValid }))

    act(() => result.current.setFile(new File(['x'], 'notes.docx')))
    act(() => result.current.handleSubmit())
    expect(result.current.errors.file).toBe('Upload a PDF, PNG or JPEG file')

    act(() => result.current.setFile(new File(['x'], 'SCAN.JPG')))
    act(() => result.current.handleSubmit())
    expect(onValid).toHaveBeenCalled()
  })

  it('rejects files over the size limit', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useStatementForm({ today, onValid }))
    const big = statementFile('big.pdf')
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })

    act(() => result.current.setFile(big))
    act(() => result.current.handleSubmit())

    expect(onValid).not.toHaveBeenCalled()
    expect(result.current.errors.file).toBe('The file must be 10 MB or smaller')
  })
})
