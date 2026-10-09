import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { searchAvailableProviders } from '../domain/providers'
import { useAccounts } from './useAccounts'
import { useKnownProviders } from './useKnownProviders'

/** Search known providers, pick several, add them in one request. */
export function useProviderPicker() {
  const queryClient = useQueryClient()
  const known = useKnownProviders()
  const accounts = useAccounts()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const addedIds = useMemo(() => new Set(accounts.data?.map((a) => a.provider.id)), [accounts.data])
  const providers = useMemo(
    () => searchAvailableProviders(known.data ?? [], query, addedIds),
    [known.data, query, addedIds],
  )

  const toggle = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const mutation = useMutation({
    mutationFn: (providerIds: string[]) => api.addProviders({ providerIds }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.accounts, updated)
      setSelectedIds([])
      setQuery('')
    },
    // e.g. 409 if another tab added one meanwhile: resync so the picker is accurate.
    onError: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
  })

  return {
    query,
    setQuery,
    providers,
    selectedIds,
    toggle,
    confirm: () => mutation.mutateAsync(selectedIds),
    isLoading: known.isLoading || accounts.isLoading,
    // Only a failed first load blocks the picker; a failed background refetch keeps the cached data.
    loadError: [known, accounts].find((q) => q.isLoadingError)?.error ?? null,
    retryLoad: () => {
      void known.refetch()
      void accounts.refetch()
    },
    isAdding: mutation.isPending,
    addError: mutation.error,
  }
}
