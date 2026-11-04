# Windows desktop releases

**Audience:** Contributors and coding agents. Technical reference, not a user guide; dated sections record past checks.

Users download the installer or portable ZIP from GitHub Releases. The ZIP must
be extracted completely; then launch `Wonderblocks.exe`. Node.js, pnpm, Python,
the BF2 SDK and a separate browser are not needed to run the editor. The BF2 SDK
is still needed to compile exported source assets for the game.

The desktop app uses Electron and includes its own Chromium and Node runtime.
It keeps the existing loopback-only backend and uses a native folder picker for
direct world exports. It does not start or depend on the browser-mode launcher.

## Build locally

Development requires Node.js 24 and the pnpm version pinned in `package.json`.

```powershell
pnpm install --frozen-lockfile
pnpm run desktop:dist
pnpm run test:desktop -- dist/Wonderblocks-1.0.0-windows-x64.zip
pnpm run desktop:checksums
```

Downloads appear in `dist/`:

- `Wonderblocks-<version>-windows-x64-setup.exe`: per-user installer.
- `Wonderblocks-<version>-windows-x64.zip`: extract-and-run application folder.
- `SHA256SUMS.txt`: checksums of those two downloads.

For development without packaging, run `pnpm run desktop:install` once to
download Electron, then `pnpm run desktop:dev`.

## Automated release

The `Windows desktop` GitHub Actions workflow builds pull requests and manual
runs as downloadable workflow artifacts. Only a pushed version tag publishes a
GitHub release. The workflow runs the unit suite, builds both downloads, and
extracts the portable ZIP outside the repository and tests its executable with system Node paths removed before publishing anything.

1. Update `package.json` to the intended version and commit the release changes.
2. Push the commit to the GitHub repository.
3. Create and push the matching tag, for example:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

The tag must exactly match the package version. A tag such as `v1.1.0-beta.1`
produces a prerelease when the package version is `1.1.0-beta.1`. Normal commits
do not publish releases. Publishing uses the workflow's built-in GitHub token;
no personal access token is needed. A draft is created first and becomes public
after all tested downloads have uploaded. Failed builds do not publish a new
release. Re-running a successful tag build replaces its uploaded downloads.

The BF2 SDK tests are separate from this public packaging workflow; GitHub's
Windows runner does not have the proprietary SDK installed. Desktop builds are
currently unsigned; Windows may show an unknown-publisher prompt. Signing can
be configured later with the project's signing certificate.

## User data and updates

Projects, browser storage and the editable texture library use the user's
Wonderblocks application-data folder, normally `%APPDATA%\Wonderblocks`.
`Open textures folder` opens that writable library. Default textures are seeded
on first launch; subsequent versions update untouched defaults while preserving
user-added, edited and deleted textures. Saved world-folder choices also live
there. Application updates and uninstalling the program preserve user data.
The private desktop server uses port 4179, keeping browser-mode port 4178 separate.

The release whitelist excludes tests, research, development tools, saved folder
registries, and the locally supplied `assets/character` reference files.
