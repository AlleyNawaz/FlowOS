# FlowOS architecture review

**Review date:** 2026-09-13  
**Repository:** `AlleyNawaz/FlowOS`  
**Reviewed version:** `0.1.0-alpha`  
**Primary platforms:** macOS, then Windows  
**Future platform:** Linux

## Executive assessment

FlowOS is a coherent desktop alpha, not yet a production AI operating layer. Its strongest foundation is a small Tauri 2 native boundary: the webview has no generic shell or filesystem permission, searches are read-only, and open/reveal commands canonicalize paths before calling the operating system. The React interface is polished and the repository builds into a macOS application and DMG.

The product currently solves one narrow job: locating files by filename or path in Documents, Desktop, and Downloads. It does not yet implement content indexing, semantic retrieval, model-backed conversation, document understanding, durable memory, automation, plugins, cloud services, authentication, encrypted secrets, product analytics, automatic updates, or production crash reporting. The interface contains clearly labelled future surfaces and browser-only demonstration results; neither should be counted as shipped functionality.

Production work should preserve the existing local-first boundary while replacing query-time traversal with a durable local index. Search is the right first competitive wedge because it is frequent, measurable, and establishes the source and permission model required by AI, memory, automation, and plugins.

## Audit scope and evidence

The review covered every source and configuration file, the locked JavaScript and Rust dependency graphs, native capabilities, build scripts, package configuration, documentation, repository history, and generated installers. The following checks were executed:

- TypeScript compilation and Vite production build.
- Vitest unit suite.
- Rust unit and documentation tests.
- Rust Clippy with warnings denied.
- npm production and development dependency audit.
- Tauri macOS application and DMG packaging.
- Manual visual inspection of the command center, search journey, settings, and command palette.

At review time, all existing tests and builds pass. Test volume is five unit tests after the recency-query regression was added. No coverage measurement exists, so the requested 80% minimum is not currently demonstrated.

## Current architecture

```text
FlowOS desktop process
├── Tauri 2 host (Rust)
│   ├── search_files
│   │   └── bounded traversal of Documents, Desktop, Downloads
│   ├── open_file
│   │   └── canonical-path validation → platform open command
│   └── reveal_file
│       └── canonical-path validation → platform file manager
│
└── System webview
    └── React 19 single-page application
        ├── command center and in-window ⌘K palette
        ├── local search results
        ├── intent classification
        ├── assistant/future-capability surfaces
        ├── settings in localStorage
        └── query history in localStorage
```

### Languages and frameworks

| Area | Current technology | Assessment |
|---|---|---|
| Desktop host | Tauri 2, Rust 2021 | Appropriate for a small, cross-platform, capability-restricted desktop application. |
| Interface | React 19, TypeScript 5.9, Vite 7 | Current and fast, with strict TypeScript enabled. |
| UI assets | Lucide React and custom CSS | Small direct dependency surface; design tokens are embedded in one stylesheet. |
| Native serialization | Serde and serde_json | Conventional, typed command payloads. |
| User-directory discovery | `dirs` | Appropriate for current fixed search roots. |
| Frontend tests | Vitest 5 | Pure intent/query tests only. |
| Native tests | Rust built-in test framework | Pure normalization/ranking tests only. |
| Persistence | Browser localStorage | Acceptable for non-sensitive preferences and recents; inadequate for indexed content and memory. |
| Distribution | Tauri bundler | Local macOS `.app` and `.dmg` verified; no signed public release. |

The direct dependency set is deliberately small. The locked npm tree contains no known vulnerabilities after upgrading Vitest beyond its affected path-traversal range and removing unused jsdom. Transitive Rust duplication is primarily introduced by the Tauri platform stack and does not justify manual dependency overrides.

### Frontend structure

`src/App.tsx` currently contains navigation, all views, state, command execution, search-result rendering, settings, and most copy. `src/lib/flow.ts` is the typed guest-to-native boundary and contains lightweight intent parsing. `src/styles.css` contains the entire visual system.

This organization is efficient for an alpha but has reached the point where changes to unrelated product areas collide in the same files. State is local to the root component, no router or domain stores exist, and there is no error boundary. Search requests are not cancellable and can resolve out of order when a user submits multiple queries quickly.

### Native structure

`src-tauri/src/lib.rs` contains command definitions, filesystem traversal, ranking, path authorization, file classification, and platform process launching. Searches run in a blocking worker so directory traversal no longer occupies the Tauri command thread. Traversal skips hidden files by default, does not recurse through symlinks, stops after eight levels or 60,000 entries, and returns at most 60 matches.

