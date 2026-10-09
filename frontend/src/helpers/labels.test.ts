import { describeProblem } from './labels'

describe('describeProblem', () => {
  it('names the provider and the reason', () => {
    expect(describeProblem({ accountId: 'a', providerName: 'HSBC', reason: 'MISSING' })).toBe('HSBC — statement missing')
    expect(describeProblem({ accountId: 'a', providerName: 'Vanguard', reason: 'OUTDATED' })).toBe(
      'Vanguard — statement outdated (older than 3 months)',
    )
  })

  it('omits the provider when the problem is about the whole set', () => {
    expect(describeProblem({ accountId: null, providerName: null, reason: 'NO_ACCOUNTS' })).toBe('Add at least one provider')
  })
})
