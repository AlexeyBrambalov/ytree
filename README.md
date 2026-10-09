# Connect your accounts

A client adds every provider they hold money with (banks, pensions, investment platforms), uploads a recent statement for each, and submits once every statement is current.

- `frontend/`: React 18 + TypeScript (Vite, TanStack Query, Zod, Tailwind)
- `backend/`: Kotlin + Spring Boot 4 (JDK 21), with data kept in memory

Decisions, trade-offs and the API contract are in [NOTES.md](NOTES.md).

## Prerequisites

| Tool | Version | Install (Ubuntu) | Check |
|---|---|---|---|
| Java (JDK) | 21 or newer | `sudo apt install openjdk-21-jdk` | `java -version` |
| Node.js | 20 or newer | [nodejs.org](https://nodejs.org) or `nvm install 20` | `node --version` |
| pnpm | 9 or newer | `npm install -g pnpm` | `pnpm --version` |

You don't need to install Gradle: `backend/gradlew` downloads the right version on its first run.

## Run everything (one command)

```bash
./dev.sh
```

Then open **http://localhost:5173**.

- The script builds and starts the backend on `:8080`, waits until it answers, then starts the frontend against it. On the first run it also installs the frontend packages.
- The first run takes a minute or two, because it downloads Gradle and the dependencies. Later runs take a few seconds.
- **Ctrl+C** stops both.
- The app starts with four providers, one for each status: Barclays and Fidelity *uploaded*, HSBC *missing*, Vanguard *outdated*. Upload statements for HSBC and Vanguard and Submit goes through. Data resets when the backend restarts.

## Run the parts separately

```bash
# Terminal 1: backend on http://localhost:8080
cd backend
./gradlew bootRun

# Terminal 2: frontend on http://localhost:5173, using that backend
cd frontend
pnpm install          # first time only
pnpm dev:backend
```

**Frontend without a backend:** `pnpm dev` in `frontend/` runs it against a mock backend (MSW) that runs in the browser. It has the same API and the same demo data, and resets on page reload.

## Tests

```bash
cd backend && ./gradlew test                                   # 24 tests: status rule, business rules, HTTP API
cd frontend && pnpm test                                       # 91 tests: domain rules, hooks, user flows
cd frontend && pnpm typecheck && pnpm lint && pnpm build       # type check, lint, production build
```

## Try the API directly

With the backend running:

```bash
curl localhost:8080/api/accounts                    # the client's accounts, with a status for each
curl -X POST localhost:8080/api/submission          # 422: HSBC is missing, Vanguard is outdated
curl -X PUT localhost:8080/api/accounts/acc-2/statement \
     -F file=@statement.pdf -F statementDate=2026-10-01   # upload for HSBC (use a recent date)
```

## Project layout

```
dev.sh          runs backend + frontend together
NOTES.md        decisions, trade-offs, API contract, what I'd do with more time
backend/        Kotlin service: all business rules live in AccountService.kt (see backend/README.md)
frontend/       React app: rules in src/domain, logic in src/hooks, rendering in src/components (see frontend/README.md)
```

## Troubleshooting

- **`java: command not found`, or `JAVA_HOME is not set`:** install a JDK (see Prerequisites), then open a new terminal.
- **`Port 8080 is already in use`:** something else is running there, often an earlier backend. Find it with `lsof -i :8080` and stop it.
- **The page shows "Could not reach the server":** the backend isn't running. Start it, or use `./dev.sh`.
- **Port 5173 is busy:** Vite picks the next free port and prints it. Open that one instead. The backend only allows requests from `http://localhost:5173`, so free that port, or add the new address to `app.cors.allowed-origins` in `backend/src/main/resources/application.properties`.
