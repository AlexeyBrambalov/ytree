import type { ProviderCategory, SubmissionProblem } from '../api/schemas'
import type { StatusFilter } from '../domain/readiness'
import { MAX_STATEMENT_AGE_MONTHS, type StatementStatus } from '../domain/statement'

export const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  BANK: 'Bank',
  PENSION: 'Pension',
  INVESTMENT: 'Investments',
}

export const STATUS_LABEL: Record<StatementStatus, string> = {
  UPLOADED: 'Uploaded',
  MISSING: 'Missing',
  OUTDATED: 'Outdated',
}

export const FILTER_LABEL: Record<StatusFilter, string> = {
  ALL: 'All',
  NEEDS_ATTENTION: 'Needs attention',
  ...STATUS_LABEL,
}

const PROBLEM_REASON: Record<SubmissionProblem['reason'], string> = {
  MISSING: 'statement missing',
  OUTDATED: `statement outdated (older than ${MAX_STATEMENT_AGE_MONTHS} months)`,
  NO_ACCOUNTS: 'Add at least one provider',
}

export function describeProblem(problem: SubmissionProblem): string {
  const reason = PROBLEM_REASON[problem.reason]
  if (!problem.providerName) return reason
  return `${problem.providerName} — ${reason}`
}
