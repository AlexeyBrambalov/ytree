import type { StatementStatus } from './statement'

export type StatusFilter = 'ALL' | 'NEEDS_ATTENTION' | StatementStatus

export const STATUS_FILTERS: StatusFilter[] = ['ALL', 'NEEDS_ATTENTION', 'MISSING', 'OUTDATED', 'UPLOADED']

export const PROBLEM_REASONS = ['MISSING', 'OUTDATED', 'NO_ACCOUNTS'] as const
export type ProblemReason = (typeof PROBLEM_REASONS)[number]

export interface Readiness {
  total: number
  ready: number
  missing: number
  outdated: number
  canSubmit: boolean
}

export function summarizeReadiness(accounts: ReadonlyArray<{ status: StatementStatus }>): Readiness {
  const count = (s: StatementStatus) => accounts.filter((a) => a.status === s).length
  const ready = count('UPLOADED')
  return {
    total: accounts.length,
    ready,
    missing: count('MISSING'),
    outdated: count('OUTDATED'),
    canSubmit: accounts.length > 0 && ready === accounts.length,
  }
}

export function filterByStatus<T extends { status: StatementStatus }>(
  accounts: readonly T[],
  filter: StatusFilter,
): T[] {
  switch (filter) {
    case 'ALL':
      return [...accounts]
    case 'NEEDS_ATTENTION':
      return accounts.filter((a) => a.status !== 'UPLOADED')
    default:
      return accounts.filter((a) => a.status === filter)
  }
}

interface Problem {
  accountId: string | null
  reason: ProblemReason
}

/** A rejected submission's problems, minus the ones the client has fixed since. */
export function outstandingProblems<P extends Problem>(
  problems: readonly P[],
  accounts: ReadonlyArray<{ id: string; status: StatementStatus }>,
): P[] {
  return problems.filter((p) => {
    if (p.reason === 'NO_ACCOUNTS') return accounts.length === 0
    return accounts.some((a) => a.id === p.accountId && a.status !== 'UPLOADED')
  })
}

export function readinessMessage(r: Readiness): string {
  if (r.total === 0) return 'Add the providers you hold money with to get started.'
  if (r.canSubmit) return 'Everything is in order — you can submit.'
  const parts = [r.missing && `${r.missing} missing`, r.outdated && `${r.outdated} outdated`].filter(Boolean)
  return `Still needed: ${parts.join(', ')}.`
}

export function readinessPercent(r: Readiness): number {
  if (r.total === 0) return 0
  return Math.round((r.ready / r.total) * 100)
}
