# CloudBlocks — Claude Code Instructions

## Project Overview
Visual cloud architecture builder — design infrastructure visually, compile to Terraform, Bicep & Pulumi.

## Development Commands
```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server
pnpm build            # Production build
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
pnpm test             # All tests
```

## Agent Rules

### NEVER create GitHub issues automatically
- Do NOT run `gh issue create` unless the user explicitly asks to create a specific issue
- When fixing bugs, ONLY fix the code — do not file new issues for problems discovered along the way
- If you find additional problems while working, note them in your response text instead of creating issues
- This applies to all agents and sub-agents

### NEVER register bugs found during code review
- Code review findings should be reported as comments, not as new GitHub issues
- Fixing one bug should not spawn 10 new issue tickets
- The user decides what becomes an issue, not the agent

## Code Conventions
- React SPA (no router) with Zustand state management
- `import { create } from 'zustand'` for stores
- `import { toast } from 'react-hot-toast'` for notifications
- `import { confirmDialog } from '../../shared/ui/ConfirmDialog'` for confirmations
- No Material UI — plain CSS only
- Lazy-loaded widgets via `React.lazy()`
- Dark panel theme: `background: rgba(20, 20, 40, 0.95); border: 1px solid #333366;`
- LEGO brick themed UI

## Testing
- Vitest + @testing-library/react for frontend
- pytest for backend
- Branch coverage threshold: 90%

## Git Workflow
- Always pull main before creating branches
- Assign issues to self when picking them up
- Request Copilot review on every PR
