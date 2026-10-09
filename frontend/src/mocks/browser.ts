import { setupWorker } from 'msw/browser'
import { createMockDb } from './db'
import { createHandlers } from './handlers'
import { seedOptions } from './seed'

export const worker = setupWorker(...createHandlers(createMockDb(seedOptions()), { latencyMs: 500 }))
