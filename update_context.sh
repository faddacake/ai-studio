#!/bin/bash

# Simple Context Updater for AI Studio
# Usage: ./update_context.sh

PROJECT_FILE="PROJECT_CONTEXT.md"
SESSION_FILE="SESSION_CONTEXT.md"

TODAY=$(date +"%Y-%m-%d")
SESSION_ID=$(date +"%H%M%S")

echo "----------------------------------"
echo " AI Studio Context Updater"
echo "----------------------------------"
echo "Date: $TODAY"
echo "Session: $SESSION_ID"
echo ""

# Ensure files exist
touch "$PROJECT_FILE"
touch "$SESSION_FILE"

# Update date in SESSION_CONTEXT.md
sed -i.bak "s/^Date:.*/Date: $TODAY/" "$SESSION_FILE"
sed -i.bak "s/^Session ID:.*/Session ID: $SESSION_ID/" "$SESSION_FILE"

echo "Updated SESSION_CONTEXT.md metadata."

# Open file in editor
if command -v code >/dev/null 2>&1; then
  code "$SESSION_FILE"
elif command -v nano >/dev/null 2>&1; then
  nano "$SESSION_FILE"
else
  echo "No editor found. Please open SESSION_CONTEXT.md manually."
fi

echo ""
echo "👉 Update your focus, files, and next actions."
echo "👉 Save and close when done."
echo ""
echo "Context update complete."
