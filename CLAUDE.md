# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                      # All dev servers (Nx)
pnpm frontend:dev             # Frontend only (port 5173)
pnpm desktop:dev              # Tauri desktop app

# Testing - Frontend (Vitest, 80% coverage threshold)
pnpm frontend:test            # Run all frontend tests
pnpm frontend:test:coverage   # With coverage report
cd apps/frontend && npx vitest run src/components/Card/Card.test.tsx  # Single test file

# Testing - Rust
cargo test                    # All Rust tests (workspace)
cargo test -p flashcard-core  # Core library only
cargo test -p jirehs-flashcards-desktop  # Desktop crate only

# Build
pnpm frontend:build           # Frontend production build (type-checks then bundles)
pnpm desktop:build            # Desktop executable
cargo clippy                  # Rust linting
```

## Architecture

Offline-first desktop flashcard app. Markdown files are the source of truth for card content; SQLite stores learning state. No backend server.

### Monorepo Layout (Nx + pnpm workspaces, Cargo workspace)

- **`apps/frontend/`** -- React 18 + TypeScript + Vite. Zustand for UI state, TanStack Query for server state cache.
- **`apps/desktop/src-tauri/`** -- Tauri 2 shell. Rust backend with SQLite (rusqlite), file watching (notify crate). DB at `~/.local/share/jirehs-flashcards/flashcards.db`.
- **`libs/flashcard-core/`** -- Pure Rust library. Parser, spaced repetition algorithms (SM-2, FSRS), answer comparison/fuzzy matching. No Tauri dependency.
- **`libs/shared-types/`** -- TypeScript interfaces consumed as source (no build step). Aliased as `@jirehs-flashcards/shared-types`.

### Frontend-Backend IPC

```
React hook (useStudySession, useFileWatcher, etc.)
  -> TanStack Query (cache + mutations)
    -> apps/frontend/src/lib/tauri.ts (thin invoke wrappers)
      -> @tauri-apps/api/core invoke()
        -> Tauri #[tauri::command] in apps/desktop/src-tauri/src/commands/
          -> AppState { repository: Arc<Mutex<SqliteRepository>>, watcher: AsyncMutex<FileWatcher> }
```

Tauri commands are grouped into modules: `deck.rs`, `study.rs`, `settings.rs`, `stats.rs`, `watcher.rs`. All registered in `lib.rs` via `tauri::generate_handler![]`.

### Key Patterns

- **Settings cascade**: Global settings + optional per-deck overrides merged via `getEffectiveSettings()`.
- **File watching**: `notify` crate watches directories, emits `file-changed`/`deck-updated` Tauri events, React Query invalidates affected queries.
- **Markdown parsing**: `flashcard-core::parser::parse()` extracts cards (ID/Q/A format). `inject_ids()` auto-assigns IDs to new cards and rewrites the file.
- **Algorithm trait**: `SpacedRepetitionAlgorithm` trait in flashcard-core allows swapping SM-2/FSRS. Factory via `get_algorithm(name)`.
- **CSS button reset**: Components use a reset architecture with opt-in styling classes rather than a component library.

### Testing Infrastructure (Frontend)

- `src/test/mocks/tauri.ts` -- Centralized Tauri mock routing. `mockTauriCommands` maps command names to `vi.fn()` mocks; `setupTauriMock()` wires them into `invoke`. `mockDefaults` provides default return values.
- `src/test/factories.ts` -- Test data factories (`createMockDeck`, `createMockCard`, `createMockStudyQueue`, etc.) with auto-incrementing IDs.
- `src/test/setup.ts` -- Global test setup that initializes Tauri mocks. Tests use `@testing-library/react` + `@testing-library/user-event`.
- Tests are colocated with source files (`*.test.tsx` next to the component).

### Routes

`/` DeckList, `/study/:deckPath` StudySession, `/settings` Settings, `/stats/:deckPath` Statistics.
