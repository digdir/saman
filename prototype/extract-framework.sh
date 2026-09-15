#!/usr/bin/env bash
#
# Extracts "Digdir leveransestyring framework.zip" into the root of the
# prototype folder, deletes the files that must not reach the remote git
# repo, removes files left over from previous exports, and finally deletes
# the zip itself.
#
# Usage:  ./extract-framework.sh [path/to/another.zip]
#
set -euo pipefail

# Root of the prototype folder = the directory this script lives in.
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

ZIP="${1:-$ROOT/Digdir leveransestyring framework.zip}"

# Record of what the last run extracted, so this run can delete whatever the
# new export no longer contains. Files not listed here are never touched.
MANIFEST="$ROOT/.extract-manifest"

# ---------------------------------------------------------------------------
# Files removed after every extraction. Globs are allowed; paths are relative
# to the prototype root. Edit this list as the export changes.
# ---------------------------------------------------------------------------
REMOVE=(
  "uploads/*.pptx"
  "uploads/*.pdf"
  "uploads/*.docx"
)
# ---------------------------------------------------------------------------

if [[ ! -f "$ZIP" ]]; then
  echo "error: zip not found: $ZIP" >&2
  echo "       (it is deleted after a successful run - drop in a new export)" >&2
  exit 1
fi

# Unpack into a staging directory first, so the prototype folder is only
# touched once we know the extraction and the exclusions both succeeded.
STAGE="$(mktemp -d)"
trap 'rm -rf -- "$STAGE"' EXIT

echo "Extracting $(basename "$ZIP")"
unzip -oq "$ZIP" -d "$STAGE"

echo "Removing excluded files:"
for pattern in "${REMOVE[@]}"; do
  shopt -s nullglob
  matches=( "$STAGE"/$pattern )
  shopt -u nullglob

  if (( ${#matches[@]} == 0 )); then
    echo "  - $pattern (no match)"
    continue
  fi
  for path in "${matches[@]}"; do
    rm -rf -- "$path"
    echo "  x ${path#"$STAGE"/}"
  done
done

# The set of files this run is about to install, as paths relative to ROOT.
NEW_LIST="$STAGE.new"
( cd "$STAGE" && find . -type f | sed 's|^\./||' | LC_ALL=C sort ) > "$NEW_LIST"
trap 'rm -rf -- "$STAGE" "$NEW_LIST"' EXIT

# Delete files a previous run extracted that this export no longer contains.
stale=0
if [[ -f "$MANIFEST" ]]; then
  echo "Removing files dropped from this export:"
  while IFS= read -r rel; do
    [[ -n "$rel" ]] || continue
    grep -Fxq -- "$rel" "$NEW_LIST" && continue   # still present, keep it
    [[ -e "$ROOT/$rel" ]] || continue             # already gone
    rm -f -- "$ROOT/$rel"
    echo "  x $rel"
    stale=$(( stale + 1 ))
    # Clean up directories this leaves empty, innermost first.
    dir="$(dirname -- "$rel")"
    while [[ "$dir" != "." && "$dir" != "/" ]]; do
      rmdir -- "$ROOT/$dir" 2>/dev/null || break
      dir="$(dirname -- "$dir")"
    done
  done < "$MANIFEST"
  (( stale == 0 )) && echo "  - none"
fi

# Install the new files.
cp -R "$STAGE"/. "$ROOT"/
cp "$NEW_LIST" "$MANIFEST"

rm -f -- "$ZIP"

echo "Done. $(wc -l < "$NEW_LIST" | tr -d ' ') file(s) extracted, $stale stale file(s) removed, zip deleted."
