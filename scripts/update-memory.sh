#!/bin/bash
# update-memory.sh — Detect changed files via git diff and print a summary
# for incremental project-memory.md updates.
# Usage: bash scripts/update-memory.sh [base-ref]
#   base-ref defaults to HEAD~1

set -euo pipefail

BASE_REF="${1:-HEAD~1}"
MEMORY_FILE="docs/project-memory.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")

echo "=== Project Memory Update ==="
echo "Comparing against: $BASE_REF"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if memory file exists
if [ ! -f "$MEMORY_FILE" ]; then
    echo "WARNING: $MEMORY_FILE does not exist. Run a full audit."
    exit 1
fi

# Get changed files (excluding node_modules, .git, etc.)
CHANGED=$(git diff --name-only "$BASE_REF" -- \
    ':!node_modules' ':!.git' ':!*.lock' ':!package-lock.json' 2>/dev/null || true)

if [ -z "$CHANGED" ]; then
    echo "No changes detected since $BASE_REF."
    exit 0
fi

# Categorize changes
echo "--- Changed Files ---"
echo "$CHANGED"
echo ""

CREATED=$(git diff --diff-filter=A --name-only "$BASE_REF" -- \
    ':!node_modules' ':!.git' ':!*.lock' ':!package-lock.json' 2>/dev/null || true)
MODIFIED=$(git diff --diff-filter=M --name-only "$BASE_REF" -- \
    ':!node_modules' ':!.git' ':!*.lock' ':!package-lock.json' 2>/dev/null || true)
DELETED=$(git diff --diff-filter=D --name-only "$BASE_REF" -- \
    ':!node_modules' ':!.git' ':!*.lock' ':!package-lock.json' 2>/dev/null || true)

if [ -n "$CREATED" ]; then
    echo "--- Created ---"
    echo "$CREATED"
    echo ""
fi

if [ -n "$MODIFIED" ]; then
    echo "--- Modified ---"
    echo "$MODIFIED"
    echo ""
fi

if [ -n "$DELETED" ]; then
    echo "--- Deleted ---"
    echo "$DELETED"
    echo ""
fi

# Count affected sections
BACKEND_CHANGES=$(echo "$CHANGED" | grep -c "^backend/" || true)
FRONTEND_CHANGES=$(echo "$CHANGED" | grep -c "^frontend/" || true)
DOC_CHANGES=$(echo "$CHANGED" | grep -c -E "\.(md|docx|xlsx)$" || true)

echo "--- Impact Summary ---"
echo "Backend files changed:  $BACKEND_CHANGES"
echo "Frontend files changed: $FRONTEND_CHANGES"
echo "Documentation changed:  $DOC_CHANGES"
echo ""

TOTAL=$(echo "$CHANGED" | wc -l)
echo "Total files changed: $TOTAL"

# Warn if large change set
if [ "$TOTAL" -gt 20 ]; then
    echo ""
    echo "WARNING: >20 files changed. Consider a full audit of project-memory.md."
fi

echo ""
echo "=== Update $MEMORY_FILE with the above changes ==="