The search command accepts symbolic roots rather than arbitrary paths. Open and reveal resolve the target through `canonicalize` and require it to remain under one of the built-in roots. Arguments are passed directly to the operating-system process API rather than interpolated into shell commands.

### Build, CI, and release state

The local build uses npm scripts and the Tauri CLI. Application versions now have an automated consistency check across npm, Cargo, and Tauri manifests. GitHub Actions definitions cover frontend checks, dependency auditing, and Rust tests on macOS, Windows, and Linux. A tag-triggered workflow prepares draft installers for all three operating systems.

The workflow is release infrastructure rather than a production release guarantee. macOS currently uses ad-hoc signing unless protected Apple credentials are present. Windows signing is not configured. Automatic updates are intentionally absent until an organization-owned updater signing key and custody policy exist. Linux remains a build-validation target rather than a supported product platform.

## Problems discovered

### Product and capability gaps

| Priority | Problem | User and business impact |
|---|---|---|
| P0 | The assistant is rule-based intent classification, not an AI system. | Conversation, reasoning, task execution, document understanding, and content creation claims are unsupported. |
| P0 | Search reads directory metadata on every query and has no content or vector index. | Performance scales with filesystem size and cannot reliably meet a sub-100 ms target. Queries such as “presentation about climate research” cannot match unrelated filenames. |
| P0 | Browser preview returns fabricated file results. | Demonstration data can be mistaken for real retrieval and conflicts with the requirement to avoid fake implementations. Remove it before any public product release. |
| P0 | The home activity list is static demonstration content. | It misrepresents user history. Real local history should be shown or the section should be empty. |
| P1 | Memory, automations, and plugins are navigation placeholders. | They communicate direction but provide no recurring user value. Public navigation should expose only working capabilities. |
| P1 | No onboarding or filesystem permission education exists. | Users do not know why files may be absent, especially under macOS privacy controls. |
| P1 | Search covers three fixed roots and excludes applications. | The launcher does not yet replace Spotlight, Alfred, or Raycast for daily invocation. |

### Architecture and maintainability

| Priority | Problem | Required correction |
|---|---|---|
| P0 | Query-time traversal is `O(number of entries)` and repeated for every request. | Build an incremental metadata/content index with filesystem watchers and transactional recovery. |
| P0 | Concurrent search responses can arrive out of order. | Add request identifiers or cancellation and discard stale responses at the frontend boundary. |
| P1 | `App.tsx` and `styles.css` are monolithic. | Split by feature after stable module contracts exist; avoid moving code solely to create folders. |
| P1 | Native concerns share one Rust module. | Separate command adapters, domain types, authorization, search, and platform launch code. |
| P1 | Error values are plain strings with no stable codes. | Return typed errors that separate invalid input, permission denial, unavailable paths, limits, and internal faults. |
| P1 | Preferences and permissions have no schema or migration. | Introduce a versioned settings repository before adding more persisted fields. |
| P2 | No structured diagnostics or crash pipeline exists. | Add local redacted logs, crash consent, symbol upload, and performance spans before beta. |

### Security and privacy

| Priority | Finding | Assessment and action |
|---|---|---|
| P0 | Public releases are not identity-signed or notarized. | A debug DMG is installable for development but unsuitable for commercial distribution. Configure Developer ID notarization and Windows signing before release. |
| P0 | No encrypted credential storage exists. | No secrets are currently collected, which is safe. Provider and connector credentials must use Keychain/Credential Manager through native code when added. |
| P1 | The production CSP permits inline styles. | Use a development-only CSP allowance and remove `unsafe-inline` from packaged builds after verifying Vite output and all platforms. |
| P1 | File-open authorization uses built-in roots, not persisted user grants. | Store explicit scoped grants and invalidate results when access is removed. |
| P1 | There is no audit record for future actions. | Automation execution needs immutable plan, approval, result, and recovery records without storing unnecessary content. |
| P2 | The repository is MIT licensed. | This allows commercial reuse and redistribution by third parties. Confirm that this matches the intended business model before accepting external contributions. Do not change the license without an owner decision. |

### Testing and quality

- Existing unit tests cover only intent classification, query cleanup, and native ranking helpers.
- There are no tests for allowed-root enforcement, symlink escape, unreadable directories, scan limits, stale responses, settings migration, application startup, packaging metadata, or OS behavior.
- There is no integration harness invoking Rust commands through a real Tauri webview.
- There is no end-to-end desktop automation on macOS or Windows.
- There is no measured launch latency, query latency, memory use, bundle startup profile, or large-corpus benchmark.
- The 80% coverage requirement is not currently measured or met. Enforcing a number before domain modules are separated would reward shallow UI tests; the threshold should be applied to production domain modules as they are introduced, with security boundaries requiring complete branch coverage.

