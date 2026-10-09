import { formatDate, pluralize } from './format'

describe('formatDate', () => {
  it('formats an ISO date for UK readers, independent of the local timezone', () => {
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026')
  })
})

describe('pluralize', () => {
  it('uses the singular for exactly one', () => {
    expect(pluralize(1, 'provider')).toBe('1 provider')
  })

  it('adds an s otherwise', () => {
    expect(pluralize(0, 'provider')).toBe('0 providers')
    expect(pluralize(3, 'provider')).toBe('3 providers')
  })
})
