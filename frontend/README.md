# Frontend

"Connect your accounts": the client adds every provider they hold money with, uploads a statement from the last 3 months for each, and submits once all are current.

React 18 + TypeScript, TanStack Query, Zod, Tailwind v4, Vitest + Testing Library, MSW.

```bash
pnpm install
pnpm dev         # http://localhost:5173, MSW plays the backend
pnpm test        # Vitest (unit + hook + component)
pnpm typecheck && pnpm lint && pnpm build
```

## Backend

Until the Kotlin service exists, MSW intercepts `/api/*` in the browser and serves an in-memory backend (`src/mocks`):

- Starts with four providers already added (out of a catalogue of 19), covering every status. Each seeded statement has a generated placeholder PDF, so it can be opened.
- Uploaded files are kept in memory, and everything resets on page reload.
- Every request takes about 500 ms, so loading states are visible.

Set `VITE_API_BASE_URL=http://localhost:8080` to use a real backend instead. The API contract is in [`../NOTES.md`](../NOTES.md).

## Structure

```
src/
  domain/      pure business rules (statement status, readiness, filters, search, accepted files)  ← most tests
  api/         zod schemas, typed fetch client (JSON + multipart upload + file download), query keys
  helpers/     shared labels, formatters, Tailwind class maps, assertNever
  hooks/       all component logic, one hook per file (useAccountsScreen, useAccountRow, useOpenStatement, …)
  components/  render only; ui/ = Button, Modal, Spinner, InfoTip
  mocks/       MSW handlers + in-memory backend + seed + placeholder PDF
  test/        setup, MSW server, render helpers
```

## Conventions

- **The server owns status.** The client mirrors the rules in `domain/` only to guide the user (the disabled submit button with its reason, the "will be outdated" warning). Mutations return the full account list.
- **Zod at the boundary.** Every response is parsed. The same schemas validate request bodies in the mock backend and in the upload form.
- **View states are unions.** Each hook derives `'loading' | 'error' | 'empty' | …` with an `if` chain in priority order. The component renders it with a `switch` ending in `assertNever`, so adding a state fails the build until it is handled.
- **Statements open through the API.** A click on a file name fetches the file with the API client and shows it in a new tab (`useOpenStatement`). A plain link would bypass auth and MSW.

## Testing

Tests run against the same MSW handlers as the browser, with a fresh backend for each test (`test/server.ts`). jsdom's `Blob` can't be read by Node's `fetch`, so `test/setup.ts` adds `stream()`, `arrayBuffer()` and `text()` for it. Without that, uploaded files would reach the mock server empty.