### Performance

The frontend production payload is approximately 250 KB JavaScript before compression and 78 KB compressed, which is reasonable. The dominant risk is filesystem I/O. A maximum of 60,000 entries per request still permits repeated multi-second scans on slower disks, network-mounted folders, or directories with expensive metadata access. A hard scan limit avoids runaway work but creates incomplete results.

Launch under one second and local responses under 100 ms must be verified on representative macOS and Windows hardware. They cannot be inferred from bundle size. Establish cold/warm launch, resident memory, first query, indexed query, index update, and 95th/99th percentile budgets in CI or scheduled benchmark runs.

## Recommended modular architecture

The system should be a modular monolith first. Separate process boundaries only where they provide security, failure isolation, or independent scaling. Premature microservices would add latency and operational cost before product-market evidence exists.

```text
FlowOS
├── Desktop Application
│   ├── command UI, onboarding, accessibility, window lifecycle
│   └── typed IPC client; no direct secrets or filesystem authority
├── Local Services
│   ├── permission broker and scoped source registry
│   ├── SQLite storage and migrations
│   ├── file watchers and document extraction workers
│   └── credential-vault adapter
├── Search Engine
│   ├── metadata and application catalog
│   ├── full-text index
│   ├── local embeddings
│   └── hybrid ranker with source citations
├── AI Engine
│   ├── provider-neutral model interface
│   ├── intent planner and tool registry
│   ├── context budgeting and citation enforcement
│   └── policy/approval boundary for actions
├── Memory System
│   ├── preference, project, knowledge, history, workflow records
│   ├── provenance, confidence, expiry, and encryption metadata
│   └── store, search, update, export, and delete operations
├── Automation Engine
│   ├── typed triggers and actions
│   ├── durable idempotent job runner
│   ├── preview, approval, rollback, and audit record
│   └── resource and concurrency limits
├── Plugin Framework
│   ├── signed manifest and semantic version contract
│   ├── isolated worker/WASM execution
│   ├── explicit permission scopes
│   └── install, upgrade, disable, and removal lifecycle
├── Cloud Services
│   ├── optional account, billing, encrypted sync, team policy
│   └── permission-aware connector ingestion
├── Update System
│   ├── signed release metadata and staged channels
│   └── check, download, verify, install, rollback telemetry
└── Analytics System
    ├── disabled-by-default or explicit-consent event pipeline
    ├── schema allowlist with no query, filename, or content fields
    └── activation, feature use, crash, and performance aggregates
```

### Module contracts

Each module owns its schema, errors, tests, and migrations. Cross-module calls use versioned typed interfaces. The UI consumes view models rather than storage rows. AI tools call domain services rather than shell commands. Plugins receive capability handles rather than ambient filesystem or network access. Cloud components are optional: the core launcher and local search must remain useful offline.

Recommended repository evolution:

```text
src/
├── app/                 application shell, navigation, error boundaries
├── features/            command, search, settings, recents
├── components/          reusable accessible UI primitives
└── platform/            typed Tauri client and browser capability checks

src-tauri/src/
├── commands/            thin validated IPC adapters
├── search/              indexing, retrieval, ranking
├── sources/             grants, watchers, extractors
├── storage/             SQLite, migrations, repositories
├── security/            path policy, vault, redaction, approvals
├── platform/            macOS/Windows application and file operations
└── diagnostics/         structured local logs and performance spans
```

Create these directories as working modules arrive. An empty folder hierarchy would be a placeholder rather than architecture.

## Recommended improvements

### 1. Make local retrieval production-grade

Build a SQLite metadata index using WAL mode, versioned migrations, and atomic recovery. Register user-selected roots, perform an initial bounded crawl, and subscribe to operating-system file changes. Return early filename matches during onboarding, then enrich supported documents through isolated extraction workers. Combine SQLite full-text search with local embeddings and recency/usage signals.

This is the highest-value investment because users search repeatedly, faster retrieval saves time on every use, and the indexed source model becomes the foundation for cited AI answers. Competitive advantage comes from private hybrid retrieval with clear permissions and better action handoff.

Acceptance criteria:

- Indexed filename search p95 below 100 ms on a 100,000-file corpus.
- Incremental changes visible within two seconds.
- Interrupted indexing resumes without corruption or a full restart.
- Search never escapes granted roots or follows a symlink outside a grant.
- Every result reports source, match reason, freshness, and permission state.

