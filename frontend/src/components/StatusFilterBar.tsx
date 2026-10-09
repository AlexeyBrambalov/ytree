import { STATUS_FILTERS, type StatusFilter } from '../domain/readiness'
import { FILTER_LABEL } from '../helpers/labels'
import { QA } from '../helpers/qa'
import { FILTER_CHIP } from '../helpers/styles'

interface Props {
  value: StatusFilter
  counts: Record<StatusFilter, number>
  onChange: (f: StatusFilter) => void
}

export function StatusFilterBar({ value, counts, onChange }: Props) {
  return (
    <div role="group" aria-label="Filter by status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {STATUS_FILTERS.map((f) => (
        <FilterChip key={f} qa={QA.filter[f]} label={FILTER_LABEL[f]} count={counts[f]} active={f === value} onClick={() => onChange(f)} />
      ))}
    </div>
  )
}

interface ChipProps {
  qa: string
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function FilterChip({ qa, label, count, active, onClick }: ChipProps) {
  const style = active ? FILTER_CHIP.active : FILTER_CHIP.inactive

  return (
    <button
      type="button"
      data-qa={qa}
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-control font-medium transition ${style.chip}`}
    >
      {label} <span className={`tabular-nums ${style.count}`}>{count}</span>
    </button>
  )
}
