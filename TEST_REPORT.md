# TEST REPORT

Status: PRODUCTION BUILD VERIFICATION PENDING

## Dependency installation

- Fixed dependency versions: PASSED
- Clean npm dependency resolution: PASSED
- `package-lock.json` generation: PASSED
- Installed packages: 194
- Package managers were not mixed.

## TypeScript

Command: `npm run typecheck`

Result: PASSED — zero TypeScript errors.

## ESLint

Command: `npm run lint`

Result: PASSED — zero errors and zero warnings.

## Automated tests

The sandbox blocks Node's multi-file test-runner subprocesses, so each official test file was executed directly with Node.

- Tests: 34
- Passed: 34
- Failed: 0
- Skipped: 0

Covered areas include authentication, one-time registration rewards, Bil Bakalım real-room integration, server board validation, removal of fake/debug/cheat behavior, persistent store purchases, persistent profile data, empty weekly leaderboard behavior and Vampir Köylü engine regressions.

## Production build

Commands attempted:

- `npm run build`
- `npm run build -- --configLoader native`

TypeScript compilation inside the build command passes. Vite enters its build process but the verification sandbox denies esbuild child-process creation with `Error: spawn EPERM`.

This is an environment execution restriction, not a reported TypeScript or lint failure. Production build and browser preview remain pending and must be run in a normal Node environment before final production acceptance.
