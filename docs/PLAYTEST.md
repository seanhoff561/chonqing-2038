# Playtests for the director

Each request: an id, the build commit, a link to start from, what to try, and what to report. Run locally with `npm run dev` or on the play URL.

## PT-001 M1 movement (build 2a0d48d)
Start: `?scenario=gym&dev=1` (teleport list top left).
Try: sprint-jump the gap lanes (4.5 m should just make it, 5.2 m should catch the far ledge); mantle each ledge row (2.4 yes, 2.6 no); vault the 0.8/1.1 m bars at a run; slide (sprint + C) under the 0.6 m bar; crawl (Z) the 0.6 m gap; wall-run (sprint + Space alongside the wall) across the 6 m lane; run up the 3.5 m wall into a hang and climb; pipe and ladder (E); the drop towers with and without a roll (tap C just before landing); swim in the pool and climb out; hide in the 0.8 m box (E).
Report: does jumping and landing feel weighty but responsive? Is any move hard to trigger or triggering by accident? Camera bob and FOV comfortable? Arms readable when hanging and climbing? Frame rate on your machine (dev panel shows fps).

## PT-002 M1 movement after your notes U-001 to U-005 (build 8fca301)
Start: `?scenario=gym&dev=1`. Teleports: "sill route / smooth wall", "bars over the pit", "ledge traverse", "wall-run lane", "gap lanes".
Try: tap vs hold Space; Ctrl hold to crouch, Ctrl at a sprint to slide and release mid-slide; jump into a wall and use the short cling to kick off (aim with the camera), wall-run (Space again looking along the wall) and up-kick (Space again looking up); climb the sill route with left/right mouse grips, W to pull up, Space to push off up to the next sill; swing on the bars (Space pumps) and let go to lache to the next bar; grab a pipe with one hand at a sprint (it should swing you and slip) and with two (it should stop you); drag the mouse while hanging.
Report: is each move clear to trigger and easy to tell apart (and by sound)? Does one-hand vs two-hand grabbing feel right? Is the cling too long or short? Do the hand sprites read? Mouse-drag direction while hanging: right way round (Q-005)? Any stamina wanted back (Q-004)?

## PT-003 M2 hideout and survival (build e89a973)
Start: no flags (the game now boots into the hideout on day 1), or `?scenario=hideout&dev=1` for the time slider.
Try: look up the vent shaft at night (dev time slider to 23:00); open the stash (E) and drag food into the backpack (Tab); bind items to 1-5 by hovering and pressing a number; eat and drink from the hotbar (left mouse); sleep on the mattress until 06:00, then reload the page and Continue; in dev, drop a few hours of time and watch the screen blur as thirst and fatigue rise; kill yourself with a fall in the gym (`?scenario=gym`, drop tower 9 m twice) to see injuries limit you.
Report: does the hideout feel like an air-raid tunnel? Is the backpack easy to use? Are the body effects (blur, vignette, limp) readable without meters? Anything confusing on the death screen?

