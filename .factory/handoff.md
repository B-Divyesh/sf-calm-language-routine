# Quiet Loop handoff

## What shipped

- A Vite + TypeScript static PWA in `dist/` with a device-local IndexedDB model
  for language cards, sessions, settings, archive reasons, and optional
  reflections.
- A bounded daily session: cards due today are selected once to the chosen
  1–20-card limit. The learner can reveal, defer to tomorrow, let a card return
  later in the same finite set, or archive it with a reason. Archived cards can
  be restored.
- Optional weekly planning, full JSON backup/import, CSV export, and explicit
  local-data deletion. No account, notifications, feed, tracking, CDN, or
  third-party font is used.
- Offline support via manifest, 192/512/maskable icons, app-shell service
  worker cache, offline fallback, and an update-ready reload affordance.
- The optional $12 one-time Quiet Shelf unlock follows the Sociobot license
  contract: checkout link, URL token capture, local restore field, optimistic
  local first paint, daily verification, and a quiet revoked-license notice.
- `/privacy/` and `/terms/`, README, MIT license, generated-image provenance,
  and a paper-cut diorama visual thesis in `.factory/design.md`.

## Verification

Run from a clean checkout:

```sh
npm install
npm test
npm run build
npm run dev -- --host 127.0.0.1
npm run test:e2e
```

Verified on 2026-08-28:

- `npm test`: 2/2 unit tests pass.
- `npm run build`: passes; deploy output is exactly `dist/` with
  `dist/index.html` at its root. Built JS is 22.63 KB raw / 8.30 KB gzip;
  CSS is 11.52 KB raw / 3.47 KB gzip; hero WebP is 28 KB.
- `npm run test:e2e`: Playwright at a 390px viewport completes add → bounded
  review → answer → archive-with-reason → refresh, then reloads the cached app
  shell while offline. It also runs axe-core with no serious or critical
  violations on the empty state.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:5173/ <evidence-dir>`:
  200 response; title/lang/one h1/main/alt/button checks all passed; no console
  errors; measured local desktop load was 625ms.
- Lighthouse on the production preview (mobile default, Chromium) scored 100
  performance and 100 accessibility, with LCP 1.5s, CLS 0, and TBT 60ms.

## Known gaps / next steps

- Static hosting should provide an SPA fallback to `index.html` for internal
  app routes; the legal pages are physical directories and need no fallback.
- Product registration and the production checkout price are factory-side.
  The UI uses the required slug endpoint and shows the planned $12 one-time
  price; confirm that amount when registering the product.
