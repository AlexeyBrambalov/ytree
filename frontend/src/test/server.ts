import { setupServer } from 'msw/node'
import { createMockDb, type MockDbOptions } from '../mocks/db'
import { createHandlers } from '../mocks/handlers'
import { seedOptions } from '../mocks/seed'

export const TEST_TODAY = new Date('2026-10-08T12:00:00Z')

export const server = setupServer()

/** Fresh backend per test. Returns the db so tests can inspect or arrange state. */
export function resetMockBackend(overrides: Partial<MockDbOptions> = {}) {
  const db = createMockDb({ ...seedOptions(() => TEST_TODAY), ...overrides })
  server.resetHandlers(...createHandlers(db))
  return db
}
