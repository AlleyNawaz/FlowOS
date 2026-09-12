# Contributing to FlowOS

## Development setup

Install Node.js 22 or newer, the stable Rust toolchain, and the Tauri 2 prerequisites for your platform. Then run:

```bash
npm ci
npm run tauri dev
```

## Required checks

Before opening a pull request:

```bash
npm run check
npm run check:native
npm audit --audit-level=moderate
```

Keep changes focused. Add tests for search ranking, permission boundaries, data migrations, and irreversible behavior. Small visual or copy changes do not require implementation-mirroring tests.

Never commit credentials, private signing keys, user data, document fixtures copied from real accounts, or generated release bundles.

## Architecture expectations

- Frontend code calls native functionality only through a typed boundary in `src/lib`.
- Native commands validate all paths and external inputs before I/O.
- Filesystem mutations must support preview, confirmation, and recovery.
- Memory records must include provenance and be editable and removable.
- Network features must state what leaves the device and why.
