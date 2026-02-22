# Claude Code Hooks — The Airbag Pattern

Event-driven automation that runs silently in the background as you build. The "airbag" metaphor: you don't notice it until it saves you.

## What This Does

```
You (or Claude) runs: supabase db push
                            ↓
        PostToolUse hook triggers automatically
                            ↓
        CRUD tests run against real auth users
                            ↓
        RLS policies verified for cross-user isolation
                            ↓
        Test data cleaned up
```

No extra commands. No manual test runs. It just happens.

## Hooks in This Pattern

### `hooks.json` — Hook configuration

Five hook types in use:

| Hook | When | Purpose |
|------|------|---------|
| `PreToolUse: Bash` | Before any Bash command | Block unsafe git patterns |
| `PreToolUse: Write\|Edit` | Before file writes | Security checks |
| `PostToolUse: Write\|Edit` | After TypeScript files edited | Run type-check |
| `PostToolUse: Bash` | After `supabase db push` | Run CRUD tests |
| `SessionStart` | Session opens | Inject project context |

### `validate-after-edit.sh`

Runs `npm run type-check` (non-blocking) after any `.ts` or `.tsx` file is modified. Catches type errors before you notice them.

### `validate-git-commit.sh`

Blocks commits that:
- Force push to main/master
- Violate your project's commit conventions

### `inject-session-context.sh`

At session start, prints:
- Current phase from your roadmap
- Last 3 commits
- Current git status
- Active TODOs

LLM sees this context before the first message.

## Setup

### 1. Copy hooks.json

Place `.claude/hooks.json` in your project root. The file is read by Claude Code automatically.

### 2. Copy hook scripts

Place scripts in `.claude/hooks/`. Make them executable:

```bash
chmod +x .claude/hooks/*.sh
```

### 3. Adapt to your project

In `hooks.json`, update paths from `$CLAUDE_PROJECT_DIR/.claude/hooks/` to match your structure. Update the migration command matcher if you use a different tool than Supabase.

### 4. Test

```bash
claude --debug  # Shows hook matching and execution
```

## Writing Your Own Hook Script

```bash
#!/bin/bash
# Hook: Description of what this does

# Read the JSON input from stdin
INPUT=$(cat)

# Extract relevant fields
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Your logic here

# For PreToolUse hooks — must return a decision
echo '{
  "decision": "approve",
  "reason": "All checks passed"
}'

# For PostToolUse hooks — just exit
exit 0
```

## Files

- `hooks.json` — Hook configuration (copy to `.claude/hooks.json` in your project)
- `validate-after-edit.sh` — Type-check on file edit
- `validate-git-commit.sh` — Git commit safety checks
- `inject-session-context.sh` — Session context injection

Full documentation: [The Airbag Pattern →](https://llmtuts.kelmen.space/llm/airbag-pattern/)
