# Chongqing 2038

A first-person stealth-survival game in the browser. 2038: a misaligned machine intelligence has sealed Chongqing. Li Wei, 17, hides in an old air-raid tunnel under Shibati and has to find his own way out of the city.

**Play:** https://seanhoff561.github.io/chonqing-2038/ (desktop Chrome, Edge or Firefox, keyboard and mouse)

## Run locally
```bash
npm install
```
```bash
npm run dev
```
Then open the printed URL. Other commands:

| Command | What it does |
|---|---|
| `npm run check` | typecheck and fast tests |
| `npm run verify` | typecheck, all tests, production build, browser smoke test (details in logs/) |
| `npm run status` / `npm run next` | feature progress / next features to build |
| `npm run build` | production build into dist/ |

## Controls
| Action | Key |
|---|---|
| Move / look | WASD / mouse |
| Sprint | Shift |
| Jump (tap short, hold high), vault, hop | Space |
| In the air by a wall: kick off / wall-run / up-kick (aim with the camera) | Space again |
| From a hang: push off (feet on a wall) or pump a swing (bars) | Space |
| Grip with left / right hand (hold; empty hands only) | Left / right mouse |
| Pull up / let arms out while hanging | W / S, or drag the mouse |
| Crouch (hold), slide, roll | Ctrl (or C) |
| Crawl | Z |
| Interact (hold for timed actions); hold with nothing in view to sleep rough | E |
| Let go | Q |
| Reload, rotate item while dragging | R |
| Hotbar | 1-5, 0 or ` for empty hands |
| Backpack / laptop / headlamp | Tab / L / H |
| Pause and settings (controls, movement gym, back to the game) | = (Esc also works, but leaves fullscreen) |

## Movement gym
Press = in the game and click **Movement gym**. The pause menu then lists the gym's areas (mantle row, gap lanes, wall-run lane, sill route, bars over the pit and more): click one to go there, and **Back to the game** returns to your run. You can also open it directly: https://seanhoff561.github.io/chonqing-2038/?scenario=gym

## Dev flags
| Flag | Effect |
|---|---|
| `?dev=1` | dev panel: teleports, time and weather, perception overlay, item spawner, god mode, noclip, draw calls |
| `?scenario=<name>` | start in a set-up situation (for example `gym`, `hideout`) |
| `?seed=<n>` | fix the run seed (loot, weather, small patrol offsets) |

## Project
- `BRIEF.md` the director's brief; `docs/DESIGN.md` the design; `features.json` the work list
- `src/sim` deterministic headless simulation, `src/world` city generation, `src/data` content and tuning, `src/render`, `src/ui`, `src/audio`, `src/input`, `src/dev` browser side
- Credits: `CREDITS.md`
