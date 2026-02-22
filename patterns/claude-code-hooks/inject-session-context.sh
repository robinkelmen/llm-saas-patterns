#!/bin/bash
# Source: Robin Kelmen — https://llmtuts.kelmen.space/llm/airbag-pattern/
# Repo:   https://github.com/robinkelmen/llm-saas-patterns
#
# Hook: Inject session context at Claude Code session start
# Event: SessionStart
#
# Prints project state so every session starts with full context:
# - Recent commits
# - Git status
# - Active TODOs (from TO-DOS.md if present)

cd "$CLAUDE_PROJECT_DIR" || exit 0

echo ""
echo "📍 Session Context ($(date '+%Y-%m-%d %H:%M'))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Recent commits:"
git log --oneline -5 2>/dev/null || echo "  (no git history)"

echo ""
echo "Git status:"
git status --short 2>/dev/null || echo "  (clean)"

# Print active TODOs if TO-DOS.md exists
if [ -f "$CLAUDE_PROJECT_DIR/TO-DOS.md" ]; then
  echo ""
  echo "Active TODOs:"
  grep -E "^\s*-\s*\[[ ]\]" "$CLAUDE_PROJECT_DIR/TO-DOS.md" | head -10 | sed 's/^/  /'
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
