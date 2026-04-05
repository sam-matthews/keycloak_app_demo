#!/usr/bin/env bash
set -euo pipefail

# Run Trivy vulnerability scans against lockfiles using the same containerized scanner as CI.
docker run --rm -v "$PWD":/work -w /work aquasec/trivy:0.62.0 \
  fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --format table /work/backend/package-lock.json

docker run --rm -v "$PWD":/work -w /work aquasec/trivy:0.62.0 \
  fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --format table /work/frontend/package-lock.json

echo "Trivy vulnerability scan completed for backend and frontend lockfiles."
