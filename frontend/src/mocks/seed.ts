import type { Provider } from '../api/schemas'
import { isoDate, subtractMonths } from '../domain/statement'
import type { MockDbOptions } from './db'

export const KNOWN_PROVIDERS: Provider[] = [
  { id: 'barclays', name: 'Barclays', category: 'BANK' },
  { id: 'hsbc', name: 'HSBC', category: 'BANK' },
  { id: 'lloyds', name: 'Lloyds', category: 'BANK' },
  { id: 'natwest', name: 'NatWest', category: 'BANK' },
  { id: 'santander', name: 'Santander', category: 'BANK' },
  { id: 'monzo', name: 'Monzo', category: 'BANK' },
  { id: 'starling', name: 'Starling', category: 'BANK' },
  { id: 'nationwide', name: 'Nationwide', category: 'BANK' },
  { id: 'vanguard', name: 'Vanguard', category: 'INVESTMENT' },
  { id: 'fidelity', name: 'Fidelity', category: 'INVESTMENT' },
  { id: 'hargreaves-lansdown', name: 'Hargreaves Lansdown', category: 'INVESTMENT' },
  { id: 'aj-bell', name: 'AJ Bell', category: 'INVESTMENT' },
  { id: 'interactive-investor', name: 'Interactive Investor', category: 'INVESTMENT' },
  { id: 'aviva', name: 'Aviva', category: 'PENSION' },
  { id: 'legal-general', name: 'Legal & General', category: 'PENSION' },
  { id: 'scottish-widows', name: 'Scottish Widows', category: 'PENSION' },
  { id: 'royal-london', name: 'Royal London', category: 'PENSION' },
  { id: 'standard-life', name: 'Standard Life', category: 'PENSION' },
  { id: 'nest', name: 'Nest', category: 'PENSION' },
]

/** Seed dates are relative to "now" so the demo always shows one of each status. */
export function seedOptions(now: () => Date = () => new Date()): MockDbOptions {
  const today = now()
  const daysAgo = (n: number) => isoDate(new Date(today.getTime() - n * 86_400_000))
  return {
    now,
    knownProviders: KNOWN_PROVIDERS,
    accounts: [
      { providerId: 'barclays', statement: { fileName: 'statement_jan.pdf', statementDate: daysAgo(12) } },
      { providerId: 'hsbc', statement: null },
      {
        providerId: 'vanguard',
        statement: { fileName: 'old_statement.pdf', statementDate: isoDate(subtractMonths(today, 5)) },
      },
      { providerId: 'fidelity', statement: { fileName: 'q4_2025.pdf', statementDate: daysAgo(30) } },
    ],
  }
}
