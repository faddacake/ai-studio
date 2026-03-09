#!/usr/bin/env bash
set -euo pipefail

SESSION_FILE="docs/SESSION_CONTEXT.md"
TITLE="${1:-Session Update}"
NEXT_TASK="${2:-No next task provided.}"
TMP_SUMMARY_FILE="$(mktemp)"

mkdir -p docs
touch "$SESSION_FILE"

echo "Enter session summary. Press Ctrl+D when finished:"
cat > "$TMP_SUMMARY_FILE"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

{
  echo
  echo "---"
  echo
  echo "## ${TITLE}"
  echo "**Updated:** ${TIMESTAMP}"
  echo
  echo "### Summary"
  cat "$TMP_SUMMARY_FILE"
  echo
  echo "### Next Recommended Task"
  echo "$NEXT_TASK"
} >> "$SESSION_FILE"

rm -f "$TMP_SUMMARY_FILE"

echo "Updated $SESSION_FILE"
