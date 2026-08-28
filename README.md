# Quiet Loop

Quiet Loop is a calm, local-first language review ritual for adults who want a
sustainable ten-minute practice without streaks, feeds, notifications, or an
endless queue. It is a static PWA: cards, daily sessions, archive reasons, and
optional reflections stay in the browser by default.

## What it does

- Creates one bounded daily set from cards due today.
- Lets a learner reveal an answer, keep a card for tomorrow, let it return
  later in the same small set, or archive it with a reason.
- Supports optional weekly planning, dark/light/system appearance, CSV export,
  full JSON backup/import, and device-local deletion.
- Works offline after the first successful load.
- Offers an optional $12 one-time Quiet Shelf unlock for private weekly
  reflections. The core practice and all data-export controls stay free.

## Run locally

Requires Node 20+ and npm.

```sh
npm install
npm run dev
```

Open the URL Vite prints. Use `npm test` for the unit tests and `npm run build`
for a production build. The deployable static output is `dist/`, with
`dist/index.html` at its root.

## Privacy and deployment

No third-party fonts, tracking scripts, or analytics are loaded. Browser
IndexedDB holds study data; license tokens, when supplied, are kept in local
storage and checked against Sociobot’s license endpoint at most daily.

Deploy the contents of `dist/` as a static site with SPA fallback to
`index.html`. `/privacy/` and `/terms/` are physical static pages. The service
worker caches the app shell for offline use.

## License

MIT. See [LICENSE](LICENSE).
