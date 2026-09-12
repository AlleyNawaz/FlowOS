# FlowOS delivery roadmap

## Milestone 1 — trustworthy retrieval alpha

Status: implemented in this repository.

- Native Tauri desktop shell for macOS, Windows, and Linux.
- Universal command center and `Command/Ctrl + K` palette.
- Natural-language intent routing.
- Bounded local filename and path search across visible folders.
- Ranked results with open and reveal actions.
- Local preferences and recents.
- Honest capability states for assistant, automation, and memory.
- Native and frontend tests, build checks, and architecture documentation.

Exit criteria: a user can install the app, choose visible search roots, find a local file from an inexact phrase, and open it without any filename or content leaving the device.

## Milestone 2 — local understanding beta

- Permission onboarding and user-selected roots.
- SQLite metadata and full-text index with incremental file watching.
- PDF, Office, Markdown, text, and image OCR extractors in isolated workers.
- Hybrid semantic and lexical retrieval with relevance evaluation.
- Source-cited answers and document summaries.
- Transparent memory inbox with provenance, edit, forget, and expiry.
- Global shortcut, menu bar mode, accessibility audit, signed builds, and automatic updates.

Exit criteria: p95 indexed search below 150 ms; evaluated top-five retrieval precision above 80%; every generated factual answer links to local source spans.

## Milestone 3 — reviewable actions

- File organization plans with before/after previews and undo logs.
- Calendar, email, browser, and cloud-drive connectors using least-privilege OAuth.
- Workflow recorder that proposes reusable automations from repeated actions.
- Durable job runner with idempotency, cancellation, retries, and audit history.
- Encrypted secrets in the operating-system credential vault.

Exit criteria: five high-frequency workflows achieve more than 90% successful completion in staged testing, with no unconfirmed external or destructive action.

## Milestone 4 — team and enterprise

- Permission-aware shared search, teams, roles, and source administration.
- SSO/SAML, SCIM, audit export, retention policy, legal holds, and deployment controls.
- Tenant isolation, customer-managed encryption options, and regional processing.
- Admin analytics focused on adoption and retrieval quality rather than employee surveillance.

Exit criteria: independent security assessment, documented disaster recovery, enterprise availability targets, and design-partner approval.

## Product learning cadence

Each milestone ships to a small cohort first. Instrument only events needed to measure activation, retrieval success, latency, action completion, and trust controls; never collect file names, queries, or document contents by default. A capability advances when usage and qualitative evidence support it, not because it appeared in the original feature list.

