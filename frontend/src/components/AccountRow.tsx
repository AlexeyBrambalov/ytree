import type { Account } from '../api/schemas'
import type { ButtonVariant } from '../helpers/styles'
import { useAccountRow, type StatementSummary } from '../hooks/useAccountRow'
import { StatusPill } from './StatusPill'
import { Button } from './ui/Button'
import { InfoTip } from './ui/InfoTip'

/** Shared by the rows and the header so their columns line up. */
const ROW_GRID = 'grid grid-cols-account-row gap-x-4 px-5 sm:grid-cols-account-row-wide'

/** Column titles, shown from `sm` up where the row is one line. Rows carry their own labels for screen readers. */
export function AccountRowHeader() {
  return (
    <div aria-hidden="true" className={`${ROW_GRID} hidden border-b border-line py-2.5 text-xs font-medium text-muted sm:grid`}>
      <span>Provider</span>
      <span>Status</span>
      <span>Statement</span>
      <span>Date</span>
    </div>
  )
}

interface Props {
  account: Account
  onUpload: (account: Account) => void
  onRemove: (account: Account) => void
}

export function AccountRow({ account, onUpload, onRemove }: Props) {
  const row = useAccountRow(account)
  const name = account.provider.name

  return (
    <li aria-label={name} className={`${ROW_GRID} items-baseline gap-y-2 py-4`}>
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        <p className="text-xs text-muted">{row.categoryLabel}</p>
      </div>

      <div className="justify-self-end sm:justify-self-start">
        <StatusPill status={account.status} />
      </div>

      <div className="col-span-2 min-w-0 text-xs text-muted sm:col-span-1">
        <StatementFile statement={row.statement} onOpen={row.openStatement} />
      </div>

      <StatementDate statement={row.statement} />

      <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
        <RowActions
          name={name}
          actionLabel={row.actionLabel}
          actionVariant={row.actionVariant}
          isConfirmingRemove={row.isConfirmingRemove}
          onUpload={() => onUpload(account)}
          onRequestRemove={row.requestRemove}
          onCancelRemove={row.cancelRemove}
          onConfirmRemove={() => onRemove(account)}
        />
      </div>
    </li>
  )
}

function StatementFile({ statement, onOpen }: { statement: StatementSummary | null; onOpen: () => void }) {
  if (!statement) return <span>No statement yet</span>

  return (
    <a
      href={statement.href}
      target="_blank"
      rel="noreferrer"
      // Every click goes through the API (see useOpenStatement); the href is there for hover and "copy link".
      onClick={(e) => {
        e.preventDefault()
        onOpen()
      }}
      className="block w-fit max-w-full truncate font-mono text-navy-500 underline decoration-navy-300 underline-offset-2 hover:text-navy-900 hover:decoration-current"
    >
      {statement.fileName}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** Its own grid column; kept as an empty cell without a statement so the actions stay in place. */
function StatementDate({ statement }: { statement: StatementSummary | null }) {
  if (!statement) return <div className="hidden sm:block" />

  return (
    <div className={`col-span-2 flex items-center gap-1.5 text-xs sm:col-span-1 ${statement.ageNote ? 'text-warn-600' : 'text-muted'}`}>
      <span>
        {/* Visible on phones, where there is no header row; read out everywhere. */}
        <span className="sm:sr-only">Dated </span>
        {statement.dateLabel}
      </span>
      {statement.ageNote && <InfoTip label="Why is this outdated?" text={statement.ageNote} />}
    </div>
  )
}

interface RowActionsProps {
  name: string
  actionLabel: string
  actionVariant: ButtonVariant
  isConfirmingRemove: boolean
  onUpload: () => void
  onRequestRemove: () => void
  onCancelRemove: () => void
  onConfirmRemove: () => void
}

function RowActions(props: RowActionsProps) {
  const { name, actionLabel, actionVariant, isConfirmingRemove } = props
  const { onUpload, onRequestRemove, onCancelRemove, onConfirmRemove } = props

  if (isConfirmingRemove) {
    return (
      <>
        <span className="mr-1 text-xs text-muted">Remove?</span>
        <Button size="sm" variant="danger" onClick={onConfirmRemove}>Yes, remove</Button>
        <Button size="sm" variant="ghost" onClick={onCancelRemove}>Cancel</Button>
      </>
    )
  }

  return (
    <>
      <Button size="sm" variant={actionVariant} onClick={onUpload}>{actionLabel}</Button>
      <Button size="sm" variant="ghost" aria-label={`Remove ${name}`} onClick={onRequestRemove}>
        <span aria-hidden="true" className="text-base leading-none">×</span>
      </Button>
    </>
  )
}
