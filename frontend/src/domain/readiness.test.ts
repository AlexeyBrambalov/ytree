import { filterByStatus, outstandingProblems, readinessMessage, readinessPercent, summarizeReadiness } from './readiness'
import type { StatementStatus } from './statement'

const acc = (id: string, status: StatementStatus) => ({ id, status })

describe('summarizeReadiness', () => {
  it('allows submit only when every account is UPLOADED', () => {
    const r = summarizeReadiness([acc('a', 'UPLOADED'), acc('b', 'UPLOADED')])
    expect(r).toEqual({ total: 2, ready: 2, missing: 0, outdated: 0, canSubmit: true })
  })

  it('blocks submit when anything is MISSING or OUTDATED', () => {
    const r = summarizeReadiness([acc('a', 'UPLOADED'), acc('b', 'MISSING'), acc('c', 'OUTDATED')])
    expect(r).toEqual({ total: 3, ready: 1, missing: 1, outdated: 1, canSubmit: false })
  })

  it('blocks submit when there are no accounts at all', () => {
    expect(summarizeReadiness([]).canSubmit).toBe(false)
  })
})

describe('filterByStatus', () => {
  const accounts = [acc('a', 'UPLOADED'), acc('b', 'MISSING'), acc('c', 'OUTDATED')]

  it('returns everything for ALL', () => {
    expect(filterByStatus(accounts, 'ALL')).toHaveLength(3)
  })

  it('returns only matching accounts', () => {
    expect(filterByStatus(accounts, 'MISSING').map((a) => a.id)).toEqual(['b'])
  })

  it('NEEDS_ATTENTION returns everything not UPLOADED', () => {
    expect(filterByStatus(accounts, 'NEEDS_ATTENTION').map((a) => a.id)).toEqual(['b', 'c'])
  })
})

describe('outstandingProblems', () => {
  const problems = [
    { accountId: 'a', providerName: 'A', reason: 'MISSING' as const },
    { accountId: 'b', providerName: 'B', reason: 'OUTDATED' as const },
  ]

  it('keeps problems for accounts that still need attention', () => {
    expect(outstandingProblems(problems, [acc('a', 'MISSING'), acc('b', 'OUTDATED')])).toEqual(problems)
  })

  it('drops problems the client has since fixed or removed', () => {
    expect(outstandingProblems(problems, [acc('a', 'UPLOADED')])).toEqual([])
  })

  it('drops NO_ACCOUNTS once a provider is added', () => {
    const noAccounts = [{ accountId: null, providerName: null, reason: 'NO_ACCOUNTS' as const }]
    expect(outstandingProblems(noAccounts, [])).toEqual(noAccounts)
    expect(outstandingProblems(noAccounts, [acc('a', 'MISSING')])).toEqual([])
  })
})

describe('readinessMessage', () => {
  it('tells the client exactly what is still needed', () => {
    expect(readinessMessage(summarizeReadiness([acc('a', 'MISSING'), acc('b', 'OUTDATED'), acc('c', 'MISSING')]))).toBe(
      'Still needed: 2 missing, 1 outdated.',
    )
  })

  it('confirms when ready, and nudges when empty', () => {
    expect(readinessMessage(summarizeReadiness([acc('a', 'UPLOADED')]))).toMatch(/you can submit/)
    expect(readinessMessage(summarizeReadiness([]))).toMatch(/add the providers/i)
  })
})

describe('readinessPercent', () => {
  it('is the rounded share of ready accounts, and 0 when empty', () => {
    expect(readinessPercent(summarizeReadiness([acc('a', 'UPLOADED'), acc('b', 'MISSING'), acc('c', 'MISSING')]))).toBe(33)
    expect(readinessPercent(summarizeReadiness([]))).toBe(0)
  })
})
