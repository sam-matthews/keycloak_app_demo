#!/usr/bin/env bash
set -euo pipefail

# Keep lockfiles aligned with package.json using the same npm major used in CI.
docker run --rm -v "$PWD":/work -w /work node:20 bash -lc "
  npm install --prefix backend --ignore-scripts &&
  npm install --prefix frontend --ignore-scripts &&
  npm ci --prefix backend --ignore-scripts &&
  npm ci --prefix frontend --ignore-scripts
"

echo "Lockfile sync and CI-style npm ci verification completed successfully."
