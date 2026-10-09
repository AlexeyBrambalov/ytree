import type { ReactNode } from 'react'
import type { Account } from '../api/schemas'
import { assertNever } from '../helpers/assertNever'
import { QA } from '../helpers/qa'
import { useAccountsScreen, type AccountsListView } from '../hooks/useAccountsScreen'
import { AccountRow, AccountRowHeader } from './AccountRow'
import { AddProvidersDialog } from './AddProvidersDialog'
import { ReadinessHeader } from './ReadinessHeader'
import { StatusFilterBar } from './StatusFilterBar'
import { SubmitPanel } from './SubmitPanel'
import { UploadStatementDialog } from './UploadStatementDialog'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'

/** `today` is injectable so tests (and the 3-month rule) are deterministic. */
export function AccountsScreen({ today }: { today?: Date }) {
  const screen = useAccountsScreen()
  const { overview, submission } = screen

  if (submission.isSubmitted) return <SubmittedConfirmation />

  return (
    <Shell>
      <ReadinessHeader readiness={overview.readiness} />

      <section className="mt-8 rounded-3xl bg-white shadow-sm ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <StatusFilterBar value={overview.filter} counts={overview.filterCounts} onChange={overview.setFilter} />
          {overview.isFetching && !overview.isLoading && <Spinner className="size-4 text-navy-300" />}
        </div>

        <AccountListBody
          view={screen.listView}
          accounts={overview.visibleAccounts}
          error={overview.error}
          onRetry={() => void overview.refetch()}
          onShowAll={() => overview.setFilter('ALL')}
          onUpload={screen.openUpload}
          onRemove={screen.removeAccount}
        />

        <div className="border-t border-line px-5 py-4">
          <Button variant="secondary" data-qa={QA.addProviderButton} onClick={screen.openAdd} disabled={overview.isLoading}>
            + Add provider
          </Button>
        </div>
      </section>

      <div className="mt-6">
        <SubmitPanel
          readiness={overview.readiness}
          isSubmitting={submission.isSubmitting}
          problems={screen.problems}
          error={submission.error}
          onSubmit={submission.submit}
        />
      </div>

      {screen.isAdding && <AddProvidersDialog onClose={screen.closeAdd} />}
      {screen.uploadTarget && <UploadStatementDialog account={screen.uploadTarget} today={today} onClose={screen.closeUpload} />}
    </Shell>
  )
}

interface AccountListBodyProps {
  view: AccountsListView
  accounts: Account[]
  error: Error | null
  onRetry: () => void
  onShowAll: () => void
  onUpload: (account: Account) => void
  onRemove: (account: Account) => void
}

function AccountListBody({ view, accounts, error, onRetry, onShowAll, onUpload, onRemove }: AccountListBodyProps) {
  switch (view) {
    case 'loading':
      return <p data-qa={QA.accountsLoading} className="flex items-center gap-3 px-5 py-10 text-muted"><Spinner /> Loading your providers…</p>

    case 'error':
      return (
        <div data-qa={QA.accountsError} className="px-5 py-10">
          <p className="text-bad-600">{error?.message}</p>
          <Button size="sm" className="mt-3" data-qa={QA.accountsRetryButton} onClick={onRetry}>Try again</Button>
        </div>
      )

    case 'empty':
      return <p data-qa={QA.accountsEmpty} className="px-5 py-10 text-muted">No providers yet. Add the ones you hold money with.</p>

    case 'no-matches':
      return (
        <div data-qa={QA.accountsNoMatches} className="px-5 py-10 text-muted">
          Nothing matches this filter.{' '}
          <button type="button" data-qa={QA.showAllButton} className="font-semibold text-navy-900 underline" onClick={onShowAll}>
            Show all
          </button>
        </div>
      )

    case 'list':
      return (
        <>
          <AccountRowHeader />
          <ul aria-label="Your providers" data-qa={QA.accountsList} className="divide-y divide-line">
            {accounts.map((a) => (
              <AccountRow key={a.id} account={a} onUpload={onUpload} onRemove={onRemove} />
            ))}
          </ul>
        </>
      )

    default:
      return assertNever(view)
  }
}

function SubmittedConfirmation() {
  return (
    <Shell>
      <div data-qa={QA.submittedConfirmation} className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-line">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-cyan-50 text-xl text-cyan-700">✓</div>
        <h1 className="font-display text-2xl font-semibold">Statements submitted</h1>
        <p className="mt-2 text-muted">Thanks — your adviser now has everything they need to get started.</p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-16">{children}</main>
}
