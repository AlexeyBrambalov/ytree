import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { resetMockBackend, server } from '../test/server'
import { createWrapper } from '../test/utils'
import { useAccountsScreen } from './useAccountsScreen'

const render = () => renderHook(() => useAccountsScreen(), { wrapper: createWrapper() })

describe('useAccountsScreen', () => {
  it('moves the list view from loading to list', async () => {
    const { result } = render()
    expect(result.current.listView).toBe('loading')
    await waitFor(() => expect(result.current.listView).toBe('list'))
  })

  it('reports an error view', async () => {
    server.use(http.get('/api/accounts', () => HttpResponse.json({ message: 'Down' }, { status: 503 })))
    const { result } = render()
    await waitFor(() => expect(result.current.listView).toBe('error'))
  })

  it('keeps showing the list when a background refetch fails', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.listView).toBe('list'))

    server.use(http.get('/api/accounts', () => HttpResponse.json({ message: 'Down' }, { status: 503 })))
    await act(() => result.current.overview.refetch())

    expect(result.current.overview.error).not.toBeNull()
    expect(result.current.listView).toBe('list')
  })

  it('distinguishes "no providers" from "nothing matches the filter"', async () => {
    resetMockBackend({ accounts: [] })
    const empty = render()
    await waitFor(() => expect(empty.result.current.listView).toBe('empty'))

    resetMockBackend({ accounts: [{ providerId: 'hsbc', statement: null }] })
    const filtered = render()
    await waitFor(() => expect(filtered.result.current.listView).toBe('list'))
    act(() => filtered.result.current.overview.setFilter('UPLOADED'))
    expect(filtered.result.current.listView).toBe('no-matches')
  })

  it('opens and closes the add and upload dialogs', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.listView).toBe('list'))
    const hsbc = result.current.overview.accounts[1]

    act(() => result.current.openAdd())
    expect(result.current.isAdding).toBe(true)
    act(() => result.current.closeAdd())
    expect(result.current.isAdding).toBe(false)

    act(() => result.current.openUpload(hsbc))
    expect(result.current.uploadTarget).toBe(hsbc)
    act(() => result.current.closeUpload())
    expect(result.current.uploadTarget).toBeNull()
  })

  it('removes an account and confirms with a toast', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.listView).toBe('list'))

    act(() => result.current.removeAccount(result.current.overview.accounts[1]))

    expect(await screen.findByText('Removed HSBC')).toBeInTheDocument()
    expect(result.current.overview.accounts.map((a) => a.provider.name)).not.toContain('HSBC')
  })
})
