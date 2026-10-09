import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { createWrapper } from '../test/utils'
import { useAddProvidersDialog } from './useAddProvidersDialog'

const render = (onClose = vi.fn()) => renderHook(() => useAddProvidersDialog(onClose), { wrapper: createWrapper() })

describe('useAddProvidersDialog', () => {
  it('goes from loading to a list of options', async () => {
    const { result } = render()
    expect(result.current.view).toBe('loading')
    await waitFor(() => expect(result.current.view).toBe('list'))
  })

  it('reports a load error', async () => {
    server.use(http.get('/api/providers', () => HttpResponse.json({ message: 'Down' }, { status: 500 })))
    const { result } = render()
    await waitFor(() => expect(result.current.view).toBe('error'))
    expect(result.current.loadError?.message).toBe('Down')
  })

  it('explains an empty search result', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.view).toBe('list'))
    act(() => result.current.setQuery('zzz'))
    expect(result.current.view).toBe('empty')
    expect(result.current.emptyMessage).toBe('No providers match “zzz”.')
  })

  it('labels the confirm button with how many will be added', async () => {
    const { result } = render()
    await waitFor(() => expect(result.current.view).toBe('list'))
    expect(result.current).toMatchObject({ confirmLabel: 'Add providers', canConfirm: false })

    act(() => result.current.toggle('monzo'))
    expect(result.current).toMatchObject({ confirmLabel: 'Add 1 provider', canConfirm: true })

    act(() => result.current.toggle('aviva'))
    expect(result.current.confirmLabel).toBe('Add 2 providers')
  })

  it('adds, confirms with a toast and closes', async () => {
    const onClose = vi.fn()
    const { result } = render(onClose)
    await waitFor(() => expect(result.current.view).toBe('list'))
    act(() => result.current.toggle('monzo'))

    await act(() => result.current.add())

    expect(onClose).toHaveBeenCalled()
    expect(screen.getByText('Added 1 provider')).toBeInTheDocument()
  })

  it('stays open when adding fails', async () => {
    server.use(http.post('/api/accounts', () => HttpResponse.json({ message: 'Already added: Monzo' }, { status: 409 })))
    const onClose = vi.fn()
    const { result } = render(onClose)
    await waitFor(() => expect(result.current.view).toBe('list'))
    act(() => result.current.toggle('monzo'))

    await act(() => result.current.add())

    expect(onClose).not.toHaveBeenCalled()
    expect(result.current.addError?.message).toBe('Already added: Monzo')
  })
})
