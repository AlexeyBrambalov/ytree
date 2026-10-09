import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { queryKeys } from '../api/queryKeys'
import type { Account } from '../api/schemas'
import { TEST_TODAY } from '../test/server'
import { createTestQueryClient, createWrapper, statementFile } from '../test/utils'
import { useAccounts } from './useAccounts'
import { useUploadStatementDialog } from './useUploadStatementDialog'

async function loadAccount(name: string) {
  const client = createTestQueryClient()
  const wrapper = createWrapper(client)
  const { result } = renderHook(() => useAccounts(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  return { client, wrapper, account: result.current.data!.find((a) => a.provider.name === name)! }
}

describe('useUploadStatementDialog', () => {
  it('titles the dialog Upload or Replace depending on the existing statement', async () => {
    const { wrapper, account } = await loadAccount('HSBC')
    const { result } = renderHook(() => useUploadStatementDialog({ account, today: TEST_TODAY, onClose: vi.fn() }), { wrapper })
    expect(result.current.title).toBe('Upload statement')
    expect(result.current.description).toBe('HSBC · must be dated within the last 3 months.')

    const barclays = (await loadAccount('Barclays')).account
    const replaced = renderHook(() => useUploadStatementDialog({ account: barclays, today: TEST_TODAY, onClose: vi.fn() }), { wrapper })
    expect(replaced.result.current.title).toBe('Replace statement')
  })

  it('warns about an outdated date only when the date is otherwise valid', async () => {
    const { wrapper, account } = await loadAccount('HSBC')
    const { result } = renderHook(() => useUploadStatementDialog({ account, today: TEST_TODAY, onClose: vi.fn() }), { wrapper })
    expect(result.current.dateWarning).toBeNull()

    act(() => result.current.form.setStatementDate('2026-01-01'))
    expect(result.current.dateWarning).toMatch(/older than 3 months/)
  })

  it('saves, updates the accounts, toasts and closes', async () => {
    const { client, wrapper, account } = await loadAccount('HSBC')
    const onClose = vi.fn()
    const { result } = renderHook(() => useUploadStatementDialog({ account, today: TEST_TODAY, onClose }), { wrapper })

    act(() => result.current.form.setFile(statementFile('hsbc.pdf')))
    act(() => result.current.form.handleSubmit())

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const hsbc = client.getQueryData<Account[]>(queryKeys.accounts)!.find((a) => a.id === account.id)!
    expect(hsbc.status).toBe('UPLOADED')
    expect(screen.getByText('Statement saved for HSBC')).toBeInTheDocument()
  })
})
