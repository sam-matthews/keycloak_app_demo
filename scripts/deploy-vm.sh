#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-$PWD}"
cd "$APP_DIR"

echo "[deploy] working directory: $APP_DIR"

if [[ ! -f .env ]]; then
  if [[ -f .env.prod ]]; then
    echo "[deploy] .env not found, bootstrapping from .env.prod"
    cp .env.prod .env
  else
    echo "[deploy] ERROR: .env not found and .env.prod unavailable"
    exit 1
  fi
fi

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "[deploy] ERROR: docker compose is not installed"
  exit 1
fi

echo "[deploy] using compose command: $DC"

# Pull first for pre-built images; ignore failures because some services are build-only.
$DC pull --ignore-pull-failures || true
$DC up -d --build

# Apply idempotent Keycloak realm/client configuration after services are up.
$DC run --rm keycloak-setup

echo "[deploy] service status"
$DC ps

echo "[deploy] done"
