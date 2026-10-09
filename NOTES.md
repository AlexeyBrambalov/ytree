# Connect your accounts — notes

## Status
- **Frontend:** done (`frontend/`). React 18 + TypeScript, TanStack Query, Zod, Tailwind v4, Vitest + Testing Library, MSW.
- **Backend:** done (`backend/`). Kotlin 2.3, Spring Boot 4, JDK 21, in-memory, JUnit 5 + MockMvc.
- MSW (`frontend/src/mocks`) implements the same contract, so the frontend runs on its own as well.

## Running
`./dev.sh` runs both. Prerequisites, separate runs and tests are in [README.md](README.md).

## API contract
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/providers` | – | `Provider[]` (known providers) |
| GET | `/api/accounts` | – | `Account[]` |
| POST | `/api/accounts` | `{ providerIds: string[] }` | `Account[]` · 409 if any already added |
| DELETE | `/api/accounts/{id}` | – | `Account[]` · 404 if unknown |
| PUT | `/api/accounts/{id}/statement` | multipart: `file` (PDF/PNG/JPEG, ≤ 10 MB), `statementDate: "YYYY-MM-DD"` | `Account[]` · 400 if invalid |
| GET | `Statement.fileUrl` (e.g. `/api/accounts/{id}/statement/file?v=…`) | – | the file, inline, with its content type · 404 if none |
| POST | `/api/submission` | – | `{ submittedAt }` · **422** `{ message, problems: [{ accountId, providerName, reason: MISSING \| OUTDATED \| NO_ACCOUNTS }] }` |

`Account = { id, provider: { id, name, category }, statement: { fileName, statementDate, fileUrl } | null, status: MISSING | UPLOADED | OUTDATED }`

`fileUrl` comes from the server, so it can change with each upload (no stale cache) or later point at signed storage URLs.

## Key decisions
- **The server owns status and the submit rule.** It computes `status` from `statementDate` (older than 3 calendar months = `OUTDATED`; exactly 3 months still counts) and re-checks everything on submit, so an incomplete set is never accepted even if the UI is bypassed or stale. The UI mirrors the rule only to guide the client (the disabled submit button with a reason, and an "this will be outdated" warning in the upload form).
- **Mutations return the full account list.** That avoids an extra round-trip and means the client never guesses status. Remove is optimistic with rollback, because it is the one action where waiting feels slow.
- **Components only render.** Rules are pure functions in `src/domain`. Each component's state, derived labels and view state (`'loading' | 'error' | 'empty' | 'list'`) live in its own hook in `src/hooks`. Shared labels, formatters and class maps are in `src/helpers`. JSX branches with `if` and early-return sub-components, not nested ternaries.
- **Zod at the boundary.** Every response is parsed, so a malformed backend response becomes a clear error, not a crash deep in the UI. The same schemas validate request bodies in the mock backend and the upload form.
- **Rejected-submission problems clear as the client fixes them.** They are derived from current account state rather than kept as a stale snapshot.
- **The provider search runs on the client.** The catalogue is small and fetched once (`staleTime: Infinity`), so the search feels instant. Already-added providers are excluded both in the picker and by the server (409).
- **An upload asks for a statement date.** The brief treats an upload as "a file name and a date". Asking for the date (default today, no future dates) is what makes `OUTDATED` meaningful.
- **Uploaded statements open in a new tab.** The file name links to the file. A click fetches it through the API client (the same auth and error handling as every other call, and a plain link would skip the mock backend) and shows it from memory. The tab is opened during the click so pop-up blockers allow it.
- **Backend kept small: one package, one service.** `AccountService` holds every rule and the in-memory state. `ApiController` only translates HTTP. Errors are exceptions carrying an HTTP status, mapped to `{ message }` in one place (`ApiErrorHandler`). A layered setup (repository interfaces, JPA, DTO mappers) would be ceremony for one client with no database. The service is the seam where a repository would go.
- **In-memory, with `@Synchronized` methods.** The brief has one client and no persistence, so there is no database. Synchronising the service means two concurrent adds can't both slip past the duplicate check. State resets on restart, and the demo data is re-seeded relative to today.
- **"Today" is UTC, from an injected `Clock`.** Tests pin the date. The server accepts a statement dated up to one day ahead, because the client's "today" is their local day, which can be ahead of UTC.
- **The server serves files with a content type it chose.** The type comes from the allowed extension, never from the client's header, with `Cache-Control: no-store`. The `?v=` in `fileUrl` changes with each upload.
- **Theme:** YTREE brand from their careers site — navy `#1C1E3C`, cyan `#36C6D9`, Rubik/Inter, pill buttons.

