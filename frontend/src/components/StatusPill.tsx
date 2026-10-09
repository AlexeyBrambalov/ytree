import type { StatementStatus } from '../domain/statement'
import { STATUS_LABEL } from '../helpers/labels'
import { STATUS_TONE } from '../helpers/styles'

export function StatusPill({ status }: { status: StatementStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_TONE[status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}
