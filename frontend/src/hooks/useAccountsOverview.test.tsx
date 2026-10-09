import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { createWrapper } from '../test/utils'
import { useAccountsOverview } from './useAccountsOverview'

const render = () => renderHook(() => useAccountsOverview(), { wrapper: createWrapper() })

describe('useAccountsOverview', () => {
  it('loads accounts and summarises readiness', async () => {
    const { result } = render()
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.accounts.map((a) => a.provider.name)).toEqual(['Barclays', 'HSBC', 'Vanguard', 'Fidelity'])
    expect(result.current.readiness).toMatchObject({ total: 4, ready: 2, missing: 1, outdated: 1, canSubmit: false })
  })

  it('filters the visible list by status and counts each filter', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.filterCounts).toEqual({ ALL: 4, NEEDS_ATTENTION: 2, MISSING: 1, OUTDATED: 1, UPLOADED: 2 })

    act(() => result.current.setFilter('NEEDS_ATTENTION'))
    expect(result.current.visibleAccounts.map((a) => a.provider.name)).toEqual(['HSBC', 'Vanguard'])
  })

  it('exposes a readable error when loading fails', async () => {
    server.use(http.get('/api/accounts', () => HttpResponse.json({ message: 'Service down' }, { status: 503 })))
    const { result } = render()
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error?.message).toBe('Service down')
  })
})