## PT-004 M1 hands, held items and pause menu after U-006 to U-008 (build df68cbe)
Start: no flags, then = → "Movement gym" → pick an area. Fullscreen should stay on throughout.
Try: walk and sprint on open floor and watch the hands at the bottom corners; jump and climb (hands reach and grip); press 1-5 with a crowbar, a water bottle and the pistol bound (Tab, hover, number) and look at the two-handed holds; try to grab a ledge while holding one (it shouldn't), then 0 and grab; wall-run lane: wall-run is back as it was; jump to the bars and swing.
Report: do the walking and running hands look natural, and is there too much or too little sleeve? Do the two-handed holds look right for each item? Is the pause menu clear, and does Resume put you back in fullscreen?

## PT-005 Reference hillside, first pass (U-009, U-010)
Start: `?scenario=reference`, or = → "Reference hillside". You stand on the vantage roof where the photo was taken; look north. `logs/reference-compare.png` (after `npm run verify`) shows the photo beside the game at the photo's framing.
Try: compare the view with docs/reference/look-01.jpg; walk down the stairwell (the hut at the back of the roof) to the street; climb onto the brick low-rises (pipes and sill columns), run across their roofs, look inside the enterable ones; go up the terrace stairs on the east side to the walk-ups.
Report: which buildings read right and which don't (colour, window sizes, weathering, roofs, greenery)? What would bring it closest to the photo? Is it fun to move through?

## PT-006 Whole city and lighting (U-012)
Start: `?scenario=shibati&dev=1`; noclip (dev panel) up above the tallest towers, or climb one.
Try: look across the whole peninsula to both rivers; walk the Shibati stair street at 15:00 (sun shadows), 18:30 and 23:00 (dev time slider); watch the fps readout.
Report: does the city feel endless from up high, and does the haze look right? Any visible seam where detail turns into the far blocks (about 160 m out)? Are shadows and night light good, and is the frame rate smooth on your machine?

## PT-007 The reference look across the city (U-009)
Start: `?scenario=shibati&dev=1`; look from the stair street and from rooftops toward the upper city; compare with docs/reference/look-01.jpg.
Try: the residential slabs over the walk-ups, balcony bands, roof gardens, laundry and cables; the overcast light.
Report: what still looks least like the photo (colours, window grids, regularity of the blocks, roofs)? Where should the city be denser or more broken?

## PT-008 Yuzhong at 1:1, first look (U-017, U-020)
Result (U-022): passable; climbing strips look odd; buildings read as textured boxes with no doors or elements; streets blocky-edged; large empty paved areas; about 60 fps. Fixes queued as M3-53 to M3-56.
Start: `?scenario=yuzhong&dev=1` (the old map is still the default until M3-41c); teleports in the dev panel go to Jiefangbei, Shibati, Jiaochangkou, Hongyadong, Xiaoshizi, Chaotianmen, the cableway and the Grand Tunnel.
Try: noclip up over the peninsula and look along both rivers; walk Jiefangbei's streets (towers, LED screens, neon); walk a residential slope and the stairs; slide down a steep street (Ctrl at a sprint); try a steep bank (it should be a wall); fall from a tower roof past a ledge and grab (it should tear loose above about 12 m).
Report: does it read as Chongqing (sizes, slopes, how buildings sit on the hill)? Which buildings or colours look wrong, and where is it too empty? After `npm run verify`, compare logs/variety-jiefangbei.png, variety-slope.png and variety-shibati.png with docs/reference/places/jiefangbei-3.jpg, old-housing-1.jpg and shibati-2.jpg. How is the frame rate and the load time on your machine?

## PT-009 Everything on the real map (M3-41c)
Start: the game (no scenario): a run starts in the friends' hideout under the vent grate, now under a street in the real Shibati. `?scenario=shibati&dev=1` starts at the top of the Eighteen Stairs; dev teleports include the Grand Tunnel entrance and exit, the Line 2 train, the construction site and its crane, and the metro entrances.
Try: get out of the hideout along the side tunnel and the Grand Tunnel, open the rusted gate and climb the stairway to the Shibati street; walk the Eighteen Stairs and run the rooftops of the shop houses either side; walk into a few buildings (more now open) and up their stairs; climb the half-built tower's stair core and the crane ladder; walk the Line 2 beam through the stalled train.
Report: is the hideout's way out readable underground? Do the Shibati terraces and their rooftops work as a route? Anywhere you got stuck, fell through or saw into the void (stairway mouths, the grate, building doors)?

## PT-010 Frame rate (M3-53, U-022)
Start: `?scenario=shibati&dev=1` in your usual browser, fullscreen at 1080p.
Try: read the dev panel at four places (the Shibati stairs, a rooftop, the hideout via the "Friends' hideout" teleport, and 120 m up over Jiefangbei): its fps and ms a frame, then press **bench** at each and note the result. Try Resolution High, Balanced and Fast in the pause menu (=).
Report: the bench result at each place and setting, your monitor's refresh rate, and your GPU. A 60 Hz monitor always shows 60 fps; the bench shows how far past that the machine could go (target 6.7 ms = 150 fps).

## PT-011 A filled, ordered city (M3-55 to M3-56, U-022, U-024, U-028 to U-030)
Start: the game, or `?scenario=shibati&dev=1`; press **New run** in the pause menu if an old save puts you somewhere odd. docs/maps/marks.png shows where the ruins (red), woods (dark green), parks (green) and open ground (sand) are.
Try: walk a main road (it should be smooth, clean and clear, wrecks shoved onto the pavements, nothing poking through); walk the Eighteen Stairs and into an open shop house under its rolled-up shutter; look at building fronts (doors, shopfronts, cages, AC units, light-box signs, tower lobbies); climb a hold column (barred windows and AC units now); find a park, a wooded bank and a ruin (broken walls, slabs, rubble); cross a big open space (back buildings, yards with gates, lean-tos you can run up, markets, tarps, gardens); drop 6 to 8 m onto a pile of rubbish bags or a shop awning (half the fall counts); jump running up a steep street (you should leave along the slope).
Report: where does it still feel empty or out of place (props in odd spots, anything floating or turned wrong)? Do the signs look like Chongqing's now? Does the green and the debris look right? Frame rate with all of it.

## PT-012 The layered city (M3-57 to M3-66, U-031 to U-033)
Start: the game, or `?scenario=shibati&dev=1`; the dev teleports include Skybridge, Vantage, Factory gate, Underground city and Roof street entries.
Try: walk a few blocks off a main road and through the back buildings (most doors open; set-back ones have a paved path to the street); look up a vertical alley; cross a bridge or a beam between roofs; climb scaffolding; walk through one of the real parks; ride the frame rate at street level and on a roof.
Report: does the city feel full and layered now, or still too open anywhere? Do the parks and paths look purposeful? Frame rate at street level and from a high roof (this build adds about a third more triangles; this machine can't measure real GPU time).

## M3-38 rooms (frame rate)
- Walk into a few enterable blocks and round the streets beside them: does the frame rate hold on your GPU? (In software GL, frame CPU was over budget before the rooms and still is; rooms draw only within 45 m.)
- Do the rooms read as rooms (flats, shops, restaurants, offices, workshops), and do the fallen ceilings let you climb to the floor above?

## M3-36, M3-74, M3-37a, M3-37: buildings as puzzles, rooms, connections, routes
- Pick a few enterable blocks (`?dev=1`, the teleport list) and try to get in and through them: windows to break or find broken, doors locked, jammed or chained, vents to pry, holes and ladders between floors. Does each feel like its own puzzle? Too easy, too hard?
- Do the rooms look real enough close up (furniture, wallpaper, clutter, ceiling lights, decay)? What looks worst?
- Cross a street on a plank, a beam and a cable; walk a cable bundle between close buildings; swing the bars across a narrow gap. Do they read, and do the cables sway?
- Find a grappling cache (a bare block with a crate and a post on its roof): is there really no other way up?

## M3-72: the start hideout under the alley
- `?scenario=run`: climb the shaft's ladder and hold F on the grate overhead. Does drawing the bolts feel slow and loud enough to make you wait for the alley to be quiet? Climb out over the rails.
- Up in the alley at night: does it read as a back alley (neon, bags over the grate, bins, washing)? Is the grate hard enough to spot under the bags?
- Go back down and shut it from below (it bolts and drags the bags back). Then try sleeping once with it open: found in your sleep. Fair warning from the intro's chalked rule?
- Drag something out of the backpack to drop it, and pick it back up with F.

## M3-79: monotone buildings
- By day from a roof over the slopes and over Jiefangbei: do the buildings read as one weathered, near-monotone city now, with the colour left to the neon, screens and lights? Too grey or not grey enough?

## M3-77: buildings as warrens
- Get into a few blocks (`?dev=1` teleports, or find a broken window or a burrow) and explore a warren floor: does the corridor-and-rooms structure feel like a real building to scavenge through, while still a maze (locked doors, rubble, rooms reached only through others, cracks to squeeze)? Too many rooms, too few, too samey?
- Does the boot (world build, about 30 s in node) feel too long in your browser? And the frame rate inside, on your GPU?

## M3-78: chimneying
- `?scenario=gym`, teleport "chimneys": jump in the shaft and press Space at the top of the jump, then W looking up. Does bracing and working up read and feel right (speed, the scrape)? Out onto the deck at the top, back down, Space to let go. Up the 40-degree slot the same way.
- In a warren (M3-77), find a shaft off a corridor (a low duct at floor level) and climb it to the floor above.

## M3-73a: basements and the sewer maze
- Find a block with a stairwell, get into its lobby and down the hatch to the basement (headlamp on). Open the manhole grate (some are bolted from below), climb down and follow the sewers: do they read as sewers, crawlways and a flooded sump to swim? Is getting lost in them fun or tedious?
- Find a grate into the underground city and force it.

## M3-76: the ant hill
- With `?dev=1`, follow a main route's points if you can (the routes aren't marked: find your own way between two districts). Does the city feel like an ant hill you can mostly get through inside buildings, sewers and the underground, coming out only to cross?
- Nothing should mark the way on the roofs any more (no square trail, no rags).

## M3-80: urban rooftops
- From a roof, look round the others: do they read as a lived-in city's roofs (tanks, drums, condensers, sheds, crates, heaters, aerials) rather than gardens? Hide in a tank, a drum or a shed's corner once.

## M3-83: covers on every opening
- In a basement, at a roof hatch, at a warren shaft's foot, over a street grate down to the tunnels: is each one shut until you open it with F, and does lifting, prying or forcing it feel right (and the bolted ones plainly bolted)?

## M3-73: the underground city's buildings
- Teleport to 'Underground city deck' and 'Underground city concourse': does it read as a dense cyberpunk underground street (neon tube, blade signs, screens) without being garish? Go into a few of the buildings: rooms, doors, stairs, furniture where they should be?

## M3-61: ruins that look fallen
- Walk a few rough patches by buildings: do the facade sections, columns, beams and boulders read as having fallen from the building beside them, or as placed blocks?

## M3-62: foliage
- In a park, a wood and along a street: do the species read as different trees (camphor, banyan, palm, bamboo, ginkgo)? Climb a big tree's trunk and a vine to a first-floor window: does it feel right?

## M3-63: sky, rain, night, the muted city
- Play through a dusk into night on a real GPU: is the night dark enough to need the headlamp but still readable (lit windows, stars, neon)? In rain: do the streaks, splashes and mist read as rain? By day: does the muted city let the robots, crates and loot stand out?

## M3-41: the city at 1:1 beside the real places
- Look over logs/places-jiefangbei.png, places-shibati.png, places-chaotianmen.png (reference photo left, the game right, from tests/e2e/places.e2e.mjs). Known gaps to judge: Shibati's old low houses and lanes read as blocks of flats; Raffles City's towers have no Crystal skybridge. Which matter most?

## M3-43: the subway way in
- Teleport to 'Jiaochangkou metro': walk the platform past the screen doors, up the dead escalators to the concourse, then down onto the tracks, east along the running tunnel and through the cross passage into the Grand Tunnel and on to the friends' chamber. Does it feel like an abandoned metro?

## M3-35: Shibati and Jiaochangkou from the references
- Walk down Shibati's stair among the old pitched-roof houses and along Jiaochangkou's ridge junction (logs/places-shibati.png, places-jiaochangkou.png): do they read like the reference photos made 2038? Worth adding: Jiaochangkou's old timber house squeezed between slab blocks, its metro entrance sign box.

## M3-14: neon and signage
- At night (`?dev=1`, set the clock past 21:00) walk Jiefangbei's shopping streets and down Shibati (logs/shibati-night.png, signs-close.png, signs-ticker.png): do the shop names, neon, red banners, QR stickers and the scrolling LED tickers read as Chinese street signage at a glance, and is the night glow right on a real GPU (not blown out, not dim)? Are the characters crisp at a few metres?

## M3-17: graphics presets
- Pause (=) and try 低 Low, 中 Medium and 高 High in Jiefangbei and on a high roof: is each smooth on your machine (Medium should hold 150 fps on a decent GPU), does Low still read as the city, and is High worth it (longer detail, sharper shadows, all the litter)?

## M3-19: the Li family flat
- On a run, teleport to 'Li family flat' (pause menu): does the room read as his family's home gone through, and do the badge and phone on the floor find you? Pick up the phone, hold it and click: does the voicemail land (logs/liflat.png, liflat-voicemail.png)? Is the subtitle timing readable?

## M3-20: the Yangtze riverfront
- From 'Shibati bottom' head down to the riverfront road (logs/riverfront.png): does the machines' wall feel like a real barrier, are the fallen panels findable, and is walking down the stone steps into the Yangtze, swimming and climbing back out right?

## PT-013 M3 complete: Yuzhong (build after M3-21)
- Play a run from the friends' hideout: climb out of the grate, find your way to the Li family flat near the top of Shibati's stair (badge, phone, voicemail), then down to the Yangtze riverfront and its wall. Try each of the three ways between the hideout, Jiaochangkou, Shibati top and the riverfront: along the streets, over the roofs, and underground or through the buildings. Does the district read as 2038 Chongqing by day and at night (signs, neon, banners, LED tickers), does each way feel findable without markers, and is the frame rate right on Medium (pause menu presets)? Anything that breaks, floats, blocks or looks wrong, note where (the pause menu lists the teleports).

## M4-07: cameras
- Walk a district's main street by day: do the cameras' beeps keep you on edge without grating? Try slipping past the sweeper at a district's centre by timing its pan; walk openly past a door camera and see a unit come to look.

## M4-09, M4-10: quadrupeds and humanoids
- Get a quadruped after you (stand in its view): does its servo whine warn you early enough, is its 8 m/s chase up the stairs frightening but escapable by a mantle? Let a humanoid notice you: do you hear the radio call, do the others come round the sides, and do they search the hiding spots like soldiers rather than wander?

## M4-11: fixed sensors
- In the Grand Tunnel past the metro's passage, find the red tripwire: is it visible enough in the lamp's light to jump, and does a running jump feel fair? Crawl past a motion sensor in a shelter store room (slowly), then crouch-walk: does the difference read? Stand in front of a factory gate's turret: does the burst sound and hurt as it should, and does it feel deadly within seconds?

## M4-12 to M4-14: the hive answers
- Get seen by a camera in Jiefangbei and stay seen: within a few seconds do the machines near you converge, does a hunter drone come off a roof dock, and after 45 s a pair of humanoids out of a street door? Break line of sight and hide: does it feel like the net closes and then loosens?

## M4-18 to M4-21b: fighting back
- Take the pistol (give it with the dev panel) and a couple of magazines into the gym: does aiming down the sights (right mouse) feel right, the sights where your eye expects, the zoom comfortable? Does each shot's kick and slide read? Lean round a wall with Q and E: natural, or too far? Knife a drone; sneak up behind a humanoid and hold the knife on it for the takedown: is 2 s tense? Stand in a turret's view and sprint away from a humanoid: does the danger feel fair? (The sleeves fill the bottom of the view aimed: say if that bothers you.)
