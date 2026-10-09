import { act, renderHook, waitFor } from '@testing-library/react'
import { resetMockBackend } from '../test/server'
import { createWrapper } from '../test/utils'
import { useSubmitAccounts } from './useSubmitAccounts'

describe('useSubmitAccounts', () => {
  it('surfaces every problem when the server rejects an incomplete set', async () => {
    const { result } = renderHook(() => useSubmitAccounts(), { wrapper: createWrapper() })

    act(() => result.current.submit())
    await waitFor(() => expect(result.current.problems).toHaveLength(2))
    expect(result.current.problems.map((p) => [p.providerName, p.reason])).toEqual([
      ['HSBC', 'MISSING'],
      ['Vanguard', 'OUTDATED'],
    ])
    expect(result.current.isSubmitted).toBe(false)
  })

  it('reports success when everything is current', async () => {
    resetMockBackend({
      accounts: [{ providerId: 'barclays', statement: { fileName: 'a.pdf', statementDate: '2026-10-01' } }],
    })
    const { result } = renderHook(() => useSubmitAccounts(), { wrapper: createWrapper() })

    act(() => result.current.submit())
    await waitFor(() => expect(result.current.isSubmitted).toBe(true))
    expect(result.current.problems).toEqual([])
  })
})