## Testing
Frontend (TDD; tests were written before each implementation step), 91 tests:
- `domain/*.test.ts`: the 3-month boundary (including month-end clamping), readiness, filters, search, and problem clearing.
- `mocks/db.test.ts`: the backend invariants (no duplicates; incomplete, outdated or empty submissions are refused).
- `helpers/*.test.ts`: date formatting, pluralisation and problem wording.
- `hooks/*.test.tsx`: every hook, including the per-component ones (`useAccountsScreen`, `useAccountRow`, `useAddProvidersDialog`, `useUploadStatementDialog`, `useModal`, `useToastQueue`), run against MSW. Covers optimistic remove with rollback (including concurrent removes), multi-add, the submit 422 path, and form validation.
- `components/AccountsScreen.test.tsx`: user-level flows. Covers loading and error/retry, filtering, multi-add, remove, upload to submit, and a submission rejected because the screen was stale.

Backend (`./gradlew test`), 25 tests:
- `StatementStatusTest`: the 3-month boundary and month-end clamping. These are the same cases as the frontend's mirror of the rule.
- `AccountServiceTest`: the invariants. No duplicates (a batch with one adds nothing), submission refused with every problem listed or with no accounts, accepted once all are current, and upload validation.
- `ApiTest`: the HTTP contract, run against the whole app. It checks the JSON shapes the Zod schemas expect, the 400/404/409/422 bodies, multipart upload and download, and the reject → fix → accept submit flow.

End-to-end (`pnpm e2e` in `frontend/`), 25 Playwright tests. Each one drives the real frontend against the real backend:
- Every interaction in the brief: see statuses and progress, filter (including the "nothing matches" state), add several providers through search (already-added ones are never offered), remove (and cancel), upload, replace, and open a statement.
- Every rule: the submit button stays blocked until all statements are current; an old date is warned about and stays `OUTDATED`; client-side file and date validation works.
- The cases that need the real server: a provider added from elsewhere is refused (409, shown in the dialog). A submission that went stale behind the screen is refused, explained, then accepted once fixed. The API refuses incomplete or empty submissions and bad uploads when called directly, which is the "even if the client finds a way around the screen" rule.
- Each test resets the backend through `POST /api/e2e/reset`, which exists only with the `e2e` profile. Tests run one at a time, because there is one shared in-memory client.
- Elements are found only by `data-qa` tags. The tags are constants in `src/helpers/qa.ts`, used by both the components (`data-qa={QA.submitButton}`) and the tests (`getByTestId(QA.submitButton)`, with Playwright's `testIdAttribute` set to `data-qa`). Changing copy or markup doesn't break a locator, and a renamed tag is a type error, not a silently broken test. The tests still assert the visible text where the text is the behaviour. A page object (`e2e/support.ts`) keeps the specs readable.
- To check that the tests can fail, I removed the server's submit check: the stale-screen and API submit tests failed.

## With more time
- Run the e2e tests in CI (GitHub Actions), and in Firefox and WebKit too.
- A database (Postgres + Flyway) behind a repository, and statement files in object storage with signed `fileUrl`s.
- A content check on uploads (magic bytes, not just the extension).
- Reading the statement date from the document, and a virus scan on upload.
- A focus trap in the modal (or Radix Dialog), and an undo toast for remove instead of the confirm step.
- Persisting the submitted state on the server (`GET /api/submission`) so a reload shows it.
