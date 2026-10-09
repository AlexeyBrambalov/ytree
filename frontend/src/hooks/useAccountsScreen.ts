import { useMemo, useState } from 'react'
import type { Account } from '../api/schemas'
import { outstandingProblems } from '../domain/readiness'
import { useAccountsOverview } from './useAccountsOverview'
import { useRemoveAccount } from './useRemoveAccount'
import { useSubmitAccounts } from './useSubmitAccounts'
import { useToast } from './useToast'

export type AccountsListView = 'loading' | 'error' | 'empty' | 'no-matches' | 'list'

/** Orchestrates the whole screen: data, which list state to show, dialogs, remove and submit. */
export function useAccountsScreen() {
  const overview = useAccountsOverview()
  const submission = useSubmitAccounts()
  const remove = useRemoveAccount()
  const toast = useToast()
  const [isAdding, setAdding] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<Account | null>(null)

  let listView: AccountsListView = 'list'
  if (overview.isLoading) listView = 'loading'
  else if (overview.isLoadingError) listView = 'error'
  else if (overview.accounts.length === 0) listView = 'empty'
  else if (overview.visibleAccounts.length === 0) listView = 'no-matches'

  const problems = useMemo(
    () => outstandingProblems(submission.problems, overview.accounts),
    [submission.problems, overview.accounts],
  )

  const removeAccount = (account: Account) =>
    remove.mutate(account.id, {
      onSuccess: () => toast(`Removed ${account.provider.name}`),
      onError: (e) => toast(`Couldn’t remove ${account.provider.name}: ${e.message}`, 'error'),
    })

  return {
    overview,
    listView,
    submission,
    problems,
    removeAccount,
    isAdding,
    openAdd: () => setAdding(true),
    closeAdd: () => setAdding(false),
    uploadTarget,
    openUpload: (account: Account) => setUploadTarget(account),
    closeUpload: () => setUploadTarget(null),
  }
}
