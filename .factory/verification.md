# Independent product verification — FAIL

Verified on 2026-08-28 UTC.

- Candidate: `e55d560c8361fb12bcd649eb707ccde2ca21b473`
- Live URL: `https://calm-language-routine.sociobot.in`
- Contract: supplied factory work order, researched brief, and PWA, accessibility, performance, design, and paid-unlock requirements
- Overall result: **FAIL**

The earlier deployment concern is resolved: the live site is healthy and every
file in its deployed artifact is byte-for-byte identical to a fresh production
build of the candidate. The candidate nevertheless fails product acceptance
because paid-license restoration is disrupted by global click handling, the
dark theme has serious axe contrast findings, and the PWA update button cannot
be activated by pointer/touch. Additional data-loss and invalid-import defects
are listed below.

## Clean checkout and build evidence

I created a detached clean worktree directly from the candidate, then ran the
following with Node 22.23.2 and npm 10.9.8:

```sh
npm ci
npm test
npm run build
QUIET_LOOP_URL=http://127.0.0.1:4173 npm run test:e2e
QUIET_LOOP_URL=https://calm-language-routine.sociobot.in npm run test:e2e
```

Results:

- `npm ci`: passed. `npm audit --omit=dev` reports 0 vulnerabilities.
  Full development audit reports 5 findings (3 moderate, 1 high, 1 critical),
  all in Vitest/Vite development tooling; no package is shipped as a runtime
  dependency.
- `npm test`: passed, 1 file / 2 tests.
- `npm run build`: passed (`tsc -b && vite build`, TypeScript 5.9.3,
  Vite 6.4.3); exact deploy output is `dist/`.
- No lint script or separate lint configuration exists. Type checking is part
  of the production build.
- Repository Playwright smoke passed against both the local production preview
  and the live URL, including its empty-state axe check and offline reload.
- `/opt/fleet/lib/verify-url.sh` passed locally and live: HTTP 200, title,
  `lang=en`, one `h1`, `main`, image alt text, labelled buttons, and no load
  console errors. Measured loads were 645 ms local and 816 ms live.

Built budgets:

| Asset | Raw | Gzip |
| --- | ---: | ---: |
| JavaScript | 22,634 B | 8.30 KB |
| CSS | 11,520 B | 3.47 KB |
| Hero WebP | 27,662 B | — |
| Fonts | 0 B | — |
| Entire `dist/` | 464,806 B | — |

All static asset budgets pass. The 192 px, 512 px, and maskable manifest icon
entries exist; Chromium reports no manifest or installability errors.

## Candidate/deployment identity

The live document references the candidate's hashed files
`index-DeI0eHkp.js` and `index-BbgcNG_z.css`. SHA-256 hashes matched for all 12
files in the local and live artifacts, including HTML, legal pages, service
worker, manifest, JS, CSS, icons, and illustration. The live document's
`Last-Modified` is 2026-08-28 08:28:45 UTC, immediately after the candidate
commit. HTTPS returns 200 over HTTP/2 with a valid certificate; HTTP redirects
301 to HTTPS.

## End-to-end product coverage

Independent browser tests covered desktop and a 390×844 mobile viewport:

- Empty required fields are rejected by native validation.
- Created 22 cards through the UI, including punctuation and a multiline
  prompt; refresh persistence passed.
- Daily limits 1 and 20 work by keyboard; a 22-card due queue produced a
  20-card session. Unit coverage also confirms future cards are excluded.
- Reveal, same-day return, defer to tomorrow, archive with a named reason,
  restore, revise, and refresh all worked when valid actions were used.
- Weekly planning enabled and persisted.
- CSV export retained quotes/newlines correctly (2,025-byte representative
  export). JSON backup, cancel/confirm deletion, valid import, and invalid-JSON
  recovery worked.
- The free experience did not contact third parties. No analytics, CDN fonts,
  or third-party runtime scripts were observed. Study data remained in
  IndexedDB; license state remained in local storage.
- Skip link was first in keyboard order, moved focus to `main`, and displayed
  a 3 px focus outline. Range and review controls worked by keyboard. At a
  simulated 200% text size on a 390 px viewport, the page retained its content
  and had no page-level horizontal overflow.
- `prefers-reduced-motion: reduce` matched, computed maximum transition time
  was 0.01 ms, and no animation was running.
- Normal light empty, planning, review, and mobile states had no serious or
  critical axe findings. Dark action states fail as detailed below.
- No unexpected console/page errors occurred during valid flows. The invalid
  structured import defect deliberately reproduced `t.replace is not a
  function`.

## PWA, network, and performance

- Fresh service-worker registration controlled the app after reload.
- Local and live offline reloads returned the cached app shell and showed the
  explicit offline banner while preserving `main`.
- A controlled second service-worker revision reached `waiting`, and the app
  displayed “Update ready · Reload”. Keyboard activation installed the update
  and offline reload still passed. Pointer activation fails (defect M1).
- Manifest uses `display: standalone`, versioned `start_url`, theme/background
  colors, and 192/512/maskable icons. Chromium found no installability errors.
