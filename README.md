# Quiet Loop

Quiet Loop gives adult language learners one fixed daily review. It avoids
streaks, feeds, push notifications, and an endless queue.

Try the isolated sample at
[calm-language-routine.sociobot.in/demo](https://calm-language-routine.sociobot.in/demo).
The demo contains five realistic cards and never reads or changes real cards.

## What it does

- Uses a chosen daily limit from 1 to 20 cards. A started review does not grow.
- Archives a card with a reason and restores it later.
- Exports all cards as CSV.
- Exports and imports cards, settings, review state, and reflections as JSON.
- Stores study data in browser IndexedDB and makes no third-party request in
  the free core.
- Works offline after the first successful visit.

The optional weekly reflections feature costs $12 USD once. Review, archiving,
CSV export, JSON backup, and deletion remain free.

## Run and verify

Requires Node 20 or newer and npm. From a clean checkout:

```sh
npm ci
npm test
npm run build
npm run test:claims
npm run test:e2e
```

`npm run build` creates the deployable static site in `dist/`. Playwright
1.58.2 is pinned. If its Chromium binary is not already available, run
`npx playwright install chromium` once.

For local development:

```sh
npm run dev
```

For a production preview:

```sh
npm run preview -- --host 127.0.0.1 --port 4173
```

## Privacy and deployment

Real data uses IndexedDB database `quiet-loop`. Demo data uses the separate
`demo:quiet-loop` database. License tokens use namespaced local storage and go
only to Sociobot for validation at most once daily.

Deploy the contents of `dist/` as a static site. The included Static Web Apps
configuration defines deep links, a designed 404, security headers, manifest
MIME type, and immutable caching for hashed assets.

See [Privacy](https://calm-language-routine.sociobot.in/privacy/) and
[Terms](https://calm-language-routine.sociobot.in/terms/).

## License

MIT. See [LICENSE](LICENSE).
