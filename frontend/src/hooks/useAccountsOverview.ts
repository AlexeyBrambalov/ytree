import { useMemo, useState } from 'react'
import type { Account } from '../api/schemas'
import { filterByStatus, STATUS_FILTERS, summarizeReadiness, type StatusFilter } from '../domain/readiness'
import { useAccounts } from './useAccounts'

const EMPTY: Account[] = []

/** Everything the main screen needs: accounts, the filtered view, and "am I ready to submit?". */
export function useAccountsOverview() {
  const { data, isLoading, isLoadingError, error, refetch, isFetching } = useAccounts()
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const accounts = data ?? EMPTY

  const readiness = useMemo(() => summarizeReadiness(accounts), [accounts])
  const visibleAccounts = useMemo(() => filterByStatus(accounts, filter), [accounts, filter])
  const filterCounts = useMemo(
    () => Object.fromEntries(STATUS_FILTERS.map((f) => [f, filterByStatus(accounts, f).length])) as Record<StatusFilter, number>,
    [accounts],
  )

  return { accounts, visibleAccounts, filter, setFilter, filterCounts, readiness, isLoading, isFetching, isLoadingError, error, refetch }
}
