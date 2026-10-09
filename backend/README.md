# Backend

The service behind "Connect your accounts". It is built with Kotlin 2.3, Spring Boot 4 and JDK 21. Data is kept in memory and seeded on startup, with no database.

```bash
sudo apt install openjdk-21-jdk   # once; any JDK 21+ works
./gradlew bootRun                 # http://localhost:8080 (the first run downloads Gradle and the dependencies)
./gradlew test                    # 24 tests
```

Then, in `../frontend`, run `pnpm dev:backend` to use this service instead of the MSW mock. Or run `../dev.sh` to start both with one command. The API contract is in [`../NOTES.md`](../NOTES.md).

```bash
curl localhost:8080/api/accounts
curl -X POST localhost:8080/api/submission                     # 422: HSBC missing, Vanguard outdated
curl -X PUT localhost:8080/api/accounts/acc-2/statement -F file=@some.pdf -F statementDate=2026-10-01
```

## Files

Everything is in one package, `src/main/kotlin/com/ytree/accounts/`:

| File | What it does |
|---|---|
| `Model.kt` | The data (`Provider`, `Account`, `Statement`) and **the status rule** `statementStatus()`, a pure function. |
| `AccountService.kt` | **All the business rules.** It holds the accounts in memory: add (no duplicates), remove, upload (file type, size, date), and submit (refuses anything incomplete). |
| `ApiController.kt` | The HTTP endpoints and the JSON shapes. It only translates: it parses the request, calls the service, and maps the result to JSON. |
| `ApiErrorHandler.kt` | Turns exceptions into `{ message }` JSON with the right status: 400, 404, 409, or 422 with `problems`. |
| `ApiException.kt` | The exceptions the service throws. Each carries an HTTP status. |
| `KnownProviders.kt` | The catalogue of 19 providers. |
| `DemoData.kt` | Seeds four accounts on startup, one for each status, with a generated placeholder PDF. |
| `WebConfig.kt` | CORS, so the Vite dev server on :5173 may call the API. |
| `BackendApplication.kt` | The entry point. It also provides the `Clock`, so tests can fix "today". |

## How a request flows

`POST /api/accounts {"providerIds":["hsbc"]}`:

1. Spring routes it to `ApiController.addProviders`, and Jackson turns the JSON into `AddProvidersRequest`.
2. The controller calls `AccountService.addProviders`. HSBC is already added, so the service throws `ApiException(CONFLICT, "Already added: HSBC")`.
3. `ApiErrorHandler` catches it and replies `409 {"message":"Already added: HSBC"}`. The frontend shows that message.

On success, every change returns the whole account list with a freshly computed `status`, so the client never works out a status itself.

## Tests (`src/test/kotlin/...`)

- `StatementStatusTest`: the 3-month rule. Exactly 3 months still counts, one day more doesn't, and a 31st clamps to a shorter month.
- `AccountServiceTest`: the invariants, with a fixed clock. No duplicates (and nothing added from a batch that has one), submission refused with every problem listed, refused with no accounts, accepted when all are current, and upload validation.
- `ApiTest`: the HTTP contract the frontend parses: status codes, JSON shapes (`statement: null` is present, not left out), multipart upload and download, and the 422 → fix → 200 submit flow. It runs the whole app with MockMvc and a fresh app for each test.

## Kotlin in 30 seconds (for reading this code)

- `val` is read-only and `var` can change. `String?` may be null, `String` never is.
- `a?.b` is "b, if a isn't null", and `x ?: y` is "x, or y if x is null". `?: throw ...` is the usual "or fail".
- `data class` gives `equals`, `toString` and `copy(...)` for free. `account.copy(statement = s)` is a changed copy.
- `when { cond -> value ... }` is an `if/else if` chain that returns a value.
- The constructor parameters of a `@Service` or `@RestController` are injected by Spring (`AccountService(private val clock: Clock)`).
- `@Synchronized` lets one thread at a time into the method. That is enough for in-memory state.
