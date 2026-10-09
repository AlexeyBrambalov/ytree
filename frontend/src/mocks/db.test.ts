import { statementFile } from '../test/utils'
import { createMockDb } from './db'

const today = new Date('2026-10-08T00:00:00Z')
const providers = [
  { id: 'barclays', name: 'Barclays', category: 'BANK' as const },
  { id: 'hsbc', name: 'HSBC', category: 'BANK' as const },
  { id: 'vanguard', name: 'Vanguard', category: 'INVESTMENT' as const },
]

const setup = () =>
  createMockDb({
    now: () => today,
    knownProviders: providers,
    accounts: [
      { providerId: 'barclays', statement: { fileName: 'jan.pdf', statementDate: '2026-09-30' } },
      { providerId: 'hsbc', statement: null },
    ],
  })

describe('mock backend', () => {
  it('derives status for each account', () => {
    const db = setup()
    expect(db.listAccounts().map((a) => [a.provider.name, a.status])).toEqual([
      ['Barclays', 'UPLOADED'],
      ['HSBC', 'MISSING'],
    ])
  })

  it('refuses to add a provider that is already added', () => {
    const db = setup()
    expect(() => db.addProviders(['hsbc'])).toThrow(/already/i)
    expect(db.listAccounts()).toHaveLength(2)
  })

  it('refuses an incomplete submission and lists every problem', () => {
    const db = setup()
    const result = db.submit()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems).toEqual([{ accountId: expect.any(String), providerName: 'HSBC', reason: 'MISSING' }])
  })

  it('refuses an outdated statement on submission', () => {
    const db = setup()
    const hsbc = db.listAccounts()[1]
    db.uploadStatement(hsbc.id, { file: statementFile('old.pdf'), statementDate: '2026-01-01' })
    const result = db.submit()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems[0].reason).toBe('OUTDATED')
  })

  it('accepts a submission once everything is current', () => {
    const db = setup()
    const hsbc = db.listAccounts()[1]
    db.uploadStatement(hsbc.id, { file: statementFile('new.pdf'), statementDate: '2026-10-01' })
    expect(db.submit().ok).toBe(true)
  })

  it('refuses a submission with no accounts', () => {
    const db = createMockDb({ now: () => today, knownProviders: providers, accounts: [] })
    const result = db.submit()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems[0].reason).toBe('NO_ACCOUNTS')
  })

  it('keeps the uploaded file and gives each upload a new URL', async () => {
    const db = setup()
    const barclays = db.listAccounts()[0]
    const before = barclays.statement!.fileUrl

    db.uploadStatement(barclays.id, { file: statementFile('feb.pdf', 'february'), statementDate: '2026-10-01' })

    const after = db.listAccounts()[0].statement!
    expect(after.fileName).toBe('feb.pdf')
    expect(after.fileUrl).not.toBe(before)
    expect(await db.getStatementFile(barclays.id).file.text()).toBe('february')
  })

  it('serves a placeholder PDF for seeded statements and 404s without one', async () => {
    const db = setup()
    const [barclays, hsbc] = db.listAccounts()
    expect(await db.getStatementFile(barclays.id).file.text()).toMatch(/^%PDF-1\.4[\s\S]*Barclays/)
    expect(() => db.getStatementFile(hsbc.id)).toThrow(/no statement/i)
  })
})
