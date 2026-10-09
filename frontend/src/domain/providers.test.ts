import { searchAvailableProviders } from './providers'

const providers = [
  { id: 'barclays', name: 'Barclays' },
  { id: 'hsbc', name: 'HSBC' },
  { id: 'legal-general', name: 'Legal & General' },
]

describe('searchAvailableProviders', () => {
  it('excludes providers the client has already added', () => {
    expect(searchAvailableProviders(providers, '', new Set(['hsbc'])).map((p) => p.id)).toEqual([
      'barclays',
      'legal-general',
    ])
  })

  it('matches case-insensitively anywhere in the name, ignoring surrounding spaces', () => {
    expect(searchAvailableProviders(providers, '  GEN ', new Set()).map((p) => p.id)).toEqual(['legal-general'])
  })

  it('returns results sorted by name', () => {
    const unsorted = [{ id: 'z', name: 'Zopa' }, { id: 'a', name: 'Aviva' }]
    expect(searchAvailableProviders(unsorted, '', new Set()).map((p) => p.id)).toEqual(['a', 'z'])
  })
})
