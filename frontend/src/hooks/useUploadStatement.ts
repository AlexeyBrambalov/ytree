import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { UploadStatementRequest } from '../api/schemas'

export function useUploadStatement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accountId, ...req }: UploadStatementRequest & { accountId: string }) =>
      api.uploadStatement(accountId, req),
    // Status is computed by the server, so we take its answer rather than guessing.
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.accounts, updated),
  })
}
