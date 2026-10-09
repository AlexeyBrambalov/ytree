import { useState } from 'react'
import { apiUrl } from '../api/client'
import type { Account } from '../api/schemas'
import { MAX_STATEMENT_AGE_MONTHS } from '../domain/statement'
import { formatDate } from '../helpers/format'
import { CATEGORY_LABEL } from '../helpers/labels'
import type { ButtonVariant } from '../helpers/styles'
import { useOpenStatement } from './useOpenStatement'

export interface StatementSummary {
  fileName: string
  /** The file's API address, for the link itself (hover, copy link). */
  href: string
  dateLabel: string
  /** Why the statement no longer counts, or null while it is current. */
  ageNote: string | null
}

function summarizeStatement(account: Account): StatementSummary | null {
  if (!account.statement) return null
  return {
    fileName: account.statement.fileName,
    href: apiUrl(account.statement.fileUrl),
    dateLabel: formatDate(account.statement.statementDate),
    ageNote:
      account.status === 'OUTDATED'
        ? `Older than ${MAX_STATEMENT_AGE_MONTHS} months, so it won’t count. Upload a more recent one.`
        : null,
  }
}

/** What one row shows and does: labels, the main action, and the remove confirmation. */
export function useAccountRow(account: Account) {
  const [isConfirmingRemove, setConfirmingRemove] = useState(false)
  const openStatement = useOpenStatement()

  const actionVariant: ButtonVariant = account.status === 'UPLOADED' ? 'secondary' : 'primary'

  return {
    categoryLabel: CATEGORY_LABEL[account.provider.category],
    statement: summarizeStatement(account),
    actionLabel: account.statement ? 'Replace' : 'Upload',
    actionVariant,
    openStatement: () => {
      if (account.statement) void openStatement(account.statement)
    },
    isConfirmingRemove,
    requestRemove: () => setConfirmingRemove(true),
    cancelRemove: () => setConfirmingRemove(false),
  }
}
