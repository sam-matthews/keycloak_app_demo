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

COMPOSE_FILES=("-f" "docker-compose.yml")
if [[ -f docker-compose.prod.yml ]]; then
  COMPOSE_FILES+=("-f" "docker-compose.prod.yml")
  echo "[deploy] using compose files: docker-compose.yml + docker-compose.prod.yml"
fi

# Pull first for pre-built images; ignore failures because some services are build-only.
"$DC" "${COMPOSE_FILES[@]}" pull --ignore-pull-failures || true
"$DC" "${COMPOSE_FILES[@]}" up -d --build

# Apply idempotent Keycloak realm/client configuration after services are up.
"$DC" "${COMPOSE_FILES[@]}" run --rm keycloak-setup

echo "[deploy] service status"
"$DC" "${COMPOSE_FILES[@]}" ps

echo "[deploy] done"
