import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { queryKeys } from '../api/queryKeys'
import type { Account } from '../api/schemas'
import { server } from '../test/server'
import { createTestQueryClient, createWrapper, statementFile } from '../test/utils'
import { useAccounts } from './useAccounts'
import { useRemoveAccount } from './useRemoveAccount'
import { useUploadStatement } from './useUploadStatement'

async function setup() {
  const client = createTestQueryClient()
  const wrapper = createWrapper(client)
  const accounts = renderHook(() => useAccounts(), { wrapper })
  await waitFor(() => expect(accounts.result.current.isSuccess).toBe(true))
  const byName = (name: string) => accounts.result.current.data!.find((a) => a.provider.name === name)!
  return { client, wrapper, byName, names: () => client.getQueryData<Account[]>(queryKeys.accounts)!.map((a) => a.provider.name) }
}

describe('useRemoveAccount', () => {
  it('removes the account optimistically, before the server answers', async () => {
    const { wrapper, byName, names } = await setup()
    server.use(http.delete('/api/accounts/:id', async () => { await delay('infinite'); return HttpResponse.json([]) }))
    const { result } = renderHook(() => useRemoveAccount(), { wrapper })

    act(() => result.current.mutate(byName('HSBC').id))
    await waitFor(() => expect(names()).not.toContain('HSBC'))
  })

  it('restores the account if the server refuses', async () => {
    const { wrapper, byName, names } = await setup()
    server.use(http.delete('/api/accounts/:id', () => HttpResponse.json({ message: 'Nope' }, { status: 500 })))
    const { result } = renderHook(() => useRemoveAccount(), { wrapper })

    act(() => result.current.mutate(byName('HSBC').id))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(names()).toContain('HSBC')
  })
})

describe('useRemoveAccount (concurrent)', () => {
  it('does not bring back a row that another in-flight remove took out', async () => {
    const { wrapper, byName, names } = await setup()
    const hsbc = byName('HSBC').id
    let releaseHsbc = () => {}
    const hsbcHeld = new Promise<void>((resolve) => (releaseHsbc = resolve))
    // HSBC's delete is held; Barclays' answers at once with a list that still has HSBC in it.
    server.use(
      http.delete('/api/accounts/:id', async ({ params }) => {
        if (params.id === hsbc) await hsbcHeld
        return HttpResponse.json(accounts.result.current.data!)
      }),
    )
    const accounts = renderHook(() => useAccounts(), { wrapper })
    const first = renderHook(() => useRemoveAccount(), { wrapper })
    const second = renderHook(() => useRemoveAccount(), { wrapper })

    act(() => first.result.current.mutate(hsbc))
    await waitFor(() => expect(names()).not.toContain('HSBC'))
    await act(() => second.result.current.mutateAsync(byName('Barclays').id))

    expect(names()).not.toContain('HSBC')
    expect(names()).not.toContain('Barclays')
    releaseHsbc()
  })

  it('restores only the failed row', async () => {
    const { wrapper, byName, names } = await setup()
    const hsbc = byName('HSBC').id
    server.use(
      http.delete('/api/accounts/:id', async ({ params }) => {
        if (params.id === hsbc) {
          await delay(50)
          return HttpResponse.json({ message: 'Nope' }, { status: 500 })
        }
        await delay('infinite')
        return HttpResponse.json([])
      }),
    )
    const first = renderHook(() => useRemoveAccount(), { wrapper })
    const second = renderHook(() => useRemoveAccount(), { wrapper })

    // HSBC goes first, so its snapshot still holds Barclays; the rollback must not restore it.
    const barclays = byName('Barclays').id
    act(() => first.result.current.mutate(hsbc))
    act(() => second.result.current.mutate(barclays))
    await waitFor(() => expect(first.result.current.isError).toBe(true))

    expect(names()).toContain('HSBC')
    expect(names()).not.toContain('Barclays')
  })
})

describe('useUploadStatement', () => {
  it('turns a MISSING account into UPLOADED', async () => {
    const { client, wrapper, byName } = await setup()
    const { result } = renderHook(() => useUploadStatement(), { wrapper })

    await act(() =>
      result.current.mutateAsync({ accountId: byName('HSBC').id, file: statementFile('hsbc.pdf'), statementDate: '2026-10-01' }),
    )

    const hsbc = client.getQueryData<Account[]>(queryKeys.accounts)!.find((a) => a.provider.name === 'HSBC')!
    expect(hsbc.status).toBe('UPLOADED')
    expect(hsbc.statement?.fileName).toBe('hsbc.pdf')
  })
})
