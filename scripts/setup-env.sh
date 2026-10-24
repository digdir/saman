#!/usr/bin/env sh
# Creates .env files from the committed .env.example templates.
#
# Existing .env files are never touched, so this is safe to re-run.
# PAYLOAD_SECRET is generated per machine: it signs session tokens and
# encrypts encrypted fields, so every environment needs its own.

set -e
cd "$(dirname "$0")/.."

for app in cms web; do
  example="src/$app/.env.example"
  target="src/$app/.env"

  [ -f "$example" ] || continue

  if [ -f "$target" ]; then
    echo "src/$app/.env already exists — left untouched"
    continue
  fi

  cp "$example" "$target"

  if grep -q "^PAYLOAD_SECRET=" "$target"; then
    secret=$(openssl rand -hex 32)
    # macOS and GNU sed disagree about -i, so write through a temp file.
    sed "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=$secret|" "$target" > "$target.tmp"
    mv "$target.tmp" "$target"
    echo "Created src/$app/.env with a freshly generated PAYLOAD_SECRET"
  else
    echo "Created src/$app/.env"
  fi
done
