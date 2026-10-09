import { readinessPercent, type Readiness } from '../domain/readiness'
import { MAX_STATEMENT_AGE_MONTHS } from '../domain/statement'
import { QA } from '../helpers/qa'

export function ReadinessHeader({ readiness }: { readiness: Readiness }) {
  return (
    <header className="space-y-4">
      <p className="text-xs font-semibold tracking-eyebrow text-cyan-700 uppercase">Onboarding · Step 2</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Connect your accounts</h1>
        <p data-qa={QA.readinessCount} className="text-sm font-medium text-muted tabular-nums">
          {readiness.ready} of {readiness.total} ready
        </p>
      </div>
      <p className="max-w-prose text-muted">
        We need a statement from the last {MAX_STATEMENT_AGE_MONTHS} months for every provider you hold money with.
      </p>
      <div
        role="progressbar"
        data-qa={QA.readinessProgress}
        aria-label="Statements ready"
        aria-valuemin={0}
        aria-valuemax={readiness.total}
        aria-valuenow={readiness.ready}
        className="h-2 overflow-hidden rounded-full bg-navy-100"
      >
        <div className="h-full rounded-full bg-cyan-400 transition-width duration-500" style={{ width: `${readinessPercent(readiness)}%` }} />
      </div>
    </header>
  )
}
