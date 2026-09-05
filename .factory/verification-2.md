# Verify a finite language review — FAIL

Verified on 2026-09-05 UTC.

- Verdict: **FAIL**
- Findings: **6** (2 medium, 4 low)
- Untested public claims: **5**
- Implementation reviewed: `2c9f25462b7c529b118fc499cf2f70edeac44bac`
- Documentation head reviewed: `8475c05e6e07c761ec5cde981670c453ac83d925`
- Live URL: `https://calm-language-routine.sociobot.in`

The live product works through its main review, demo, storage, export, offline,
legal, and paid-license paths. It does not pass this work order because public
claims must be completely covered by their declared claim tests. Five claims
are missing or only partly tested. A separate one-card boundary has incorrect
copy.

## First screen before scrolling

- Job: **Review a small language set**
- Audience: adult language learners who want a short routine without streaks
  or an endless queue
- First action: **Try it with sample data**

Fresh 390×844 and 1280×800 browser contexts showed all three items without
scrolling. The action ended at 443 px on the phone and 450 px on the desktop.
Screenshots are in `/work/.evidence/verify-2/`.

## Findings

### M1 — The public delete promise has no claim entry or tagged test

The Data controls page promises “Delete all Quiet Loop data from this browser”
and exposes **Delete all local data** (`src/main.ts:203-205`). The README also
says deletion remains free. `.factory/claims.json` has no deletion claim.

The JSON-backup test clicks delete at `tests/claims.spec.ts:116-122`, but it
does not assert an empty state before reimporting the same records. If deletion
were a no-op, the test would still finish with five cards because the imported
records use the same IDs.

Independent live testing confirmed that cancel retains a card and confirm
removes it. The product behavior is currently true, but the public privacy
control has no claim command that would catch a regression.

### M2 — The paid-reflections claim test does not prove the full claim

The declared claim says a $12 one-time license adds **private weekly
reflections** and that a valid verdict is reused for **one day**
(`.factory/claims.json:52-56`). Its tagged test only proves the price, gating,
textbox visibility, and reuse across one immediate reload
(`tests/claims.spec.ts:143-160`). It does not:

- save and reload a reflection under the licensed fixture;
- record requests while the reflection is saved to prove the privacy word;
- advance time to the 24-hour boundary and prove a new verification occurs.

The live demo did save and reload a reflection, and source inspection shows a
24-hour cache. Those checks do not satisfy the required tagged sandbox test.

### L1 — The 1–20 quantitative claim is not tested at 1 or 20

`bounded-daily-set` claims the chosen **1–20** limit, but its tagged test sets
only 2 (`tests/claims.spec.ts:38-53`). An untagged Vitest check covers 1 and 20,
and independent live keyboard checks reached both values. The supplied claims
contract requires the numbers to be measured by the tagged claim test itself.

### L2 — The “all cards” CSV claim does not test an archived card

`csv-export` promises all cards, and Data controls makes this explicit as
“active and archived cards.” The tagged test exports five active sample cards
without archiving one first (`tests/claims.spec.ts:86-99`). Independent live
testing confirmed that an archived card and its reason are present in the CSV,
but the declared claim command would not catch loss of archived rows.

### L3 — Two negative landing-page promises are absent from the claims registry

The landing page says Quiet Loop has no generated lessons or account
(`src/main.ts:111-116`). `no-engagement-mechanics` covers streaks, feeds, push
notifications, and extra cards, but neither its registry text nor its tagged
test covers generated lessons or accounts. Source and network inspection found
neither feature; the issue is missing claim coverage.

### L4 — The one-card boundary displays “1 cards”

Set **Cards per day** to 1 with the keyboard. The adjacent output reads
**1 cards**. Both initial rendering and the input handler always use the plural
(`src/main.ts:172` and `src/main.ts:646`). The review summary uses the correct
singular, so this is limited to the setting output.

## Declared claim commands

Every command below ran separately from detached clean checkout
`8475c05e6e07c761ec5cde981670c453ac83d925` after `npm ci`. Each command
passed its one selected browser test.

| Claim | Command result | Coverage result |
| --- | --- | --- |
| `demo-sandbox` | PASS | Complete |
| `bounded-daily-set` | PASS | Incomplete at the stated 1 and 20 boundaries (L1) |
| `device-local` | PASS | Complete for the free core |
| `offline-reload` | PASS | Complete |
| `csv-export` | PASS | Incomplete for archived cards (L2) |
| `json-backup` | PASS | Complete for export/import; does not independently prove deletion (M1) |
| `archive-restore` | PASS | Complete |
| `paid-reflections` | PASS | Incomplete for save/privacy/24-hour expiry (M2) |
| `no-engagement-mechanics` | PASS | Its registered wording passes; broader landing copy is unlisted (L3) |

There is exactly one `@claim:<id>` occurrence for each of the nine registered
IDs. The count of untested claims is five: deletion, the boundary portion of
`bounded-daily-set`, the archived-row portion of `csv-export`, the unproved
portion of `paid-reflections`, and the generated-lessons/account landing
promise.

## Clean checkout and build

Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2.

