#!/bin/bash
# Source: Robin Kelmen — https://llmtuts.kelmen.space/llm/airbag-pattern/
# Repo:   https://github.com/robinkelmen/llm-saas-patterns
#
# Hook: Validate TypeScript after file edits
# Event: PostToolUse (Write | Edit)
#
# Runs type-check in the background after any .ts/.tsx/.js/.jsx edit.
# Non-blocking — won't interrupt Claude's workflow.

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only trigger for TypeScript/JavaScript files
if [[ "$FILE" =~ \.(ts|tsx|js|jsx)$ ]]; then
  echo "🔍 TypeScript file modified: $(basename "$FILE")"
  echo "⏳ Running type-check in background..."

  # Run non-blocking
  (
    cd "$CLAUDE_PROJECT_DIR" || exit
    if npm run type-check > /tmp/typecheck-output.txt 2>&1; then
      echo "✅ Type check passed"
    else
      echo "⚠️  Type check found issues:"
      cat /tmp/typecheck-output.txt | head -30
    fi
  ) &

  echo "✅ Type check started (non-blocking)"
fi

exit 0
