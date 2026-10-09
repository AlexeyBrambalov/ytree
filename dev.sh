#!/usr/bin/env bash
# Runs the whole app: the Kotlin backend on :8080 and the frontend on :5173, talking to each other.
# Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")"

command -v java >/dev/null || { echo "Java 21+ is needed: sudo apt install openjdk-21-jdk"; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm is needed: npm install -g pnpm"; exit 1; }
if curl -s -o /dev/null localhost:8080; then echo "Port 8080 is already in use. Stop whatever runs there first."; exit 1; fi

echo "Building the backend..."
(cd backend && ./gradlew --quiet bootJar)
[ -d frontend/node_modules ] || (cd frontend && pnpm install)

echo "Starting the backend..."
java -jar backend/build/libs/backend.jar > >(while IFS= read -r line; do echo "[backend] $line"; done) 2>&1 &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf -o /dev/null localhost:8080/api/providers && break
  kill -0 $BACKEND_PID 2>/dev/null || { echo "The backend failed to start (see the log above)."; exit 1; }
  sleep 1
done
curl -sf -o /dev/null localhost:8080/api/providers || { echo "The backend did not start within 60 seconds."; exit 1; }

echo "Backend is up. Starting the frontend: open http://localhost:5173"
(cd frontend && pnpm dev:backend)
