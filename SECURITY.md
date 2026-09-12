# FlowOS security policy

## Supported versions

FlowOS is currently an alpha. Security fixes are applied to the latest commit on `main`; no older build is supported until the first signed release.

## Reporting a vulnerability

Please use the repository's **Security → Report a vulnerability** flow to create a private GitHub security advisory. Do not open a public issue containing exploit details, personal data, credentials, or affected file contents.

Include the affected version or commit, platform, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within three business days and a status update within seven business days.

## Product security guarantees

- File search runs locally and does not upload filenames or contents.
- Native commands accept a fixed set of user-folder scopes.
- Open and reveal actions canonicalize paths and reject targets outside those scopes.
- The webview has no generic filesystem or shell permission.
- No secrets belong in frontend environment variables or repository files.
- Future external and mutating actions require a reviewable plan and explicit user approval.

These guarantees apply to the code in this repository. Unsigned alpha builds do not yet provide the identity and update guarantees required for commercial distribution.
