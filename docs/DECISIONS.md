# Decisions

Newest first. D-### are my design calls where BRIEF.md is silent; U-### are director's notes.

- D-012 Map authored as two 70x35 ASCII layers of 20 m tiles (type, ground level) plus hand-built set pieces and tunnel polylines; main streets are tile-wide, alleys come from splitting building tiles. Why: a real, learnable, hand-designed layout that stays cheap to edit.
- D-011 Landmark moves for play: Li Wei's construction site placed west of Jiaochangkou beside the Line 2 beam; the hospital between Jiaochangkou and Jiefangbei; Dongshuimen Bridge compressed to a 300 m span; the cableway to about 320 m; Qiansimen Bridge given a collapsed span (vantage point, not a route).
- D-010 The underground escape runs west along metro Line 1 under the Eling border wall (Yuzhong is joined to the mainland on the west), not under a river. Why: realistic geography and a land border that makes the wall meaningful.
- D-009 One spare HV fuse in the substation powers either the cableway or the metro pumps; a second sits in the tier-4 Raffles hub. Why: the shared, scarce component the brief asks for, forcing a choice.
- D-008 His father Li Guorong was an electrician at the Xinhua Road substation; his badge in the family flat is one way into it. Why: ties the story to a site and gives the player a found key with a cost (camera at the gate).
- D-007 Patrol drones fly 6 real minutes per battery and recharge 2 minutes; movement and combat run in real seconds, schedules on the game clock. Why: learnable coverage gaps at a scale the player notices.
- D-006 Unaware units' poses are pure functions of game time, so sleep is a cheap time skip and timings are exactly learnable.
- D-005 Collision is axis-aligned boxes and ramps in a uniform grid with per-axis sweeps; buildings and tunnels are carved out of solid boxes. Why: deterministic, headless, simple, fast; the city is stylized to axis-aligned blocks (decor can rotate).
- D-004 Gravity 9.81 m/s^2 and jump take-off 3.0 m/s: with sprint 7 m/s this clears about 4.8 m including the body's width, matching the brief's 4.5 m.
- D-003 Puppeteer's own Chrome download works here; smoke tests use it with SwiftShader. fonts-noto-cjk was installed with apt for Chinese text in screenshots (session-only; the director's browser uses system fonts).
- D-002 Fixed tick 60 Hz; units think at 10 Hz staggered. Sim state is one plain JSON object so saves are a straight serialization.
- D-001 Pinned toolchain: TypeScript 5.9, Vite 6, Vitest 3, three.js 0.186, Puppeteer 24+. Known-stable majors over the newest.
