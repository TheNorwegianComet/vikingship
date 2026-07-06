---
name: verify
description: Build, run, and end-to-end drive the viking ship site headlessly to verify changes at the browser surface.
---

# Verify the drakkar site

The surface is a WebGL2 page: a drivable viking longship. Verification means
rendering it in headless Chromium and actually sailing it.

## Recipe that works

```bash
npm run build
npm run preview &            # serves dist/ on http://localhost:4173
# Playwright (package only, browsers are preinstalled at /opt/pw-browsers):
#   npm install playwright   — in a scratch dir, NOT in this repo's package.json
node scripts/e2e-drive.mjs   # needs `playwright` resolvable (e.g. NODE_PATH=<scratch>/node_modules)
```

`scripts/e2e-drive.mjs` launches Chromium with
`executablePath: /opt/pw-browsers/chromium-*/chrome-linux/chrome` and flags
`--use-angle=swiftshader --enable-unsafe-swiftshader` (WebGL2 works under
SwiftShader). It clicks SET SAIL, drives with real key events, and asserts via
`window.__game` (exposed by `src/Experience.js`): forward drive, steering yaw,
braking, R-reset, runestone panel triggers, ramp jump, zero console errors.
Screenshots land in `shots/` next to the script's cwd; `?photo=hero|side|front|action`
URL params give fixed beauty-shot cameras with the intro overlay skipped.

## Gotchas

- **SwiftShader is slow (~10–20 fps), so the sim lags wall-clock time.** Never
  assert on fixed `waitForTimeout` distances — poll game state until a condition
  or generous timeout (`holdUntil` in the script).
- Physics runs on a flat plane; waves are visual only. Positions/speeds read from
  `window.__game.ship.body` are ground truth.
- Ship forward is +z, steering left is +yaw (`ship.getYaw()`).
- The letter rows scatter forward when smashed — keep spawn-lane tests away from
  the ramp lane at x=-26 or debris can block the climb (this happened; that's why
  the ramp is off to the side).
