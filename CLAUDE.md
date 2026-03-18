# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint via Next.js
npm run test         # Run tests with Vitest
npm run test -- --reporter=verbose  # Single test file: npm run test -- src/lib/__tests__/foo.test.ts
npm run setup        # Install deps + Prisma generate + migrate
npm run db:reset     # Reset database (destructive)
```

`NODE_OPTIONS="--require ./node-compat.cjs"` is automatically prepended by the npm scripts — this is required for Node API compatibility.

## Environment

Requires `.env` with `ANTHROPIC_API_KEY`. The app falls back to a `MockLanguageModel` when no key is set (see `src/lib/provider.ts`).

## Architecture

### Three-Panel UI
- **Left (35%):** Chat interface (`src/components/chat/`)
- **Right (65%):** Toggle between live preview (`src/components/preview/PreviewFrame.tsx`) and Monaco code editor (`src/components/editor/`)

### AI Generation Flow
1. User message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Claude receives a system prompt (`src/lib/prompts/generation.tsx`) and uses two tools:
   - `str_replace_editor` (`src/lib/tools/`) — edits file contents
   - `file_manager` (`src/lib/tools/`) — creates/deletes files and directories
3. File changes update the `VirtualFileSystem` context (`src/lib/contexts/`)
4. On completion, messages + file system state are JSON-serialized and saved to the database

### Virtual File System
`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory file tree — no real files are written to disk. State is persisted to the database as a JSON string in `Project.data`.

### Authentication
- JWT via `jose` stored in HTTP-only cookies; sessions last 7 days
- Anonymous users are supported; `userId` on `Project` is optional
- `src/middleware.ts` enforces auth on protected routes
- Server actions in `src/actions/index.ts` handle sign-up, sign-in, sign-out, getUser

### Database
SQLite via Prisma. Two models: `User` (email/password) and `Project` (chat messages + file system state as JSON strings). Schema at `prisma/schema.prisma`.

### Key Directories
| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages and API routes |
| `src/actions/` | Server Actions (auth, project CRUD) |
| `src/components/` | React components grouped by feature |
| `src/lib/` | Core logic: VirtualFileSystem, auth, AI tools, prompts, contexts |
| `src/hooks/` | Custom React hooks |
| `src/lib/__tests__/` | Vitest unit tests |
