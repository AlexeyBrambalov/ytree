import { act, renderHook, screen } from '@testing-library/react'
import { resetMockBackend } from '../test/server'
import { createWrapper } from '../test/utils'
import { useOpenStatement } from './useOpenStatement'

function fakeTab() {
  return { location: { href: '' }, close: vi.fn() }
}

describe('useOpenStatement', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:statement')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  const open = (fileUrl: string) => {
    const { result } = renderHook(() => useOpenStatement(), { wrapper: createWrapper() })
    return act(() => result.current({ fileUrl, fileName: 'jan.pdf' }))
  }

  it('fetches the file through the API and shows it in the tab it opened', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const barclays = resetMockBackend().listAccounts()[0]
    await open(barclays.statement!.fileUrl)

    expect(window.open).toHaveBeenCalledWith('', '_blank')
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/pdf')
    expect(tab.location.href).toBe('blob:statement')
  })

  it('closes the tab and explains when the file cannot be fetched', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    await open('/api/accounts/missing/statement/file')

    expect(tab.close).toHaveBeenCalled()
    expect(screen.getByText(/couldn’t open jan\.pdf: that account no longer exists/i)).toBeInTheDocument()
  })

  it('asks to allow pop-ups when the browser blocks the tab', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    await open('/api/accounts/any/statement/file')
    expect(screen.getByText(/allow pop-ups/i)).toBeInTheDocument()
  })
})
