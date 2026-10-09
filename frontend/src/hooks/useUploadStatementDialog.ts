import type { Account } from '../api/schemas'
import { MAX_STATEMENT_AGE_MONTHS } from '../domain/statement'
import { useStatementForm } from './useStatementForm'
import { useToast } from './useToast'
import { useUploadStatement } from './useUploadStatement'

interface Options {
  account: Account
  onClose: () => void
  today?: Date
}

export function useUploadStatementDialog({ account, onClose, today }: Options) {
  const upload = useUploadStatement()
  const toast = useToast()
  const providerName = account.provider.name

  const form = useStatementForm({
    today,
    onValid: (values) =>
      upload.mutate(
        { accountId: account.id, ...values },
        {
          onSuccess: () => {
            toast(`Statement saved for ${providerName}`)
            onClose()
          },
        },
      ),
  })

  const dateWarning =
    !form.errors.statementDate && form.wouldBeOutdated
      ? `This statement is older than ${MAX_STATEMENT_AGE_MONTHS} months, so it won’t count. Try a more recent one.`
      : null

  return {
    form,
    title: account.statement ? 'Replace statement' : 'Upload statement',
    description: `${providerName} · must be dated within the last ${MAX_STATEMENT_AGE_MONTHS} months.`,
    dateWarning,
    isSaving: upload.isPending,
    saveError: upload.error,
  }
}
