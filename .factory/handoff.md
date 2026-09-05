# Quiet Loop repair handoff — PASS

## Release

- Live URL: `https://calm-language-routine.sociobot.in`
- Verification date: 2026-09-05 UTC
- Implementation and deployed artifact SHA:
  `2c9f25462b7c529b118fc499cf2f70edeac44bac`
- Handoff documentation body SHA:
  `dbd605b0a34e3c96ea979f385d9fc311edc9be33`
- Previous failed candidate: `e55d560c8361fb12bcd649eb707ccde2ca21b473`
- Previous independent report commit:
  `91d4387a2231714eda89e19dcde7e1f942816305`

The implementation is deployed to the existing one-product Static Web App.
No infrastructure, billing registration, or other product was changed.

## Product outcome

Quiet Loop now lets adult language learners review one fixed daily set, revise
or archive stale cards, export their data, and work offline. The cold first
screen says the job, audience, and first action before scrolling:

- Job: **Review a small language set**
- Audience: adult language learners who want a short routine without streaks
  or an endless queue
- First action: **Try it with sample data**

`/demo` opens five realistic Spanish cards in one click. Its persistent banner
says **Demo — sample data, nothing is saved** and offers **Reset demo** and
**Start for real**. Demo data uses `demo:quiet-loop`; real data uses
`quiet-loop`. Browser tests prove demo actions do not change real cards.

## Earlier findings and disposition

- H1 global click handling: fixed. Theme changes require the theme button.
  Unrelated clicks preserve the theme, purchase disclosure, and archive dialog.
- H2 dark contrast: fixed with separate dark action foreground/background
  tokens. Axe reports no serious or critical issue in the dark review dialog.
- M1 update pointer input: fixed. The update toast accepts pointer input. A
  real live v2-to-v3 update was discovered, clicked, activated, and reloaded.
- M2 notice expiry: fixed. Notices update only their live region. A typed draft
  and open dialog survive the 4.5-second expiry.
- M3 invalid imports: fixed. Every card, setting, session, and reflection is
  validated before one atomic write. Damaged stored records are skipped safely.
- M4 asset caching: fixed. Hashed JS/CSS return one-year immutable caching.
- M5 touch targets: fixed. Wordmark, footer links, navigation, and controls are
  at least 44 CSS pixels high at 390 pixels wide.
- L1 whitespace cards: fixed with trimmed business validation and an announced
  correction message.
- L2 manifest MIME: fixed. Live response is `application/manifest+json`.
- L3 response policy: fixed. Live responses include CSP, Permissions-Policy,
  COEP, COOP, CORP, frame denial, and two-year HSTS.

Additional contract work includes route-aware titles/history/focus, a real
404 response and styled page, sitemap/robots, complete social metadata, an
isolated demo, claims registry, copy audit, and original-art derivatives.

## Clean verification

From a clean dependency install with Node 22.23.2:

```sh
npm ci
npm test
npm run build
npm run test:claims -- --grep @claim:demo-sandbox
npm run test:claims -- --grep @claim:bounded-daily-set
npm run test:claims -- --grep @claim:device-local
npm run test:claims -- --grep @claim:offline-reload
npm run test:claims -- --grep @claim:csv-export
npm run test:claims -- --grep @claim:json-backup
npm run test:claims -- --grep @claim:archive-restore
npm run test:claims -- --grep @claim:paid-reflections
npm run test:claims -- --grep @claim:no-engagement-mechanics
npm run test:e2e
npm audit --audit-level=moderate
```

Results:

- Unit: 4/4 passed.
- Each of the 9 declared claim commands passed separately.
- Full browser suite: 19/19 passed locally.
- Live browser suite: 18 passed; the controlled-update case was skipped in
  that ordinary run because it requires a deployment during the test.
- Separate live update run: 1/1 passed during an actual deployment (56.7 s).
- npm audit: 0 production or development vulnerabilities.
- Build: JS 34.28 KB raw / 11.25 KB gzip; CSS 14.45 KB raw / 3.95 KB gzip;
  hero 27.66 KB; no font files; full `dist/` about 582 KB.
- Local Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.6 s, TBT 0 ms, CLS 0.
- Live Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.4 s, TBT 0 ms, CLS 0.
- Axe CLI 4.11: 0 violations on local and live home/demo pages. Playwright
  also checks the reachable dark review and modal state.
- Factory URL verifier: live 200 in 702 ms, correct title/lang, one h1, main,
  alt text, labelled buttons, and no console errors.
- Offline: live demo reload passed after visiting the legal page, proving the
  legal response cannot replace the app shell.
- Deployment identity: all 18 served artifact files matched the final local
  build; the final v4 service worker was checked again after deployment.
- Headers: live manifest MIME, 404 status, CSP, cross-origin policies, HSTS,
  and immutable hashed-asset caching all match configuration.
- Fresh phone and desktop screenshots are in `/work/.evidence/`.

## Billing

The production checkout redirects to hosted Dodo. The live offer is **Calm
Language Routine**, $12.00 USD, one-time. Public metadata is at
`/work/.evidence/billing-offer.json`. The product stores no provider secret.
Valid and invalid license responses are covered with recorded browser fixtures;
an invalid token never grants the paid form, and a valid daily verdict avoids
a second request after reload.

The earlier independent production check established 31 successful burst
requests before 429 responses with `Retry-After: 4`. This static product has no
backend, tenant, or server-side persistence to restart.

## Known limits

- No paid checkout was completed because no purchaser credential or test-mode
  registration was supplied. Checkout routing and license behavior are tested,
  but a real purchase is still an external billing dependency.
- Lighthouse did not produce a lab INP value because its navigation audit has
  no user interaction. Browser tests exercise pointer and keyboard actions.
- Runtime AI was not added. Generated lessons are an explicit product non-goal,
  and the core review job does not benefit from sending study text to a model.
