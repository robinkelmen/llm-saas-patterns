# Templates

Copy these files into your project.

## CLAUDE.md

Your project constitution. Claude Code reads this at the start of every session.

- Defines stack, architecture patterns, and rules
- Prevents the LLM from drifting into wrong patterns
- Documents what's out-of-bounds (force push, skipping RLS, manual CRUD)
- Links to resources the LLM should know about

**How to use:**
1. Copy to the root of your project as `CLAUDE.md`
2. Replace the stack section with your actual stack
3. Add your project-specific rules
4. Add useful URLs (your docs, component library, design system)

Documented in: [The Project Constitution →](https://llmtuts.kelmen.space/llm/claude-md/)
