import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, SubmissionRejectedError } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import type { SubmissionProblem } from '../api/schemas'

const NO_PROBLEMS: SubmissionProblem[] = []

export function useSubmitAccounts() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: api.submit,
    onError: (error) => {
      // The server disagrees with what we showed: refresh so the screen matches reality.
      if (error instanceof SubmissionRejectedError) void queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
    },
  })

  const rejected = mutation.error instanceof SubmissionRejectedError ? mutation.error : null

  return {
    submit: () => mutation.mutate(),
    isSubmitting: mutation.isPending,
    isSubmitted: mutation.isSuccess,
    problems: rejected?.problems ?? NO_PROBLEMS,
    /** Non-validation failures (network, 5xx). */
    error: rejected ? null : mutation.error,
  }
}
