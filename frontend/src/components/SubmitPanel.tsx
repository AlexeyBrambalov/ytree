import { useId } from 'react'
import type { SubmissionProblem } from '../api/schemas'
import { readinessMessage, type Readiness } from '../domain/readiness'
import { describeProblem } from '../helpers/labels'
import { Button } from './ui/Button'

interface Props {
  readiness: Readiness
  isSubmitting: boolean
  problems: SubmissionProblem[]
  error: Error | null
  onSubmit: () => void
}

export function SubmitPanel({ readiness, isSubmitting, problems, error, onSubmit }: Props) {
  const hintId = useId()

  return (
    <div className="space-y-3">
      <ProblemList problems={problems} />
      {error && <p role="alert" className="rounded-2xl bg-bad-50 px-5 py-3 text-sm text-bad-600">{error.message}</p>}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p id={hintId} className={`text-sm ${hintTone(readiness)}`}>{readinessMessage(readiness)}</p>
        <Button
          variant="primary"
          disabled={!readiness.canSubmit}
          loading={isSubmitting}
          aria-describedby={hintId}
          onClick={onSubmit}
        >
          Submit statements
        </Button>
      </div>
    </div>
  )
}

/** Green when ready, red while something is still needed, neutral before any provider is added. */
function hintTone(readiness: Readiness): string {
  if (readiness.canSubmit) return 'text-ok-600'
  if (readiness.total === 0) return 'text-muted'
  return 'text-danger'
}

function ProblemList({ problems }: { problems: SubmissionProblem[] }) {
  if (problems.length === 0) return null

  return (
    <div role="alert" className="rounded-2xl bg-bad-50 px-5 py-4 text-sm text-bad-600">
      <p className="font-semibold">We couldn’t accept your submission yet:</p>
      <ul className="mt-1 list-disc pl-5">
        {problems.map((p, i) => (
          <li key={p.accountId ?? i}>{describeProblem(p)}</li>
        ))}
      </ul>
    </div>
  )
}
