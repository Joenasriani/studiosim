# StudioSim Vercel install fix - Node 20

This package avoids the Vercel Node 22 + npm 10 install crash path.

## Why

The failing deployment died during `npm ci`, before Next.js started building:

```text
npm error Exit handler never called!
```

That is an npm CLI crash, not a StudioSim route/runtime error. The Vercel log showed Node `v22.22.2` and npm `10.9.7`. This fix pins Vercel to Node 20.x, removes the npm 11 engine requirement, and keeps `npm ci` for lockfile-consistent installs.

## Vercel settings

Framework Preset: Next.js
Root Directory: ./
Install Command: npm ci --no-audit --no-fund --prefer-online
Build Command: npm run build
Output Directory: leave empty
Node.js Version: 20.x

## Do not set

Do not set Node 22.x or 24.x for this package until npm install reliability is confirmed.
