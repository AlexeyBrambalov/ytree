import { delay, http, HttpResponse } from 'msw'
import { AddProvidersRequestSchema, UploadStatementRequestSchema } from '../api/schemas'
import { MockDbError, type MockDb } from './db'

/** Maps the in-memory db onto the HTTP contract the Kotlin service will implement. */
export function createHandlers(db: MockDb, { latencyMs = 0 } = {}) {
  const simulateLatency = async () => {
    if (latencyMs) await delay(latencyMs)
  }
  /** Runs a db call and maps its domain errors to HTTP. */
  const respond = async (fn: () => Response) => {
    await simulateLatency()
    try {
      return fn()
    } catch (e) {
      if (e instanceof MockDbError) return HttpResponse.json({ message: e.message }, { status: e.status })
      throw e
    }
  }
  const run = (fn: () => unknown, status = 200) => respond(() => HttpResponse.json(fn() as object, { status }))
  const badRequest = (message: string) => HttpResponse.json({ message }, { status: 400 })

  return [
    http.get('/api/providers', () => run(() => db.listKnownProviders())),

    http.get('/api/accounts', () => run(() => db.listAccounts())),

    http.post('/api/accounts', async ({ request }) => {
      const body = AddProvidersRequestSchema.safeParse(await request.json().catch(() => null))
      if (!body.success) return badRequest(body.error.issues[0].message)
      return run(() => db.addProviders(body.data.providerIds), 201)
    }),

    http.delete('/api/accounts/:id', ({ params }) => run(() => db.removeAccount(String(params.id)))),

    http.put('/api/accounts/:id/statement', async ({ params, request }) => {
      const form = await request.formData().catch(() => null)
      const body = UploadStatementRequestSchema.safeParse({ file: form?.get('file'), statementDate: form?.get('statementDate') })
      if (!body.success) return badRequest(body.error.issues[0].message)
      return run(() => db.uploadStatement(String(params.id), body.data))
    }),

    http.get('/api/accounts/:id/statement/file', ({ params }) =>
      respond(() => {
        const { file, fileName } = db.getStatementFile(String(params.id))
        return new HttpResponse(file, {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            'Cache-Control': 'no-store',
          },
        })
      }),
    ),

    http.post('/api/submission', async () => {
      await simulateLatency()
      const result = db.submit()
      if (result.ok) return HttpResponse.json({ submittedAt: result.submittedAt })
      return HttpResponse.json(
        { message: 'Some providers still need a current statement.', problems: result.problems },
        { status: 422 },
      )
    }),
  ]
}
