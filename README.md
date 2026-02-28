<p align="center">
  <img src="apps/frontend/src/assets/logo.png" alt="Jireh's Flashcards" width="80" height="80" />
</p>

<h1 align="center">Jireh's Flashcards</h1>

<p align="center">
  Offline-first spaced repetition flashcard app built with Tauri, React, and Rust.
</p>

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Zustand, TanStack Query |
| Desktop | Tauri 2, SQLite (rusqlite), file watching (notify) |
| Core | Rust library -- SM-2 and FSRS algorithms, markdown parser, fuzzy matching |

## Project Structure

```
apps/
  frontend/          # React web app
  desktop/src-tauri/ # Tauri 2 shell (Rust backend, SQLite, file watcher)
libs/
  flashcard-core/    # Spaced repetition algorithms, parser, answer matching
  shared-types/      # TypeScript type definitions
```

## Prerequisites

- Node.js >= 20.0.0
- pnpm 9.x (`npm install -g pnpm`)
- Rust toolchain

## Quick Start

```bash
pnpm install
pnpm desktop:dev
```

## Commands

```bash
# Development
pnpm dev                      # All dev servers (Nx)
pnpm frontend:dev             # Frontend only (port 5173)
pnpm desktop:dev              # Tauri desktop app

# Testing
pnpm frontend:test            # Frontend tests (Vitest)
pnpm frontend:test:coverage   # With 80% coverage threshold
cargo test                    # All Rust tests
cargo test -p flashcard-core  # Core library only

# Build
pnpm frontend:build           # Frontend production build
pnpm desktop:build            # Desktop executable
cargo clippy                  # Rust linting
```

## Architecture

```
Markdown files (source of truth for card content)
        |
        v
  File Watcher (notify crate)
        |
        v
  SQLite (~/.local/share/jirehs-flashcards/flashcards.db)
        |
        v
  Tauri IPC commands
        |
        v
  React frontend (TanStack Query cache)
```

- Local markdown files are the source of truth for card content
- SQLite stores learning state (card states, reviews, settings)
- No backend server -- fully offline

## Testing

Frontend uses Vitest with 80% coverage threshold. Test utilities in `apps/frontend/src/test/`:

- `setup.ts` -- test environment config
- `factories.ts` -- test data factories
- `mocks/tauri.ts` -- centralized Tauri mock routing
- `utils.ts` -- shared render helpers
