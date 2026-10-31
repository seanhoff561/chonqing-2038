# Progress

<!-- status -->
**Status:** building M4. Next: M4-22d Visual pass: roofs, QR codes, paving, road paint, grates (U-049).
Features done: 182 / 301 | Last done: M4-22b
<!-- /status -->

## Log
- Phase 0: scaffold, DESIGN.md, features.json (204), tools, docs.
- M1 (folded, 50 features): the deterministic sim, box and ramp collision and carving, player movement (sprint, crouch, slides, vaults, Space hops and the hand mantle, wall-runs and kicks, dynos, hangs and traverses, pipes and ladders, bar swings and laches, wall cling), the force-limited hand grab and grip endurance, the first-person camera, arms and 3D hands with their poses, movement sounds, the movement gym and the dev panel.
- M2 (folded, 24 features): the clock, sky and day phases; health, bleeding, limb injuries, hunger, thirst, fatigue, healing and body feedback without meters; the item database, grid inventory, backpack UI, hotbar, encumbrance and eating; the hideout and its vent view, hold-E interactions, containers and stash, seeded loot, doors, sleep, starting supplies, the ironman save and permadeath.
- M3 (folded, 93 features): Yuzhong at 1:1 from the real map and ground (OSM streets, landmarks, terraces, stair streets, the rivers); the building generator with enterable warrens, furnished rooms, basements and sewers, stair cores and roof huts, monotone blocks and towers; Shibati's old quarter and stair, Jiaochangkou, the Line 2 beam and train, the Grand Tunnel, the metro and the underground city; climbables, hides, crossings and the ant-hill route network with grappling-hook caches; foliage, ruins, street props and dressing; Chinese signage with neon, banners, QR stickers and LED tickers; the sky, weather, night and the muted look; chunked meshes, far stand-ins and draw-call budgets; graphics presets; the sim light map; district teleports and scenarios; the Li family flat with the voicemail; the Yangtze riverfront and its wall; three layers of routes between the district's key points.
- M8-25 Intro screenplay for AI video (U-018): intro screenplay and shot list for AI video, with trailer cut
- CI: the site deploys every build that compiles, tests in their own job (the M3-57/58/66/67 deploys had failed on time limits); U-034 withdrawn by the director pending their testing.
- U-034 logged (playtest of M3-67): M3-66 reopened, M3-36 and M3-37 amended, M5-33 player-set ziplines added, Q-008 asked.
- M4-01 Unit framework and scheduled patrols: units as plain data on beats with pauses and hours, poses a pure function of the game time; beats under the ground and off the streets into alleys and buildings
- M4-01b Convoys as units: squads out of the factory gates in staggered formation, bounding, a pair peeling off into an alley
- M4-02 Navigation graph and pathing: Units on their beats, columns out of the factory as units, and the machines' nav graph with A*
- M4-03 Vision perception: Vision perception: five body points in a unit's cone with clear sight, light with night-vision floors, posture, motion, falloff and weather
- M4-04 Awareness and investigation: Awareness and investigation: Suspicious units walk to where they saw him, look about and go back; beats shift by day and after sightings
- M4-05 Hearing: Hearing: noises heard within radius x hearing, x0.6 through walls; heard noises send units to look, hostile ones are remembered by the hive
- M4-06 Thermal senses at night: Thermal sight at night: heat seen whatever the light within thermal range; the mylar blanket, wetness and deep water hide it
- M4-07 Cameras: Cameras: fixed, sweeping and smart-lamppost cameras all over the city, sweepers that can be timed, beeping
- M4-08 Patrol drones and docks: Patrol drones and docks: 6-minute flights from rooftop docks, 2 minutes charging, a learnable gap in their cover
- M4-09 Quadrupeds: Quadrupeds: 3 m/s patrols and 8 m/s chases on the nav graph over stairs and metre jumps, no climbing, whining servos
- M4-01c Memory: stream the city's near layers (found in the M3 verify): Memory: the city's near layers streamed by 256 m cell, the machines in one batch; heap 4.4 GB to 2.8 GB
- M4-10 Humanoids: Humanoids: walk 2.5, run 4.5, stairs only, armoured and armed; they call each other, flank, take cover and search hiding places one by one
- M4-11 Turrets, motion sensors, tripwires and acoustic sensors: tripwires, motion sensors, acoustic sensors and turrets that fire when Engaged; hearing hears every noise of a tick; humanoids scan 8 s again
- M4-12 District alert state machine: each district's alert: Unaware, Suspicious, Engaged, Searching and Heightened
- M4-13 Hivemind broadcast: Engaged machines tell the network after their kind's delay; the last known position follows him; the word spreads through the district and 300 m beyond
- M4-14 Convergence and escalation: machines near him converge, docks launch hunter drones every 20 s, the garage's squad after 45 s
- M4-15 Search: the search: a growing disc ahead of him, weighted points, 60% checks of hiding places
- M4-16 Wind-down and Heightened district: the search ends at 150 s; Heightened until 06:00: extra walkers, idle cameras on, awareness x1.3
- M4-17 Silent units: silent machines draw a look after 12 s; out, a machine stays put; a wreck found starts a small search
- M4-18 Enemy fire and wounds: machines fire: rifle bursts, SMG, prod and stun, turret; each hit bleeds and may hurt a limb
- M4-19 Unit damage and weak points: machines' HP and hit zones: blinded, immobilised, shut down, destroyed
- M4-20 Knife, crowbar and takedowns: knife and crowbar blows on the place aimed at; takedowns from behind in 2 s
- M4-21 Pistol: the pistol: hitscan with spread and sway, kick, magazines and reloads, a 150 m hostile noise
- M4-21b Guns made real (U-032): guns made real: the QSZ-92, aiming down the sights with a zoom, recoil, slide and flash; leaning with Q and E
- U-045 fix (a8754f5): the black screen at start (since M4-11 the machines' mesh batch threw at boot) fixed and pushed to main; every page boots clean.
- M4-22 Tracking tags: quadrupeds' tag launchers stick tracking tags that stay until found with an SDR dongle
- M4-22b The hideout in a real alley at the heart of the routes (U-047, U-048): the hideout under a real alley at the heart of the routes, sealed from the underground, a drainpipe up to the roofs
