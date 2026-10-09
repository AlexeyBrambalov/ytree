import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { resetMockBackend, server, TEST_TODAY } from '../test/server'
import { renderWithProviders, statementFile } from '../test/utils'
import { AccountsScreen } from './AccountsScreen'

const renderScreen = async () => {
  const user = userEvent.setup()
  renderWithProviders(<AccountsScreen today={TEST_TODAY} />)
  await screen.findByRole('list', { name: /your providers/i })
  return user
}

const row = (name: string) => screen.getByRole('listitem', { name })
const submitButton = () => screen.getByRole('button', { name: /^submit/i })

async function uploadFor(user: ReturnType<typeof userEvent.setup>, provider: string, fileName: string, content = 'x') {
  await user.click(within(row(provider)).getByRole('button', { name: /upload|replace/i }))
  const dialog = await screen.findByRole('dialog')
  await user.upload(within(dialog).getByLabelText(/statement file/i), statementFile(fileName, content))
  await user.click(within(dialog).getByRole('button', { name: /save statement/i }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

describe('AccountsScreen', () => {
  it('shows a loading state, then each provider with its status and progress', async () => {
    renderWithProviders(<AccountsScreen today={TEST_TODAY} />)
    expect(screen.getByText(/loading your providers/i)).toBeInTheDocument()

    await screen.findByRole('list', { name: /your providers/i })
    expect(within(row('Barclays')).getByText('Uploaded')).toBeInTheDocument()
    expect(within(row('HSBC')).getByText('Missing')).toBeInTheDocument()
    expect(within(row('Vanguard')).getByText('Outdated')).toBeInTheDocument()
    expect(screen.getByText(/2 of 4 ready/i)).toBeInTheDocument()
  })

  it('blocks submit and says why until every statement is current, then submits', async () => {
    const user = await renderScreen()
    expect(submitButton()).toBeDisabled()
    expect(screen.getByText(/1 missing.*1 outdated/i)).toBeInTheDocument()

    await uploadFor(user, 'HSBC', 'hsbc.pdf')
    expect(within(row('HSBC')).getByText('Uploaded')).toBeInTheDocument()
    expect(screen.getByText(/3 of 4 ready/i)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()

    await uploadFor(user, 'Vanguard', 'vanguard.pdf')
    expect(submitButton()).toBeEnabled()

    await user.click(submitButton())
    expect(await screen.findByRole('heading', { name: /submitted/i })).toBeInTheDocument()
  })

  it('opens the uploaded file when its name is clicked', async () => {
    const user = await renderScreen()
    await uploadFor(user, 'HSBC', 'hsbc.pdf', 'my hsbc statement')

    const tab = { location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    let opened: Blob | undefined
    URL.createObjectURL = vi.fn((blob: Blob) => {
      opened = blob
      return 'blob:hsbc'
    })
    URL.revokeObjectURL = vi.fn()

    await user.click(within(row('HSBC')).getByRole('link', { name: /hsbc\.pdf/ }))

    await waitFor(() => expect(tab.location.href).toBe('blob:hsbc'))
    expect(await opened!.text()).toBe('my hsbc statement')
    vi.restoreAllMocks()
  })

  it('filters by status', async () => {
    const user = await renderScreen()
    await user.click(screen.getByRole('button', { name: /needs attention/i }))

    const items = within(screen.getByRole('list', { name: /your providers/i })).getAllByRole('listitem')
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual(['HSBC', 'Vanguard'])
  })

  it('adds several providers at once, never offering ones already added', async () => {
    const user = await renderScreen()
    await user.click(screen.getByRole('button', { name: /add provider/i }))
    const dialog = await screen.findByRole('dialog')

    await within(dialog).findByRole('checkbox', { name: /monzo/i })
    expect(within(dialog).queryByRole('checkbox', { name: /barclays/i })).not.toBeInTheDocument()

    await user.type(within(dialog).getByRole('searchbox'), 'av')
    await user.click(within(dialog).getByRole('checkbox', { name: /aviva/i }))
    await user.clear(within(dialog).getByRole('searchbox'))
    await user.click(within(dialog).getByRole('checkbox', { name: /monzo/i }))
    await user.click(within(dialog).getByRole('button', { name: /add 2 providers/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(row('Aviva')).getByText('Missing')).toBeInTheDocument()
    expect(within(row('Monzo')).getByText('Missing')).toBeInTheDocument()
    expect(screen.getByText(/2 of 6 ready/i)).toBeInTheDocument()
  })

  it('removes a provider', async () => {
    const user = await renderScreen()
    await user.click(screen.getByRole('button', { name: /remove hsbc/i }))
    await user.click(await screen.findByRole('button', { name: /yes, remove/i }))

    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'HSBC' })).not.toBeInTheDocument())
    expect(screen.getByText(/2 of 3 ready/i)).toBeInTheDocument()
  })

  it('rejects a submission that became incomplete behind the screen, and says what is wrong', async () => {
    const db = resetMockBackend({
      accounts: [{ providerId: 'barclays', statement: { fileName: 'a.pdf', statementDate: '2026-10-01' } }],
    })
    const user = await renderScreen()
    expect(submitButton()).toBeEnabled()

    // e.g. another tab replaced the statement with an old one; this screen is now stale.
    db.uploadStatement(db.listAccounts()[0].id, { file: statementFile('old.pdf'), statementDate: '2025-01-01' })
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(/barclays.*outdated/i)
    await waitFor(() => expect(within(row('Barclays')).getByText('Outdated')).toBeInTheDocument())
    expect(submitButton()).toBeDisabled()

    // Fixing it clears the problem.
    await uploadFor(user, 'Barclays', 'new.pdf')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('offers a retry when the list fails to load', async () => {
    server.use(http.get('/api/accounts', () => HttpResponse.json({ message: 'Service down' }, { status: 503 }), { once: true }))
    const user = userEvent.setup()
    renderWithProviders(<AccountsScreen today={TEST_TODAY} />)

    expect(await screen.findByText(/service down/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('list', { name: /your providers/i })).toBeInTheDocument()
  })
})
