# StudioSim Vercel npm install fix

This package changes the install path from open-ended `npm install` to deterministic `npm ci`.

## What changed

- Replaced `latest` dependency ranges with exact versions from the working lockfile.
- Kept `package-lock.json` and aligned its root dependency specs with `package.json`.
- Added `.npmrc` to reduce audit/funding/progress install noise in CI.
- Updated `vercel.json` install command:

```bash
npm ci --no-audit --no-fund --prefer-online
```

## Vercel settings

Use these values in Vercel if the dashboard overrides repo settings:

```text
Framework Preset: Next.js
Install Command: npm ci --no-audit --no-fund --prefer-online
Build Command: npm run build
Output Directory: leave empty
Root Directory: ./
Node.js Version: 22.x
```

## Why

The failed deployment stopped during dependency installation before the app build started. Deterministic install avoids resolving `latest` packages during Vercel deployment and should prevent the npm resolver from hanging/failing in the install phase.
