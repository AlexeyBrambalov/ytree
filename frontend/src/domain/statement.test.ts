import { getStatementStatus, isoDate, localIsoDate, subtractMonths } from './statement'

const today = new Date('2026-10-08T12:00:00Z')

describe('getStatementStatus', () => {
  it('is MISSING when there is no statement', () => {
    expect(getStatementStatus(null, today)).toBe('MISSING')
  })

  it('is UPLOADED for a statement from today', () => {
    expect(getStatementStatus({ statementDate: '2026-10-08' }, today)).toBe('UPLOADED')
  })

  it('is UPLOADED for a statement exactly 3 months old', () => {
    expect(getStatementStatus({ statementDate: '2026-07-08' }, today)).toBe('UPLOADED')
  })

  it('is OUTDATED for a statement one day older than 3 months', () => {
    expect(getStatementStatus({ statementDate: '2026-07-07' }, today)).toBe('OUTDATED')
  })

  it('clamps to the end of shorter months (May 31 - 3 months = Feb 28)', () => {
    const may31 = new Date('2026-05-31T00:00:00Z')
    expect(getStatementStatus({ statementDate: '2026-02-28' }, may31)).toBe('UPLOADED')
    expect(getStatementStatus({ statementDate: '2026-02-27' }, may31)).toBe('OUTDATED')
  })
})

describe('subtractMonths', () => {
  it('crosses year boundaries', () => {
    expect(isoDate(subtractMonths(new Date('2026-01-15T00:00:00Z'), 3))).toBe('2025-10-15')
  })
})

describe('localIsoDate', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // Local midnight is the previous UTC day anywhere east of UTC.
    expect(localIsoDate(new Date(2026, 9, 8, 0, 30))).toBe('2026-10-08')
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
