# Connect your accounts — notes

## Status
- **Frontend:** done (`frontend/`). React 18 + TypeScript, TanStack Query, Zod, Tailwind v4, Vitest + Testing Library, MSW.
- **Backend:** Kotlin/Spring Boot — to do. Until it exists, MSW plays the backend (`frontend/src/mocks`), implementing the contract below.

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
- **Theme:** YTREE brand from their careers site — navy `#1C1E3C`, cyan `#36C6D9`, Rubik/Inter, pill buttons.

## Testing (TDD)
Tests were written before each implementation step. There are 91 tests in total:
- `domain/*.test.ts`: the 3-month boundary (including month-end clamping), readiness, filters, search, and problem clearing.
- `mocks/db.test.ts`: the backend invariants (no duplicates; incomplete, outdated or empty submissions are refused).
- `helpers/*.test.ts`: date formatting, pluralisation and problem wording.
- `hooks/*.test.tsx`: every hook, including the per-component ones (`useAccountsScreen`, `useAccountRow`, `useAddProvidersDialog`, `useUploadStatementDialog`, `useModal`, `useToastQueue`), run against MSW. Covers optimistic remove with rollback (including concurrent removes), multi-add, the submit 422 path, and form validation.
- `components/AccountsScreen.test.tsx`: user-level flows. Covers loading and error/retry, filtering, multi-add, remove, upload to submit, and a submission rejected because the screen was stale.

## With more time
- The Kotlin service, implementing the contract above, with tests on the status rule and the submit invariant.
- A Playwright e2e test of the submit flow against the real backend.
- Reading the statement date from the document, and a virus scan on upload.
- A focus trap in the modal (or Radix Dialog), and an undo toast for remove instead of the confirm step.
- Persisting the submitted state on the server (`GET /api/submission`) so a reload shows it.
