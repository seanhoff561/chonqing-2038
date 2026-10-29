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

