# FlowOS release process

## Current state

GitHub Actions can build draft installers for macOS, Windows, and Linux from a version tag. Draft status prevents an unsigned or unreviewed build from becoming a public release automatically.

## Prepare a release

1. Update the version in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
2. Update `CHANGELOG.md` with user-visible changes, migrations, and known limitations.
3. Run `npm run check`, `npm run check:native`, and a local release build.
4. Merge the release commit to `main` and confirm CI is green.
5. Create and push a signed tag such as `v0.2.0`.
6. Inspect every draft installer, complete smoke tests on each target OS, and publish the GitHub draft release.

The version synchronization check fails when a tag or manifest does not match.

## Signing prerequisites

Commercial macOS distribution requires a Developer ID certificate and Apple notarization. Store the certificate and notarization credentials as protected GitHub Actions secrets named in `.github/workflows/release.yml`. A local `APPLE_SIGNING_IDENTITY` overrides the ad-hoc identity used by development builds.

Windows signing credentials must be added before a public Windows release. Linux packages should publish checksums and signatures alongside installers.

## Automatic updates

Automatic updates remain disabled until the release signing key is created and stored in a durable organizational secret vault. Tauri update signature verification cannot be disabled, and losing the private update key prevents trusted updates for existing installations. Add the updater only after the key custody and rotation policy is approved.
