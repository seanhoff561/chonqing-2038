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
| Jump, mantle, vault, wall-run, climb | Space |
| Crouch / slide / roll | C |
| Crawl | Z |
| Interact (hold for timed actions) | E |
| Let go of a ledge, pipe, ladder or rope | Q |
| Use held item / aim or throw | Left / right mouse |
| Reload, rotate item while dragging | R |
| Hotbar | 1-5, 0 for empty hands |
| Backpack | Tab |
| Laptop (Anna) | L |
| Headlamp | H |
| Pause, controls, settings | Esc |

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
