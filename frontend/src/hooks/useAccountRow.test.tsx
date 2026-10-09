import { act, renderHook } from '@testing-library/react'
import type { Account } from '../api/schemas'
import { createWrapper } from '../test/utils'
import { useAccountRow } from './useAccountRow'

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  provider: { id: 'hsbc', name: 'HSBC', category: 'BANK' },
  statement: null,
  status: 'MISSING',
  ...overrides,
})

describe('useAccountRow', () => {
  it('offers Upload as the primary action when there is no statement', () => {
    const { result } = renderHook(() => useAccountRow(account()), { wrapper: createWrapper() })
    expect(result.current).toMatchObject({ categoryLabel: 'Bank', actionLabel: 'Upload', actionVariant: 'primary', statement: null })
  })

  it('offers Replace as a secondary action once a current statement exists', () => {
    const { result } = renderHook(() =>
      useAccountRow(account({ status: 'UPLOADED', statement: { fileName: 'a.pdf', statementDate: '2026-10-01', fileUrl: '/api/accounts/acc-1/statement/file' } })),
      { wrapper: createWrapper() },
    )
    expect(result.current.actionLabel).toBe('Replace')
    expect(result.current.actionVariant).toBe('secondary')
    expect(result.current.statement).toEqual({
      fileName: 'a.pdf',
      href: 'http://localhost:3000/api/accounts/acc-1/statement/file',
      dateLabel: '1 Oct 2026',
      ageNote: null,
    })
  })

  it('keeps Replace primary and explains why when the statement is outdated', () => {
    const { result } = renderHook(() =>
      useAccountRow(account({ status: 'OUTDATED', statement: { fileName: 'old.pdf', statementDate: '2026-01-01', fileUrl: '/api/accounts/acc-1/statement/file' } })),
      { wrapper: createWrapper() },
    )
    expect(result.current.actionVariant).toBe('primary')
    expect(result.current.statement).toEqual({
      fileName: 'old.pdf',
      href: 'http://localhost:3000/api/accounts/acc-1/statement/file',
      dateLabel: '1 Jan 2026',
      ageNote: 'Older than 3 months, so it won’t count. Upload a more recent one.',
    })
  })

  it('asks for confirmation before removing, and can be cancelled', () => {
    const { result } = renderHook(() => useAccountRow(account()), { wrapper: createWrapper() })
    expect(result.current.isConfirmingRemove).toBe(false)

    act(() => result.current.requestRemove())
    expect(result.current.isConfirmingRemove).toBe(true)

    act(() => result.current.cancelRemove())
    expect(result.current.isConfirmingRemove).toBe(false)
  })
})
