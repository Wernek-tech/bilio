# TEST REPORT

Status: PENDING VERIFICATION — not final.

## Automated tests actually executed

Command:

```sh
npm test
```

Result on 2026-08-31:

- Tests: 34
- Passed: 34
- Failed: 0
- Cancelled: 0
- Skipped: 0
- Todo: 0

Covered checks include:

- Guest protected-game API rejection.
- Registration reward, welcome message and notification creation.
- Registration rewards persist across sessions and are not granted twice.
- Duplicate username rejection.
- Incorrect password handling.
- Bil Bakalım board generation and Turkish normalization.
- 20 target words for all Bil Bakalım categories.
- Eight-direction line validation.
- Correct selection keeps turn; incorrect selection advances turn.
- Deterministic Bil Bakalım ranking/reward engine checks.
- Bil Bakalım room starts with real joined users only and no fake messages.
- Real unique room code instead of fixed `BB-2048`.
- Only the creator can change room settings.
- Real room chat persists in room state.
- Eight real authenticated players can ready and cause real match creation.
- Correct selection is validated against the generated server board.
- Bil Bakalım client source has no fake-player list, fixed room code, word-list cheat or visible debug control.
- Global lobby starts without fake messages and stores real messages.
- All store categories return a real content state.
- Store purchase is balance-backed, atomic/idempotent for non-consumables and persists after re-login.
- Profile data comes from the persistent account state and profile edits persist after re-login.
- Weekly leaderboard does not fabricate sample players.
- Existing Vampir Köylü role/night/vote/winner engine regression tests.

## Static scans actually executed

Runtime source was searched for:

- `OyunCanavarı`
- `BilgeAdam`
- `NeşeliPenguen`
- `MüzikKralı`
- `ÇizgiKağan`
- `TahminUstası`
- `GeceKöylüsü`
- `YayıncıPro`
- `BB-2048`
- `HATALI SEÇİMİ TEST ET`
- likely debug/demo/mock controls
- direct word-click scoring handlers
- hardcoded `correct('KAPLAN')` style shortcuts

No banned runtime source/UI occurrence was found. The string `KAPLAN` exists only as a normal animal word in the word pool. Test files intentionally contain banned strings as negative assertions; those are not runtime/demo data.

A filesystem scan found no project-local `node_modules`, `dist`, `.vite`, `.cache`, `.npm`, `.env`, private-key files, log files or temporary files intended for the archive. A heuristic secret scan found no embedded production credential/token/secret. Test-only sample passwords are local test fixtures and are not account credentials.

## Dependency versions

All package versions in `package.json` are pinned to explicit versions; no dependency uses `latest`.

## Registry checks actually executed

Commands were attempted with short fetch timeouts:

```sh
npm ping --registry=https://registry.npmjs.org/ --fetch-timeout=5000 --fetch-retries=0
npm ping --registry=https://registry.npmjs.cf/ --fetch-timeout=5000 --fetch-retries=0
npm ping --registry=https://registry.npmmirror.com/ --fetch-timeout=5000 --fetch-retries=0
```

Actual results:

- `registry.npmjs.org`: FAILED — `getaddrinfo EAI_AGAIN registry.npmjs.org`
- `registry.npmjs.cf`: FAILED — `getaddrinfo EAI_AGAIN registry.npmjs.cf`
- `registry.npmmirror.com`: FAILED — `getaddrinfo EAI_AGAIN registry.npmmirror.com`

No global npm registry setting was changed.

## Required checks still pending

These are **not** marked as passed:

- Clean dependency installation: PENDING — npm registry/DNS unavailable.
- `package-lock.json` generation: PENDING — clean installation could not run.
- TypeScript typecheck: PENDING — dependencies unavailable.
- ESLint: PENDING — dependencies unavailable.
- Production Vite build: PENDING — dependencies unavailable.
- Production preview: PENDING — dependencies unavailable.
- Browser visual verification: PENDING.
- Browser console verification: PENDING.

The pending backup must not be presented as a final release until all items above are genuinely completed successfully.
