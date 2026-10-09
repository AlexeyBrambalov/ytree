import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { Account } from '../api/schemas'

const removeKey = ['removeAccount'] as const

/** Optimistic: the row disappears immediately and comes back if the server refuses. */
export function useRemoveAccount() {
  const queryClient = useQueryClient()
  // Each response lists the accounts as of that request, so while other removes are still in
  // flight it would bring their rows back. Only the last one to settle may write the list.
  const isLastRemove = () => queryClient.isMutating({ mutationKey: removeKey }) === 1

  return useMutation({
    mutationKey: removeKey,
    mutationFn: api.removeAccount,
    onMutate: async (accountId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.accounts })
      const old = queryClient.getQueryData<Account[]>(queryKeys.accounts) ?? []
      const index = old.findIndex((a) => a.id === accountId)
      queryClient.setQueryData<Account[]>(queryKeys.accounts, old.filter((a) => a.id !== accountId))
      return { removed: old[index], index }
    },
    // Put back only this row, so a failure doesn't undo other removes made meanwhile.
    onError: (_err, _id, context) => {
      if (!context?.removed) return
      const { removed, index } = context
      queryClient.setQueryData<Account[]>(queryKeys.accounts, (current = []) => {
        if (current.some((a) => a.id === removed.id)) return current
        return [...current.slice(0, index), removed, ...current.slice(index)]
      })
    },
    onSuccess: (updated) => {
      if (isLastRemove()) queryClient.setQueryData(queryKeys.accounts, updated)
    },
  })
}