### 2. Complete the desktop invocation experience

Register a configurable global shortcut. `CMD+Control` alone is a modifier chord and cannot be registered reliably as an application hotkey; use `⌘⌃Space` as the default on macOS and provide a conflict-aware recorder. Add a menu-bar/tray lifecycle, hide-on-blur behavior, multi-monitor placement, keyboard-complete navigation, screen-reader labels, reduced-motion support, and OS permission onboarding.

Acceptance criteria:

- Warm invocation p95 below 100 ms and cold launch below one second on supported hardware.
- Every command can be completed without a pointing device.
- Shortcut conflicts are detected and explained.
- The window opens on the active display and restores focus to the prior application when dismissed.

### 3. Introduce a real AI engine behind explicit trust controls

Define a provider-neutral streaming interface supporting local models and opt-in remote providers. Store provider keys only in the OS credential vault. Build a planner with a typed tool registry, maximum steps, timeouts, cancellation, token/cost budgets, and source citation requirements. Document text sent to a remote provider must be previewable by policy and covered by a clear privacy setting.

Start with document summarization because it naturally follows a search result and has a clear success measure. Do not ship open-ended agent execution until retrieval citations and approval records are reliable.

Acceptance criteria:

- No model response presents local facts without resolvable source citations.
- Provider credentials never enter webview storage, logs, analytics, or crash payloads.
- Requests stream, cancel promptly, time out, and return typed user-facing errors.
- The user can select local-only mode and verify that no network request occurs.

### 4. Add user-controlled memory

Create typed memory records for preferences, projects, knowledge, history, and workflows. Every inferred memory needs provenance, confidence, creation time, optional expiry, and a visible review state. Encrypt sensitive values with a data key protected by the OS vault. Support search, correction, export, deletion, source revocation, and complete account/device reset.

Acceptance criteria:

- Users can see why every memory exists and which answer or action used it.
- Deleting a source removes derived data according to a documented cascade policy.
- Memory export and deletion pass integration tests across schema migrations.

### 5. Build automation around preview and recovery

Represent triggers, conditions, and actions as versioned schemas. Execute them through a durable local job queue with idempotency keys, cancellation, retry policy, per-tool timeouts, and audit events. File changes begin with a complete plan, validate conflicts immediately before execution, and produce a recoverable undo record.

The invoice workflow is a strong initial vertical slice because it combines a frequent event, document extraction, deterministic naming, scoped file movement, and a measurable result. Expense-system creation should remain disabled until its connector and approval experience are production-ready.

### 6. Add plugins only after the permission model is proven

Define a signed manifest containing plugin ID, publisher, version, compatible FlowOS API range, commands, configuration schema, and requested capabilities. Run untrusted logic in an isolated worker or WASM runtime with explicit CPU, memory, time, filesystem, network-domain, and secret scopes. Installation must show requested permissions; upgrades that add permissions require renewed consent.

The desired CLI can expose `flowos install <plugin>`, but a CLI is a client of the same signed registry and installer service used by the desktop UI. It must not download and execute arbitrary packages directly.

### 7. Finish commercial release and operations

Keep tag builds as draft releases until CI, platform smoke tests, signing, and notarization pass. Add signed updater artifacts after generating and safeguarding the updater key. Publish SHA-256 checksums. For macOS, prepare a Homebrew cask so installation is `brew install --cask flowos`; reserve a formula for a future standalone CLI.

Privacy-friendly analytics should use an explicit event allowlist. Do not collect raw queries, filenames, file paths, document text, memory content, clipboard data, or plugin payloads. Installation and activation counts can use a random rotating installation identifier. Performance measurements should be bucketed and stripped of user content before transmission.

## Development roadmap

### Milestone 0 — trustworthy engineering baseline

**Outcome:** every subsequent change is reproducible and reviewable.

- Maintain synchronized versions, lockfiles, deterministic `npm ci`, Rust formatting, Clippy, unit tests, and moderate-or-higher dependency audit gates.
- Run native checks on macOS, Windows, and Linux; treat Linux as build compatibility only.
- Produce draft tag releases with documented signing requirements.
- Remove fabricated search/activity data and hide unfinished navigation from release builds.
- Add typed error codes and frontend error boundaries.
- Establish coverage reporting, with an 80% line and branch threshold for domain modules and 100% branch coverage for permission decisions.

**Exit gate:** clean CI on all targets, no known moderate-or-higher dependency advisory, reproducible draft installers, and no UI that implies an unimplemented capability works.

### Milestone 1 — instant local command and indexed search

