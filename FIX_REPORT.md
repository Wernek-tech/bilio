# FIX REPORT

Status: PENDING VERIFICATION — this is not a final release.

## Scope completed in the working tree

- Preserved the existing Bilio project architecture and existing routes.
- Fixed registration rewards so a newly registered account receives exactly 5,000 gold and 1,000 diamonds once, stored in the persistent account record.
- Kept guest toolbar balances at 0/0 and authenticated toolbar balances tied to persistent account balances.
- Kept the welcome message and registration reward notification persistent.
- Reworked Bil Bakalım room state to use authenticated joined users only.
- Removed fake Bil Bakalım players, fake room chat, fixed `BB-2048` room data, visible debug controls, clickable word-list scoring and hardcoded correct-cell shortcuts.
- Bil Bakalım now uses a real generated room code, persistent room state, real ready counts, host-only settings, real room chat and server-side board selection validation.
- Added a structured weekly leaderboard empty state without sample players.
- Added persistent store catalog/purchase/ownership behavior tied to the same persistent balances.
- Added persistent profile data flow for profile fields, equipped title/frame and collection state.
- Adjusted desktop page proportions and empty states without replacing the existing application.
- Vampir Köylü gameplay engine/source was not intentionally changed as part of these fixes.

## Files changed compared with the preserved pre-fix backup

- `package.json`
- `server/auth-server.mjs`
- `server/bil-bakalim-store.mjs` (new)
- `src/pages/BilBakalimGame.tsx`
- `src/pages/Leaderboard.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Store.tsx`
- `src/styles.css`
- `test/auth-registration.test.mjs`
- `test/bil-bakalim-integration.test.mjs` (new)
- `test/site-sections.test.mjs`
- `FIX_REPORT.md` (new/updated)
- `TEST_REPORT.md` (new/updated)

The old local demo data files `src/data/leaderboard.ts` and `src/data/lobbyMessages.ts` are not present in the fixed working tree.

## Dependency policy

`package.json` uses fixed versions, not `latest` ranges:

- react 19.1.1
- react-dom 19.1.1
- react-router-dom 7.8.2
- @eslint/js 9.34.0
- @types/react 19.1.12
- @types/react-dom 19.1.9
- @vitejs/plugin-react 5.0.2
- eslint 9.34.0
- eslint-plugin-react-hooks 5.2.0
- eslint-plugin-react-refresh 0.4.20
- globals 16.3.0
- typescript 5.9.2
- typescript-eslint 8.41.0
- vite 7.1.3

No lockfile existed in the supplied/working project at this stage. npm remains the package manager because the project scripts and prior project setup are npm-based. No pnpm or Yarn lockfile was created.

## Static source scans

The application source was rescanned for the banned fake usernames, `BB-2048`, `HATALI SEÇİMİ TEST ET`, visible debug/test controls and direct word-list score handlers. None remain in runtime source/UI code.

`KAPLAN` still appears only as a legitimate word in the `HAYVANLAR` word pool in `server/bil-bakalim-engine.mjs`; there is no hardcoded `KAPLAN` correct-cell shortcut or direct `correct('KAPLAN')` path.

No `.env`, private key, credential/token file, `node_modules`, build cache, `dist`, temporary log or test artifact is included in the pending archive. `.env.example` contains only non-secret local configuration examples.

## Remaining blocker

Final verification cannot yet be completed because all tested npm registry endpoints currently fail DNS resolution with `EAI_AGAIN`. TypeScript, ESLint, the production Vite build, clean dependency installation, production preview and browser-console verification therefore remain pending. This report must not be interpreted as a final acceptance report.
