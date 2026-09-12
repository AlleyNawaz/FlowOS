# FlowOS

FlowOS is a local-first desktop command center for finding information and moving work forward. The alpha release combines a universal command surface, private file search, assistant intent routing, recents, and explicit search permissions in one native app.

## Run it

Prerequisites: Node.js 20+, Rust 1.77+, and the [Tauri 2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your platform.

```bash
npm install
npm run tauri dev
```

For a browser-only UI preview:

```bash
npm run dev
```

The browser preview uses representative search results because browsers cannot inspect local files. The Tauri application searches the current user's Documents, Desktop, and Downloads folders.

## Validate it

```bash
npm run check
cargo test --manifest-path src-tauri/Cargo.toml
```

## Product contract

- Local filenames and preferences stay on the device.
- Search is read-only. Opening and revealing are restricted to the three visible search roots.
- Mutating actions are recognized but do not execute in this alpha.
- Any future action that changes files or external systems must present a preview and require explicit confirmation.

Architecture, product decisions, and milestones live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PRODUCT.md](docs/PRODUCT.md), and [docs/ROADMAP.md](docs/ROADMAP.md).