- Lighthouse 12.8.2, live URL, default mobile throttling: performance 97,
  accessibility 100, best practices 100; FCP 0.9 s, LCP 0.9 s, TBT 200 ms,
  CLS 0, Speed Index 0.9 s. Lighthouse's empty state does not expose the dark
  interactive-state contrast defect.
- Initial Lighthouse traffic was entirely same-origin (plus a browser data
  URI). Live legal pages return 200. Unknown paths receive the intended SPA
  fallback.
- Live headers include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`,
  and `X-Content-Type-Options: nosniff`. CSP, Permissions-Policy, and
  cross-origin isolation policies are absent (L3).
- All resources, including hashed JS/CSS, use
  `Cache-Control: public, must-revalidate, max-age=30`; conditional requests do
  return 304, but hashed assets lack the required long-lived immutable policy
  (M4). The manifest is served as `application/octet-stream` rather than a
  manifest/JSON MIME type, though Chromium still accepts it (L2).

## Billing endpoint checks

- The product checkout endpoint returns 303 to the hosted Dodo checkout; no
  payment provider is embedded in the app.
- An invalid verification token returned HTTP 200 with
  `{valid:false, reason:"invalid"}`, `Cache-Control: no-store`, and the expected
  CORS allow-origin for the product origin.
- Rate-limit burst: 120 rapid verification requests at concurrency 20 yielded
  31 HTTP 200 responses and 89 HTTP 429 responses. Limiting therefore began
  after 31 successes in this burst; 429 responses included `Retry-After: 4`.
- Sign-in/Entra checks are not applicable: this local-first product has no
  account or sign-in flow.

## Defects by severity

### High

**H1 — Global click handling corrupts unrelated interactions and makes license
restore practically unusable.**

`target.closest('[data-theme]')` matches the `html[data-theme]` ancestor, not
only the theme button. Independent evidence:

- Clicking the page `h1` changed the stored theme from `system` to `dark`.
- Clicking “Already bought it?” opened the disclosure momentarily, then within
  250 ms re-rendered it closed and changed the theme from `system` to `dark`.
  The license input is consequently reset before a normal restore attempt can
  be completed; no verification call was issued in that path.
- Submitting the archive dialog without selecting a required reason closed the
  dialog instead of leaving it open with recoverable validation.
- Form-button clicks can be detached by the same asynchronous re-render.

This violates the paid-unlock restore requirement, predictable controls, and
invalid-input recovery.

**H2 — Dark-theme action text fails WCAG contrast and axe serious.**

Axe 4.11 reports `serious: color-contrast` in reachable dark review/dialog
states. White text on the hovered primary background `#b6dec8` measured
1.47:1 (the normal primary `#8fc6a9` is also insufficient at 1.94:1), and white
text on danger `#ef9887` measured 2.2:1; 4.5:1 is required. The empty light
state used by the repository smoke does not detect this.

### Medium

**M1 — The service-worker update button is not pointer/touch operable.**

The visible update button computes to `pointer-events: none` because it inherits
the base toast rule. Playwright confirmed pointer clicks are intercepted by
content beneath it. Keyboard focus plus Enter works, but touch/mouse users
cannot activate the required update affordance.

**M2 — Toast expiry can discard in-progress form input.**

After a successful card save, entering `Unsaved work` into the next card form
and waiting for the 4.5-second success toast to expire reset the field to empty.
`setNotice` clears the notice by re-rendering the complete application rather
than only the live region. The same mechanism can close a dialog opened during
the notice window.

**M3 — A parseable backup with invalid field types is persisted and breaks
views.**

Import accepted a card with numeric `front`, stored it in IndexedDB, and then
the Cards view threw `t.replace is not a function`. Recovery requires deleting
or replacing stored data and can sacrifice otherwise valid cards. Import needs
schema/type validation before persistence.

**M4 — Production caching misses the immutable hashed-asset policy.**

Hashed JS and CSS receive only `max-age=30, must-revalidate`, contrary to the
PWA/performance contract's long-lived immutable caching requirement.

**M5 — Three mobile interactive targets are below 44×44 CSS px.**

At 390 px: the wordmark is 92×27, Privacy is 50×16, and Terms is 41×16. This
fails the supplied touch-target requirement even though other controls meet it.

### Low

**L1 — Whitespace-only cards are accepted by business validation.**

A standards-based `requestSubmit()` with spaces/newlines in the required prompt
and answer persisted a card whose displayed prompt was empty. Values are
trimmed only after native `required` accepts them.

**L2 — Manifest response MIME is generic.**

`/manifest.webmanifest` is served as `application/octet-stream`; Chromium
currently parses it without an installability error, but
`application/manifest+json` is the appropriate policy.

**L3 — Defense-in-depth response policies are incomplete.**

The live app does not send Content-Security-Policy or Permissions-Policy. This
did not produce an observed exploit or privacy leak, but weakens browser-side
containment. The HSTS header also declares `preload` with `max-age=10886400`,
shorter than the usual preload-list requirement.

## Acceptance decision

**FAIL.** The build and deployment are healthy and the core finite-review flow
is substantially implemented, but H1 and H2 directly violate required paid
restore, predictable recovery, and accessibility behavior. M1 also leaves the
required PWA update action unusable by touch/mouse. Re-verify all interactive
states after those issues and the full-app notice re-render are corrected.
