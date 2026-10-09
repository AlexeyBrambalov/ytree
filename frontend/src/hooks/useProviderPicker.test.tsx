import { act, renderHook, waitFor } from '@testing-library/react'
import { createTestQueryClient, createWrapper } from '../test/utils'
import { queryKeys } from '../api/queryKeys'
import type { Account } from '../api/schemas'
import { useProviderPicker } from './useProviderPicker'

describe('useProviderPicker', () => {
  it('never offers providers the client already holds', async () => {
    const { result } = renderHook(() => useProviderPicker(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const names = result.current.providers.map((p) => p.name)
    expect(names).not.toContain('Barclays')
    expect(names).not.toContain('HSBC')
    expect(names).toContain('Monzo')
  })

  it('searches by name', async () => {
    const { result } = renderHook(() => useProviderPicker(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.setQuery('mon'))
    expect(result.current.providers.map((p) => p.name)).toEqual(['Monzo'])
  })

  it('adds several selected providers at once and updates the accounts cache', async () => {
    const client = createTestQueryClient()
    const { result } = renderHook(() => useProviderPicker(), { wrapper: createWrapper(client) })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.toggle('monzo')
      result.current.toggle('aviva')
    })
    expect(result.current.selectedIds).toEqual(['monzo', 'aviva'])

    await act(() => result.current.confirm())

    const accounts = client.getQueryData<Account[]>(queryKeys.accounts)!
    expect(accounts.map((a) => a.provider.name)).toEqual(expect.arrayContaining(['Monzo', 'Aviva']))
    expect(accounts.find((a) => a.provider.id === 'monzo')?.status).toBe('MISSING')
    expect(result.current.selectedIds).toEqual([])
    // Newly added providers disappear from the picker.
    expect(result.current.providers.map((p) => p.id)).not.toContain('monzo')
  })

  it('toggling twice deselects', async () => {
    const { result } = renderHook(() => useProviderPicker(), { wrapper: createWrapper() })
    act(() => result.current.toggle('monzo'))
    act(() => result.current.toggle('monzo'))
    expect(result.current.selectedIds).toEqual([])
  })
})
