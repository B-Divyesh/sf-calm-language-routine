# Quiet Loop verification handoff — FAIL

## Decision

**FAIL** for candidate `e55d560c8361fb12bcd649eb707ccde2ca21b473` at
`https://calm-language-routine.sociobot.in`, independently verified on
2026-08-28 UTC.

The deployment-only concern is resolved: the live site returns 200 and all 12
deployed files are byte-identical to a clean `npm run build` of the candidate.
The failure is product-level, not deployment-level.

## Blocking findings

- High: global click delegation matches `html[data-theme]`, so unrelated clicks
  rotate the theme and re-render the app. It closes the purchase-restore
  disclosure before a token can normally be submitted and closes an invalid
  archive dialog instead of allowing correction.
- High: dark review/dialog actions have serious axe contrast failures (1.47:1
  or 1.94:1 for primary states; 2.2:1 for danger text, versus 4.5:1 required).
- Medium: the service-worker update button is visible but has
  `pointer-events:none`; only its keyboard fallback works.
- Medium: toast expiry re-renders the whole app and erased verified in-progress
  card text after 4.5 seconds.
- Medium: invalid structured JSON can be persisted and then crash card
  rendering with `t.replace is not a function`.
- Medium: hashed production assets receive only 30-second revalidation caching,
  and three mobile links/wordmark targets are shorter than 44 px.

Full reproduction evidence, positive coverage, response-policy results, rate
limit threshold, and low-severity findings are in
`.factory/verification.md`.

## Passing evidence

- Clean `npm ci`, 2/2 unit tests, TypeScript production build, and repository
  Playwright smoke passed locally and against live. There is no lint script.
- Live Lighthouse mobile: performance 97, accessibility 100, best practices
  100; LCP 0.9 s, TBT 200 ms, CLS 0.
- Bundles pass: 22.63 KB raw JS, 11.52 KB raw CSS, no fonts, 27.66 KB hero.
- Core create/review/defer/archive/restore/edit, 1/20 limits, planning,
  refresh persistence, CSV, JSON backup/import, and delete flows work with
  valid data.
- Service worker controls the app; local and live offline reload pass.
  Simulated update reaches `waiting` and keyboard activation succeeds.
- No tracking or unexpected outbound requests were observed. Production npm
  audit is clean; five audit findings are confined to development tooling.
- Billing verify CORS/no-store behavior is correct. A 120-request burst at
  concurrency 20 produced 31 successes then 89 rate-limited responses; 429s
  included `Retry-After: 4`. Checkout redirects to hosted Dodo.

## Re-run

```sh
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
QUIET_LOOP_URL=http://127.0.0.1:4173 npm run test:e2e
QUIET_LOOP_URL=https://calm-language-routine.sociobot.in npm run test:e2e
```

After fixes, add regression coverage for unrelated clicks, disclosure/dialog
stability, toast expiry while typing, schema-invalid imports, dark interactive
states, and pointer activation of the update toast. Then repeat live hash,
offline/update, axe-state, headers/cache, and Lighthouse checks.
