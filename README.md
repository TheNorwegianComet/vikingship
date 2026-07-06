# ⚔️ DRAKKAR — a viking ship you can drive

A tribute to [bruno-simon.com](https://bruno-simon.com) — the legendary drivable-car
portfolio — except the car is a **viking longship**. Same idea underneath: a
raycast-vehicle physics rig you steer with WASD, a low-poly world full of things to
smash, and portfolio sections you unlock by driving up to them. The wheels are just
invisible, and the sea does the rolling.

![The drakkar at sea](docs/screenshot.png)

## Sail it

```bash
npm install
npm run dev
```

| Input | Action |
| --- | --- |
| `W A S D` / arrow keys | sail & steer |
| `SPACE` | drop anchor (brake) |
| `R` | reset the ship |
| touch | joystick, bottom left |

Things to do out there:

- **Smash the golden VIKING SHIP letters** — they're physics bodies, like Bruno's.
- **Sail to the three islands** — each runestone opens a panel (Projects / About / Contact).
- **Hit the wooden ramp** and jump the sea serpent's back.
- Topple the crate pyramid, scatter the barrels, annoy Jörmungandr.

![Smashing through the letters](docs/action.png)

## How it works

- **No model files** — the entire ship (lofted hull, dragon figurehead, striped sail,
  shield row, rowing oars, steering oar) is built from three.js primitives in
  [`src/ShipModel.js`](src/ShipModel.js).
- **It really is a car** — [`src/Ship.js`](src/Ship.js) runs a
  [cannon-es](https://github.com/pmndrs/cannon-es) `RaycastVehicle` with four invisible
  wheels on a flat, invisible plane, exactly like the original site's car.
- **The waves are a lie** — [`src/Ocean.js`](src/Ocean.js) defines one wave field used
  by both the water vertex shader and the JS that bobs/tilts the ship and props, so
  visuals stay in sync while physics stays flat. Water normals come from screen-space
  derivatives for the faceted low-poly look.
- **The crew rows when you throttle**, the sail billows with speed, and the steering
  oar answers the helm.

## Make it yours

- Panel copy (Projects / About / Contact) lives in [`src/ui.js`](src/ui.js).
- World layout — islands, letters, ramp, serpent — lives in [`src/World.js`](src/World.js).
- `npm run build` produces a static `dist/` you can host anywhere (relative base path,
  GitHub Pages friendly).

## Dev

```bash
npm run dev       # vite dev server
npm run build     # production build to dist/
npm run preview   # serve the build on :4173
```

An end-to-end Playwright drive (renders headless, sails, steers, brakes, jumps the
ramp, opens the runestone panels) lives in [`scripts/e2e-drive.mjs`](scripts/e2e-drive.mjs) —
see [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md) for how to run it.
