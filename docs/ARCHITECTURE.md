# FlowOS technical architecture

## Architecture goals

The desktop foundation optimizes for local privacy, a small trusted computing surface, fast startup, testable domain logic, and an incremental path from filesystem scan to a durable semantic index.

```text
React command UI
  │ typed invoke calls
  ▼
Tauri command boundary
  │ validates input and allowed roots
  ▼
Local services
  ├── filesystem retrieval (implemented)
  ├── metadata/content index (Milestone 2)
  ├── intent planner (routing implemented)
  ├── memory store (Milestone 2)
  └── connector broker (Milestone 3)
```

## Current components

### React presentation layer

`src/App.tsx` owns the command center, search, command-response, recents, and settings surfaces. UI state is explicit and typed. Local preferences and query history use browser storage because they contain no file contents or credentials. Unimplemented memory and automation modules are absent from navigation.

`src/lib/flow.ts` is the frontend boundary. It classifies initial intents and invokes native operations. Browser preview behavior lives behind the same interface so visual development never leaks into the native service.

### Native command layer

`src-tauri/src/lib.rs` is the only filesystem boundary. The alpha exposes three commands:

- `search_files`: read-only bounded traversal of Documents, Desktop, and Downloads.
- `open_file`: opens a canonical path after checking it is under an allowed root.
- `reveal_file`: reveals a validated path in the platform file manager.

The scanner skips unreadable entries, hidden entries by default, symlinks during recursion, paths deeper than eight levels, and work beyond 60,000 entries per query. It returns at most 60 ranked results. These limits prevent an accidental unbounded traversal, but the scan remains an alpha implementation.

## Security boundaries

- The webview receives no generic shell or filesystem permission.
- Rust commands accept symbolic location names rather than arbitrary search roots.
- Open/reveal canonicalize the target and reject paths outside user-approved roots.
- The app has a restrictive content security policy.
- No API keys are collected or stored.
- No network-based AI is present in the alpha.
- Future destructive tools must separate planning from execution and use a per-action confirmation token.

Threats explicitly considered include path traversal, symlink escape, command injection, inadvertent cloud upload, runaway recursion, oversized result sets, and hidden-file disclosure.

## Evolution to Milestone 2

Replace query-time traversal with a background index:

1. OS file watcher emits changed paths.
2. Extractors read supported text in a sandboxed worker with file-size limits.
3. SQLite stores metadata, full-text search terms, and source permissions.
4. A local embedding model creates optional semantic vectors.
5. Hybrid retrieval combines lexical, semantic, recency, and usage signals.
6. Answers carry source IDs that resolve back to exact files and extracted spans.

SQLite is the preferred durable store because it is portable, transactional, debuggable, and supports local full-text search without a service dependency. Vector storage should begin in the same database unless profiling proves a dedicated engine is necessary.

## Data model direction

```text
source(id, kind, canonical_uri, display_name, permission_scope)
artifact(id, source_id, mime_type, modified_at, content_hash, extractor_version)
chunk(id, artifact_id, ordinal, text, token_count)
embedding(chunk_id, model_id, vector)
memory(id, claim, provenance, confidence, created_at, expires_at)
action(id, intent, plan_json, status, approved_at, audit_json)
```

Memory claims require provenance and confidence. Deleting a source must cascade to derived chunks, embeddings, and memories unless a user explicitly retained a derived memory.

## Testing strategy

Pure intent and query parsing logic has unit coverage in Vitest. Native normalization and ranking have Rust unit coverage. Milestone 2 adds fixture-based extractor tests, search relevance judgments, path-permission integration tests, corrupted-index recovery, and performance budgets measured against 10k, 100k, and 1m-file corpora.
