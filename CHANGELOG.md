# Changelog

All notable user-visible changes to FlowOS will be documented here. Versions follow Semantic Versioning while the product is in alpha.

## [Unreleased]

### Added

- Cross-platform CI for frontend, Rust, dependency, and security checks.
- Draft desktop release workflow for macOS, Windows, and Linux installers.
- Version synchronization checks and release documentation.
- Security reporting and contribution policies.

### Changed

- Local filesystem search now executes outside the Tauri command thread.
- Natural-language search treats recency words as ranking intent instead of required filename text.
- Upgraded Vitest past the affected path-traversal range and removed the unused jsdom dependency.
- Removed fabricated browser search results, static activity, and unfinished navigation from the product interface.
- Search requests now ignore stale responses when a newer command has been submitted.