**Outcome:** FlowOS becomes useful many times per day as a launcher and retrieval tool.

- Configurable `⌘⌃Space` global shortcut and Windows equivalent.
- App, file, and folder catalog with explicit source onboarding.
- SQLite metadata/full-text index, filesystem watching, crash recovery, and migrations.
- Hybrid ranking evaluation corpus and performance benchmarks.
- Modular search and desktop lifecycle code with integration tests.

**Exit gate:** cold launch under one second, warm invoke under 100 ms, indexed search p95 under 100 ms at 100,000 files, and top-five judged relevance above 80%.

### Milestone 2 — cited document intelligence

**Outcome:** users find and understand documents without switching applications.

- Safe extractors for PDF, plain text, Markdown, Office files, and OCR-supported images.
- Local embeddings and hybrid semantic search.
- Streaming provider-neutral AI interface and OS-vault credential storage.
- Summaries and questions with source-span citations, cancellation, cost limits, and local-only mode.
- Document-understanding unit, fixture, integration, privacy, and failure tests.

**Exit gate:** unsupported files fail clearly; factual answer evaluations meet the defined citation and groundedness threshold; no secret or content enters diagnostics.

### Milestone 3 — transparent memory

**Outcome:** FlowOS improves with use while remaining understandable and reversible.

- Versioned encrypted memory repository and provenance model.
- Memory inbox, search, edit, forget, expiry, export, and full reset.
- Project context built from explicit sources.
- Memory quality, deletion cascade, encryption, and migration tests.

**Exit gate:** every stored memory is inspectable and attributable; export/deletion works across upgrades; local-only memory needs no account.

### Milestone 4 — safe automation

**Outcome:** FlowOS saves meaningful time on repeated multi-step work.

- Durable trigger/action engine with previews, approvals, idempotency, undo, and audit history.
- First complete invoice workflow using local download events and document extraction.
- Calendar and email reply drafting as opt-in connectors; sending always remains a distinct approved action.
- End-to-end reliability, race, rollback, and permission-revocation tests.

**Exit gate:** selected workflows complete successfully above 95% in staged trials, and no external or destructive action can execute without its required authorization.

### Milestone 5 — signed extensibility and commercial beta

**Outcome:** third parties can extend FlowOS without gaining ambient authority.

- Signed plugin manifests, isolated runtime, capability prompts, registry, CLI, upgrades, and revocation.
- Signed/notarized macOS and signed Windows installers.
- Signed automatic updates with stable and beta channels.
- Homebrew cask, checksums, support diagnostics, privacy-safe product analytics, crash reporting, billing, and entitlement foundations.

**Exit gate:** independent security review, successful staged updater rollback, plugin escape testing, platform smoke suites, privacy review, and documented incident response.

### Milestone 6 — teams and enterprise

**Outcome:** organizations can adopt FlowOS with enforceable permissions and operations controls.

- Optional encrypted sync, team source connectors, permission-aware retrieval, SSO, SCIM, audit export, retention policy, and managed configuration.
- Tenant isolation, regional data controls, disaster recovery, service-level objectives, and enterprise administration.
- Gmail, Google Drive, Dropbox, Slack, and Notion connectors implemented against the shared source and permission contracts.

**Exit gate:** threat model and penetration test complete, disaster recovery exercised, tenant isolation verified, and design partners approve administration and audit workflows.

## Decision framework for every feature

Before implementation, a feature proposal must document:

1. The repeated user problem and evidence that it occurs.
2. The time or failure cost removed by the feature.
3. Expected usage frequency and the metric that will confirm it.
4. The concrete workflow improvement over current alternatives.
5. The durable advantage created by local context, trust, speed, or ecosystem.
6. Data touched, permissions required, network transmission, failure recovery, and deletion behavior.
7. Performance budget, test strategy, rollout gate, and rollback plan.

A feature that cannot answer these questions should not enter implementation. This keeps FlowOS modular and focused while the core product earns daily use.

## Immediate engineering sequence

The next implementation sequence should be:

1. Remove demonstration results and static activity from production paths.
2. Add request cancellation/stale-result protection and typed native errors.
3. Introduce a tested, migrated SQLite source and metadata index behind the existing `searchFiles` interface.
4. Add explicit source onboarding and macOS permission diagnostics.
5. Register the configurable global shortcut and measure invocation latency.
6. Split search and desktop lifecycle modules as the new contracts are introduced.
7. Begin document extraction only after indexed filename retrieval meets its correctness and performance gates.

This order produces a real daily-use product before adding expensive AI, automation, plugin, or cloud surface area.