- `npm ci`: passed; 43 packages installed; 0 vulnerabilities.
- `npm test`: 4/4 passed.
- `npm run build`: passed and produced `dist/`.
- `npm audit --audit-level=moderate`: passed with 0 vulnerabilities.
- `npm run test:e2e`: 19/19 passed against the local production server.
- Live `npm run test:e2e`: 18 passed and the deployment-dependent update test
  skipped as designed.
- All nine exact commands from `.factory/claims.json`: passed individually.
- Build output: JS 34.28 KB raw / 11.25 KB gzip; CSS 14.45 KB raw / 3.95 KB
  gzip; hero WebP 27.66 KB; no font files.

## Live browser and accessibility checks

- Factory URL verifier: 200 in 621 ms; correct title and `lang`; one `h1`;
  `main`; alt text; labelled buttons; no console errors.
- Playwright axe 4.11: zero violations on fresh phone and desktop home pages,
  the reachable dark archive dialog, Privacy, Terms, and the designed 404.
- Fresh phone and desktop pages made no third-party request before the demo.
- Keyboard: skip link, route focus, range Home/End, archive validation, and
  controls worked. The archive reason retained focus after invalid submission.
- Mobile: prior short wordmark/footer targets are now at least 44 px. The
  visible weekly-plan switch worked by pointer and persisted after reload.
- Reduced motion and 200% text checks passed in the live regression suite.
- Lighthouse mobile: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; FCP 1.1 s, LCP 1.4 s, TBT 0 ms, CLS 0.

The standalone axe CLI could not start because its downloaded ChromeDriver was
for Chrome 152 while the worker's pinned browser is Chrome 145. The required
alternative Playwright axe integration ran successfully and reported zero
violations.

## Product paths

- Demo: five realistic Spanish cards appeared in one click. The persistent
  **Demo — sample data, nothing is saved** label survived navigation. Archive,
  reset, and **Start for real** worked. A real card was unchanged by demo work.
- Normal use: add, edit, refresh persistence, reveal, review tomorrow, review
  again, archive with reason, restore, weekly note, and delete all worked.
- Invalid input: native required fields, whitespace-only cards, a missing
  archive reason, an invalid license, and a malformed structured import all
  failed safely with recoverable guidance.
- Boundaries: 1 and 20 were reachable by keyboard; the setting persisted.
  The 1-card grammar defect is L4.
- Recovery: notice expiry preserved a draft and modal; bad imported records
  did not replace sample cards; canceling deletion retained data.
- Offline: the live demo reloaded with its sample and offline notice in a
  dedicated browser context after a legal-page visit.
- Update: the controlled local waiting-worker test passed by pointer. The
  earlier candidate handoff records a real live waiting-worker activation.
  The current live `sw.js` is byte-identical to the candidate v4 worker. A new
  deployment was not authorized for this independent report.

## Routes, deployment, privacy, and billing

- `/`, `/demo`, `/cards`, `/plan`, `/shelf`, `/about`, `/privacy/`, `/terms/`,
  metadata assets, sitemap, and robots returned 200. Route titles and one-h1
  structure passed. Back navigation restored the prior route and heading.
- An unknown path returned the expected HTTP 404 with the designed page,
  correct title, one `h1`, footer, and links home. This is not a defect.
- All 17 publicly served build files are byte-for-byte identical to the fresh
  build. `staticwebapp.config.json` is deployment configuration and is not a
  public artifact. The only repository change after implementation SHA
  `2c9f254` is report-only `.factory/handoff.md`.
- Live responses have CSP, Permissions-Policy, COEP, COOP, CORP, frame denial,
  two-year HSTS, correct manifest MIME, immutable hashed-asset caching, and a
  no-cache service worker.
- The production buy link reached hosted Dodo checkout for **Calm Language
  Routine**, $12.00 USD, one-time. An invalid license returned `valid:false`
  with `Cache-Control: no-store` and did not unlock reflections.
- This is a static local-first PWA. Backend tenant isolation, SQLite restart
  persistence, server health, and product-backend 429 handling do not apply.
  The earlier independent billing-gateway burst check recorded 429 responses
  with `Retry-After`; it was not repeated to avoid needless external load.
- Runtime AI is not appropriate: generated lessons are an explicit non-goal,
  and the core review job does not need study text sent to a model.

## Earlier findings

Every finding in `.factory/verification.md` is resolved in the reviewed live
candidate:

| Earlier finding | Current evidence |
| --- | --- |
| H1 global click handling | Disclosure/dialog/theme regression passed live |
| H2 dark contrast | Dark dialog axe run has zero violations |
| M1 pointer-blocked update | Controlled pointer update passed; prior real live update recorded |
| M2 notice expiry data loss | Draft and dialog remained after 4.8 seconds |
| M3 invalid structured import | Rejected atomically; sample count unchanged |
| M4 short asset caching | Hashed JS/CSS return one-year immutable caching |
| M5 short touch targets | 390 px regression reports at least 44 px |
| L1 whitespace cards | Rejected with a focused, announced correction |
| L2 manifest MIME | `application/manifest+json` live |
| L3 response policies | Required security headers present live |

## Decision

**FAIL — 6 findings and 5 untested claims.** No product code was changed during
verification. The product can pass only after the public claims are fully
registered and proved by their tagged tests, and the one-card output is
corrected and covered.
