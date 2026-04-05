#!/usr/bin/env bash
set -euo pipefail

POLICY_FILE=".github/security/image-policy.json"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "Image policy file not found: $POLICY_FILE"
  exit 1
fi

IMAGES=()
while IFS= read -r image; do
  [[ -n "$image" ]] && IMAGES+=("$image")
done < <(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));(p.images||[]).forEach(i=>console.log(i));" "$POLICY_FILE")

if [[ "${#IMAGES[@]}" -eq 0 ]]; then
  echo "No images configured for scanning in $POLICY_FILE"
  exit 0
fi

FAILED=0

for image in "${IMAGES[@]}"; do
  echo "Scanning image: $image"
  if ! docker run --rm aquasec/trivy:0.62.0 image \
    --scanners vuln \
    --severity HIGH,CRITICAL \
    --ignore-unfixed \
    --timeout 20m \
    --no-progress \
    --exit-code 1 \
    --format table \
    "$image"; then
    FAILED=1
  fi
done

if [[ "$FAILED" -ne 0 ]]; then
  echo "Container image vulnerability scan found HIGH/CRITICAL issues."
  exit 1
fi

echo "Container image vulnerability scan completed with no HIGH/CRITICAL issues."
