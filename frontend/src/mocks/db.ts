import type { Account, Provider, SubmissionProblem } from '../api/schemas'
import { getStatementStatus } from '../domain/statement'
import { samplePdf } from './samplePdf'

export class MockDbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

interface StoredStatement {
  fileName: string
  statementDate: string
  file: Blob
  /** Bumped on every upload so a replaced file gets a new URL (no stale browser cache). */
  version: number
}

interface StoredAccount {
  id: string
  providerId: string
  statement: StoredStatement | null
}

/** Seeded statements get a generated placeholder PDF. */
interface SeedStatement {
  fileName: string
  statementDate: string
}

export interface MockDbOptions {
  now: () => Date
  knownProviders: Provider[]
  accounts: Array<{ providerId: string; statement: SeedStatement | null }>
}

export type SubmitResult = { ok: true; submittedAt: string } | { ok: false; problems: SubmissionProblem[] }

let nextId = 1
const newAccountId = () => `acc-${nextId++}`
let nextVersion = 1

/**
 * In-memory stand-in for the Kotlin service. It enforces the same invariants the real
 * backend does: no duplicate providers, and never accept an incomplete submission.
 */
export function createMockDb({ now, knownProviders, accounts: seed }: MockDbOptions) {
  const providersById = new Map(knownProviders.map((p) => [p.id, p]))

  const seedStatement = (providerId: string, s: SeedStatement): StoredStatement => ({
    ...s,
    file: samplePdf(['Sample statement', providersById.get(providerId)!.name, `Statement date: ${s.statementDate}`]),
    version: nextVersion++,
  })

  let accounts: StoredAccount[] = seed.map((a) => ({
    id: newAccountId(),
    providerId: a.providerId,
    statement: a.statement && seedStatement(a.providerId, a.statement),
  }))

  const toDto = (a: StoredAccount): Account => ({
    id: a.id,
    provider: providersById.get(a.providerId)!,
    statement: a.statement && {
      fileName: a.statement.fileName,
      statementDate: a.statement.statementDate,
      fileUrl: `/api/accounts/${encodeURIComponent(a.id)}/statement/file?v=${a.statement.version}`,
    },
    status: getStatementStatus(a.statement, now()),
  })

  const findAccount = (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (!account) throw new MockDbError('That account no longer exists.', 404)
    return account
  }

  const listAccounts = () => accounts.map(toDto)

  return {
    listKnownProviders: () => [...knownProviders],

    listAccounts,

    addProviders(providerIds: string[]) {
      const unique = [...new Set(providerIds)]
      const unknown = unique.filter((id) => !providersById.has(id))
      if (unknown.length) throw new MockDbError(`Unknown provider: ${unknown.join(', ')}`, 400)
      const added = new Set(accounts.map((a) => a.providerId))
      const duplicates = unique.filter((id) => added.has(id))
      if (duplicates.length) {
        const names = duplicates.map((id) => providersById.get(id)!.name).join(', ')
        throw new MockDbError(`Already added: ${names}`, 409)
      }
      accounts = [...accounts, ...unique.map((providerId) => ({ id: newAccountId(), providerId, statement: null }))]
      return listAccounts()
    },

    removeAccount(accountId: string) {
      findAccount(accountId)
      accounts = accounts.filter((a) => a.id !== accountId)
      return listAccounts()
    },

    uploadStatement(accountId: string, { file, statementDate }: { file: File; statementDate: string }) {
      const account = findAccount(accountId)
      const statement: StoredStatement = { fileName: file.name, statementDate, file, version: nextVersion++ }
      accounts = accounts.map((a) => (a === account ? { ...a, statement } : a))
      return listAccounts()
    },

    getStatementFile(accountId: string) {
      const { statement } = findAccount(accountId)
      if (!statement) throw new MockDbError('No statement has been uploaded for this account.', 404)
      return { file: statement.file, fileName: statement.fileName }
    },

    submit(): SubmitResult {
      const current = listAccounts()
      if (current.length === 0) {
        return { ok: false, problems: [{ accountId: null, providerName: null, reason: 'NO_ACCOUNTS' }] }
      }
      const problems: SubmissionProblem[] = current.flatMap((a) =>
        a.status === 'UPLOADED' ? [] : [{ accountId: a.id, providerName: a.provider.name, reason: a.status }],
      )
      if (problems.length) return { ok: false, problems }
      return { ok: true, submittedAt: now().toISOString() }
    },
  }
}

export type MockDb = ReturnType<typeof createMockDb>
