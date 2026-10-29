# Chongqing 2038: design

The director's brief (BRIEF.md) is the vision. This is the build design. Numbers here are starting values; the live values are in `src/data` and win over this file once tuned (tuning changes get a D-### line).

## 1. Pillars

1. **Learn the machine.** The city and the machines' patrol logic are identical every run. Knowledge is the progression: timings, blind spots, battery gaps, routes.
2. **The vertical city is the toolkit.** Every block offers a street route, a rooftop route and an underground route. Parkour and carried tools open new lines through it.
3. **Seen is survivable, but it costs.** Kill-on-sight, live hivemind tracking, then a search that closes in. Escape is hard, thrilling and always possible; leading them home is the real mistake.
4. **No help on screen.** No minimap, markers, meters or tutorials. The body, the world and Anna's laptop carry all information.
5. **Every tool, two uses; no tool, every answer.** Each item solves several problems and none solves everything. Several ways into every site, several ways out of the city.

## 2. Controls (keyboard and mouse)

| Action | Key |
|---|---|
| Move / look | WASD / mouse |
| Sprint | Shift (hold) |
| Jump, mantle, vault, wall-run, climb up | Space |
| Crouch (tap) / slide (while sprinting) / roll (hold before landing) | C |
| Crawl (toggle) | Z |
| Interact / pick up / enter box / attach pipe or ladder | E (hold E for timed actions) |
| Drop from ledge, pipe, ladder or rope | Q |
| Use held item (attack, place, fire) / aim or throw arc | Left mouse / right mouse |
| Reload | R (also rotates an item while dragging in the backpack) |
| Hotbar slots | 1-5 (0 = empty hands) |
| Backpack | Tab |
| Laptop (Anna) | L |
| Headlamp (off, white, red) | H |
| Pause menu (lists controls, settings) | Esc |

## 3. Movement

Player collision is an axis-aligned box 0.5 m wide. All values live in `src/data/movement.ts`.

| Parameter | Value |
|---|---|
| Heights (stand / crouch / crawl and slide / curled in a box) | 1.75 / 1.10 / 0.50 / 0.75 m (eye 1.62 / 0.98 / 0.38 / 0.55) |
| Speeds (jog / sprint / crouch / crawl / ladder / pipe up) | 3.2 / 7.0 / 1.6 / 0.8 / 1.5 / 1.0 m/s |
| Ground accel / air accel | 30 / 4 m/s^2 |
| Gravity / jump take-off speed | 9.81 m/s^2 / 3.1 m/s (apex 0.49 m); a jump still counts 0.1 s after stepping off an edge |
| Running jump | clears a 4.5 m gap at sprint, fails 5.2 m |
| Auto step-up | 0.45 m (stairs are invisible ramps under the visible steps) |
| Mantle | ledge top 0.5 to 2.4 m above feet, wall within 0.7 m, moving forward + Space; 0.35 s (below 1.0 m) or 0.8 s |
| Vault | obstacle 0.5 to 1.2 m high and at most 1.2 m deep, clear landing, moving at 2.5 m/s or more; 0.45 s, keeps 85% speed |
| Slide | from 6 m/s+ with C: 1.0 s, 7.5 to 3 m/s, height 0.5 (passes under 0.6 m clearance), ends crouched |
| Crawl | passes 0.6 m gaps |
| Ledge hang | in the air, grab a ledge whose top is 1.0 to 1.9 m above his feet (his hands' reach) with its wall in front within 0.6 m; hangs with feet 1.8 m below the top; shimmy 0.8 m/s; climb up 0.9 s; drop with Q. A standing jump plus reach tops out at 2.4 m, the mantle limit |
| Wall-run | sprinting (5.5 m/s+), Space with a wall within 0.8 m at the side and travel within 35 degrees of the wall: up to 3 steps (0.9 s) at 6.5 m/s, starts +3.0 m/s up at 60% gravity; Space again leaps off at 5 m/s |
| Wall climb (run-up) | sprinting at a wall (within 30 degrees of its normal), Space within 1.2 m: 2 steps, +5.75 m/s up (about 1.63 m); with the 1.9 m reach he catches a ledge up to 3.5 m above the feet, then hangs and climbs |
| Pipes | vertical drain pipes: attach with E or by jumping into them; up 1.0, down 1.4 m/s |
| Safe drops | 4 m; 7 m with a roll (C held within 0.3 s before landing) |
| Hide in box | E at a box, crate, dumpster or cabinet with an interior of 0.8 m or more: 0.6 s in, 0.5 s out |
| Swimming | surface 1.4 m/s (sprint 2.2), dive with C, breath 40 s, then 8 HP/s; leaves him wet for 120 game minutes |
| Stamina (0-100) | sprint 6/s, jump 8, mantle 6, wall-run 15, hang 2/s; regen 15/s after 1 s still; at 0 no sprint until 30 |
| Encumbrance | over 15 kg: sprint and jump -15%; over 25 kg: no sprint, no wall-run, no ledge grabs, mantle max 1.6 m |

**Fall outcomes** (h = fall height): no roll: h <= 4 nothing; 4-7 m: (h-4) x 8 damage, 40% sprain; 7-12 m: (h-4) x 10 damage and a broken leg; over 12 m: death. With a roll: h <= 7 nothing; 7-10 m: (h-7) x 8 damage, 40% sprain; above 10 m as without a roll. Chances use the run's seeded RNG.

## 4. Survival, health and time

**Clock.** One game day lasts 36 real minutes (1 game hour = 90 s; time scale 40x). A run starts on day 1 at 06:00. Dawn 05:30-06:30, day to 18:30, dusk to 19:30, night until 05:30. Weather follows a seeded schedule: morning fog is common, rain comes in spells of 1-4 hours, clear spells between.

| Need | Drain (per game hour) | Below 20 | At 0 |
|---|---|---|---|
| Satiety | 4 (x1.5 while sprinting) | stamina regen -30%, stomach sounds, no natural healing | -2 HP/h |
| Hydration | 5 (x1.2 hot afternoons, x1.5 sprinting) | blur, stamina -30% | -5 HP/h |
| Energy | 5 awake, +12.5 asleep | blur, vignette, slow blinks, sprint -20% | he collapses asleep where he stands |

**Health** is 100 HP. Natural healing: +1 HP per game hour awake when satiety and hydration are both 30 or more; +3 per hour asleep.

| Injury | Cause | Effect | Treatment |
|---|---|---|---|
| Light bleeding | gunfire graze, glass, fall | 0.2 HP/s; clots after 90 s | bandage |
| Heavy bleeding | direct hit (30%) | 1.0 HP/s, never clots | tourniquet (stops it; that limb works badly until a first-aid kit) or first-aid kit |
| Sprain (leg) | fall, rare hit | no sprint, jump height halved | heals in 36 game hours; painkillers hide it for 4 h |
| Broken leg | big fall, hit (rare) | limp at 1.5 m/s, no jump, mantle max 1.0 m, no wall-run | splint turns it into a sprain-level limp; heals in 7 days if splinted |
| Broken arm | fall onto arm (20% of fractures) | no pipes, ropes or hanging; aim sway x3 | splint allows slow climbing; heals in 7 days |
| Food sickness | spoiled food (or raw pork, 70%) | 12 game hours: vomiting (-15 hydration and satiety each time), no healing | time and water |

Health, hunger, thirst and fatigue never show on the HUD: they show through breathing, heartbeat, blur, vignette, limp sway, stomach sounds and on Anna's status page.

**Sleep.** At a mattress, choose a wake time (default 06:00). Sleep is a time skip: needs drain at sleep rates, healing applies, machines return to their schedules, and if the shelter is compromised the raid happens (section 9). The ironman save is written on waking.

**Death and runs.** One ironman save in localStorage, written on wake and deleted on death. A run seed drives loot placement, food ages, weather and small patrol offsets (each route's phase shifts by up to 8% of its loop). The city and the patrol logic never change. After the first run the intro is skippable.

## 5. Perception, alert states and the hivemind

### Senses
Each unit keeps an **awareness** value per tick: `rate = 2.5 x V` per second when V >= 0.04, else decay 0.15/s. Awareness 0.3 makes the unit Suspicious; 1.0 makes it Engaged.

`V = exposure x light x posture x motion x falloff x weather`

| Factor | Values |
|---|---|
| exposure | fraction of 5 body points (head, two shoulders, pelvis, knees) inside the cone with clear line of sight |
| light | ambient (day 1.0, dusk 0.5, night 0.12) plus local lights (lampposts 0.6 within 8 m, neon 0.35 within 5 m, searchlight cone 1.0, his own headlamp 1.0 white or 0.4 red, laptop glow 0.5 at night); units with night vision floor it (cameras and humanoids 0.3 IR); thermal units ignore light |
| posture | standing 1.0, crouched 0.55, crawling 0.3, hanging 0.8, curled in a box 0 (unless a unit within 1.5 m searches it) |
| motion | still 0.4, crawl 0.45, crouch-walk 0.6, jog 0.85, sprint, parkour or airborne 1.0 |
| falloff | 1 - (d / range)^2 |
| weather | range x0.75 light fog, x0.45 heavy fog; rain range x0.85 |
| thermal | at night, within thermal range: light treated as 1.0; x0.1 under a mylar blanket, x0.3 while wet, 0 in water deeper than 1 m |

Hearing: every noise is an event with a radius. A unit hears it when distance <= radius x its hearing multiplier (x0.6 when walls block line of sight). Footstep radii: crawl 1, crouch 2, jog 8, sprint 16 (x0.5 in rain); landing hard 15; vault 6; crowbar 20; glass 35; dropped ladder 30; nail gun 25; pistol 150; shotgun 180; grenade 250; firecrackers 120. A heard noise makes the unit Suspicious and it investigates. Gunfire and explosions are **hostile noises**: the hive starts a search centred on them.

### Alert states (per district)

| State | Enter | What happens | World shows |
|---|---|---|---|
| Unaware | default | units follow schedules | unit lights cool white |
| Suspicious | a unit reaches 0.3, hears a noise, or a unit goes silent | that unit (or the nearest) walks to the point, scans 8 s, returns; no broadcast | that unit's light amber |
| Engaged | a unit reaches 1.0 | armed units in range fire at once; after the broadcast delay his position goes to the network and updates live while any broadcasting unit sees him | all district lights red, LED boards switch to alert text, searchlights converge, sirens, pursuit music |
| Searching | no broadcasting unit has seen him for 4 s | the hive sweeps the search area (below) for 150 s after the last contact | lights pulse red-orange, drone swarm audible |
| Heightened | the search ends without contact | +50% patrol units, every camera active, awareness rates x1.3, until 06:00 next day | lights steady amber, LED boards show 加强巡逻 |

Broadcast delays: turret 0.5 s, camera 1.0, hunter drone 1.0, patrol drone 1.5, quadruped 2.0, delivery robot 2.0, humanoid 2.5. Contact spreads to the whole district and to units of other districts within 300 m.

**Convergence and escalation.** On contact: ground units within 250 m path to the last known position (LKP); drones within 400 m fly to it; every dock within 500 m launches a hunter drone at once and one more every 20 s while Engaged (max 3 per dock). After 45 s Engaged, a squad of 2 humanoids deploys from the district's nearest garage. Pursuit speeds are real: patrol drones 9 m/s, hunter drones 12, quadrupeds 8 (stairs fine, 1 m jumps, no climbing), humanoids 2.5 walk / 4.5 run (stairs only), delivery robots 2 (no stairs).

**Search.** From the LKP p, heading h and top speed 7 m/s: the centre is p + h x 7 x 2 s; the radius is 6 + 3t m, t = seconds since contact was lost, max 140 m. Units take search points in the disc, weighted toward hiding spots, level changes (stairs, ladders, tunnel mouths) and the heading. A searcher passing within 1.5 m of a hiding spot checks it with 60% chance (seeded). Drones sweep spirals with searchlights. Any fresh sighting returns to Engaged.

**Silent units.** A unit disabled or jammed while Suspicious, Engaged or with a broadcast pending does not report. 12 s later the hive sends the nearest drone and ground unit to its position (Suspicious). Finding a destroyed unit starts a small search (radius cap 40 m) there.

**Jamming.** A jammer cuts the link within 25 m: pending broadcasts are lost (silent-unit rule applies), drones inside hover blind and drift out, cameras inside go dark to the network. Running it more than 20 s straight makes it an RF beacon: the hive sends a drone to its position.

**Tracking home.** The hideout becomes *compromised* if he enters its tunnels while any unit has had line of sight to him within the last 10 s or while a tracking tag is stuck in his clothes. A compromised shelter is raided that night (section 9).

## 6. Combat and damage

| Enemy weapon | Fire | Damage | Notes |
|---|---|---|---|
| Humanoid rifle | 3-round burst / 1.2 s | 18 per hit | hit chance 0.55 x visibility x (1 - 0.06 x his speed) x (1 - d/80) |
| Hunter drone SMG | 2-round burst / 0.8 s | 8 | accuracy 0.4 |
| Turret | 6 rounds/s | 12 | accuracy 0.7 within 40 m |
| Quadruped tag launcher | 1 / 6 s, 20 m | 0 | 60% hit: a tracking tag sticks to his clothes |
| Quadruped shock prod | 1.5 m | 15 + 1 s stun | |

Each hit: 30% heavy bleed, otherwise light; 15% limb hit (leg sprain or arm graze).

| Unit | HP | Hit zones (damage multiplier) |
|---|---|---|
| Patrol drone | 40 | body 1.0, rotors 1.5 |
| Hunter drone | 70 | body 0.8, rotors 1.5 |
| Quadruped | 150 | body 0.2, sensor head 1.0 (60 blinds it), legs 0.6, belly battery 1.5 |
| Humanoid | 300 | armour 0.1, sensor head 1.0 (75 blinds it), knees 0.8 (100 each immobilises), back battery 2.0 (120 shuts it down) |
| Turret | 500 | body 0.05, sensor 1.0 (100 blinds it) |
| Camera | 20 | any 1.0 |

Player weapons: knife (40 melee; takedown from behind), crowbar (55 melee, slow), pistol (25, 15-round magazine, noise 150 m), pump shotgun (8 pellets x 12, 5 shells, 180 m), nail gun (14, 30 nails, 25 m noise, 15 m range), grenade (radius 6 m, 200), EMP (radius 6 m: drones crash, robots off 30 s or permanently within 2 m, cameras off 60 s, turrets off 45 s; 3 charges). **Takedown:** within 1.5 m of a quadruped or humanoid that is not Engaged, from its rear 120 degrees, knife: 2 s, the unit shuts down, noise 6 m. Ammunition is scarce: a police station run yields 1-3 magazines.

## 7. The machines

| Unit | Movement | Senses (FOV, day / night range) | Placement |
|---|---|---|---|
| Fixed camera | none | 70 deg, 30 / 18 (IR) | doors, gates, intersections |
| Sweeping camera | pans +/-45 deg over 10 s | 60 deg, 30 / 18 | sites, plazas |
| Smart lamppost | none | 90 deg, 22 / 14; lamp light 0.6 | main streets |
| Patrol drone | flies loops at 25-40 m, 9 m/s | 100 deg cone down-forward, 35 / searchlight 30 + thermal 30 | every district, from docks |
| Hunter drone | 12 m/s, armed | as patrol | launched on contact |
| Quadruped | 3 m/s patrol, 8 m/s chase | 120 deg, 30 / thermal 20; hearing x1.5 | streets, stairs, sites |
| Humanoid | 2.5 / 4.5 m/s | 100 deg, 40 / 22 IR | checkpoints, sites, squads |
| Turret | static | 90 deg, 60 / 45 thermal | bridge, police armoury, river pier |
| Delivery robot | 2 m/s, no stairs | 120 deg, 18 / 10 | flat streets in Jiefangbei and the riverfront |
| Motion sensor (PIR) | static | 90 deg, 10 m, motion over 0.5 m/s | inside sites |
| Tripwire (laser) | static | a line | inside sites |
| Acoustic sensor | static | hearing x2 | electronics market, tunnels |
| River drone boat, sonar buoy | 4 m/s / static | 50 m sonar (engine noise) | the rivers |

**Patrol model.** Every unit has a route (waypoints with dwell times) and a schedule (active hours). While Unaware, a unit's position is a pure function of the game time and its run-seed phase offset, so sleeping is a cheap time skip and the player can learn exact timings. When alerted it leaves the route, then paths back and resumes. Patrol drones fly 6 real minutes on a battery (4 game hours), then sit on their dock 2 real minutes to recharge: the gap in coverage is deliberate and learnable. Movement and combat run in real seconds; schedules run on the game clock. Units think at 10 Hz (staggered), move at 60 Hz. Ground units path on a navigation graph built with the city (streets, stairs, tunnels).

## 8. Items and crafting

Grid backpack: 8 x 6 cells (a hiking pack found in a Jiefangbei sports shop raises it to 10 x 7). Items are rectangles, rotatable. Five hotbar slots bind to backpack items. Weights drive encumbrance.

| Item | Size | kg | Uses |
|---|---|---|---|
| Grappling hook | 2x2 | 1.5 | climb to a ledge up to 20 m above; rappel down; pull down a loose sign or shutter |
| Telescoping ladder | 1x4 | 7 | lean on a wall (4 m); bridge a 3.8 m gap; dropping it is loud (decoy) |
| Crowbar | 1x3 | 1.8 | pry doors, shutters, vents, crates, scooter batteries; melee |
| Lockpick set (or improvised) | 1x1 | 0.1 | opens bad locks only (padlocks, old doors), silent but slow |
| Keys, keycards | 1x1 | 0 | specific doors; keycards can be cloned |
| Keycard cloner | 1x1 | 0.2 | copy a card in reach of a unit or reader; read badges off dead terminals |
| Bolt cutters | 1x3 | 2.5 | chains, padlocks, fences, grates, cables (relay cut) |
| Rope + carabiners | 2x2 | 2 | anchor and rappel, leave a fixed line, haul-rope trolley part |
| Climbing gloves | 1x1 | 0.2 | halves hang and pipe stamina; insulated pair needed for the substation |
| Headlamp | 1x1 | 0.1 | light (white is seen far; red is dim); read documents at night |
| Binoculars | 2x1 | 0.6 | zoom; observe units (patrol logs) |
| SDR dongle | 1x1 | 0.05 | drone routes, tag detection, jammer part |
| Camera tap | 1x1 | 0.1 | live feed, loop a camera for 90 s |
| Drone controller | 2x2 | 0.8 | fly a salvaged drone (8 min battery); aerial map |
| Signal jammer | 2x2 | 1.2 | cut the hive link 25 m; blind a sensor bus; rail-deck escape |
| EMP device | 2x2 | 1.8 | 3 charges; downs drones, stops robots; hideout trap |
| Grenade | 1x1 | 0.4 | breach weak doors, robots, decoy |
| Fire extinguisher | 1x2 | 4 | smoke cloud 6 m for 20 s (blocks sight and thermal); puts out fire |
| Firecrackers 鞭炮 | 1x2 | 0.3 | timed noise decoy (120 m), scares delivery robots off route |
| Mylar blanket | 1x1 | 0.1 | beats thermal while worn; treats hypothermia after a swim |
| Knife | 1x2 | 0.2 | melee, takedowns, cut rope or cloth |
| Pistol (QSZ-92) / magazines | 2x2 / 1x1 | 0.8 / 0.3 | weak points; loud |
| Pump shotgun / shells | 1x4 / 1x1 | 3.2 | close weak points, breach locks |
| Nail gun | 2x2 | 2.5 | quiet rotor shots, pin a door shut |
| Car battery, inverter | 2x2, 2x1 | 15, 1.5 | power the hideout and laptop; start the boat |
| Battery pack (scooter) | 2x1 | 2 | jammer, EMP, drone, grinder power |
| Angle grinder | 2x2 | 2.5 | cut a blast door bolt or bars (loud 60 m) |
| Breaching charge | 1x1 | 1 | blast door, wall hatch (250 m noise) |
| Oxygen kit | 2x3 | 5 | 90 s underwater; treats smoke and gas |
| Fuel jerrycan (20 L) | 2x3 | 18 | boat fuel |
| Boat key / CAN interface | 1x1 | 0 | start the river-police boat (key, or laptop + CAN hotwire) |
| Healing: bandage, tourniquet, splint, painkillers, first-aid kit | 1x1, 1x1, 1x3, 1x1, 2x2 | small | see section 4 |
| Water bottle (500 ml), purification tablets | 1x2, 1x1 | 0.5 | drink; refill at taps or the river (purify first) |

Food (shelf life from manufacture; loot spawns with a seeded age): instant noodles 180 d, luncheon meat 1000 d, zhacai 榨菜 365 d, chocolate 300 d, rice crackers 120 d, cured sausage 60 d, energy drink 365 d, bread 3 d, zongzi 3 d, steamed buns 2 d, tea eggs 2 d, peaches 2 d, raw pork 1 d. Spoiled food causes sickness. Anna reports remaining shelf life only after a scan.

**Crafting** at a workbench (hideout or alternative shelter). Recipes are realistic in spirit, abstract in detail (parts, not instructions). Weapons and explosives are found, never crafted.

| Result | Parts |
|---|---|
| Signal jammer | SDR dongle + RF amplifier + battery pack + circuit board |
| EMP device | capacitor bank + copper coil + battery pack + trigger switch |
| Camera tap | circuit board + data cable + clip leads |
| Drone controller | circuit board + drone radio module + battery pack |
| Keycard cloner | RFID reader + circuit board + battery pack |
| Grappling hook | steel hook + rope |
| Haul-rope trolley | pulley block + 2 carabiners + harness |
| Battery pack | scooter battery cells + duct tape |
| Splint | 2 steel rods + duct tape |
| Bandage | clean cloth + alcohol |
| Improvised lockpick | 2 hairpins (3 uses) |
| Clean water | river water + purification tablet |
| Solar charger | small solar panel + charge controller (+5% hideout battery per day) |

Salvage: a downed drone yields rotors, a radio module, a camera module and a battery pack; a disabled quadruped yields servos, a sensor head and a power cell; a humanoid yields armour plate, a power cell and a rifle that will not fire for him (biometric lock).

## 9. The hideout

A brick-arched air-raid side tunnel off the Grand Tunnel under Jiaochangkou: 4 m wide, 20 m long, damp walls, a mattress, a workbench, a stash crate (10 x 8 grid), a car battery (60%) with inverter, a camping lamp. Its only easy entrance is a rusted gate in a Shibati retaining wall, 60 m of tunnel away. Overhead a 9 m ventilation shaft rises to a grate at the Jiaochangkou junction: neon, sweeping searchlights and patrols directly above. That view is scripted decor: nothing up there can see down.

Starting supplies: 2 instant noodles, 1 luncheon meat, 1 bread (1 day old), 3 water bottles, 1 bandage.

**Raid.** If compromised, a raid starts at a seeded time between 01:00 and 04:00. He wakes to breaching noises with 10 s before units reach the chamber. Survival options: a second exit he opened beforehand (clear the collapsed side passage with a crowbar, or cut the vent grate with bolt cutters and leave the telescoping ladder in the shaft), an EMP trap rigged on the gate, or fighting with what he slept beside. Surviving loses the shelter and everything in its stash (the machines burn it); he must claim one of the alternative shelters (a Hongyadong cliff cellar, a hotpot restaurant's 防空洞 cool room in Jiefangbei, a metro service room at Xiaoshizi). Each has a mattress, a small stash and a bench. Unprepared, he dies.

## 10. Map plan

The Yuzhong peninsula compressed to 1.4 x 0.7 km. World axes: x east, y up, z south (north is -z). The map is authored as two ASCII layers of 20 m tiles (70 x 35: tile type and ground level) in `src/data/map.ts`; set pieces are hand-built in `src/world/sets/`; tunnels are polylines in `src/data/tunnels.ts`. Ordinary fabric is generated from the tiles with a fixed layout seed: buildings split into 1-4 blocks with 1.5-4 m alleys, rooftop clutter, pipes, balconies, shutters, stairs between levels, props. Level differences between tiles make retaining walls, stair streets and buildings whose roofs are the street above.

| Layer | Height |
|---|---|
| River surface | 0 m |
| Riverfront roads, docks | 4-8 m |
| Lower city (Shibati bottom, Xinhua Road lower, Hongyadong base) | 10-20 m |
| Upper city (Jiaochangkou, Jiefangbei ridge) | 38-46 m |
| Rooftops | 50-120 m; Raffles towers 230 m, The Crystal at 250 m |
| Tunnels | 3-12 m below the street above |

| District | Area (x, z) | Character |
|---|---|---|
| Shibati 十八梯 | 380-560, 380-600 | traditional-style stair street from 40 m down to 14 m, grey brick, wooden eaves, hotpot, the hideout gate |
| Jiaochangkou 较场口 | 320-620, 280-400 | upper junction, Monorail Line 2 terminus and its elevated beam running west, the Grand Tunnel entrance |
| Construction site | 160-320, 300-460 | Li Wei's half-built tower and tower crane, beside the Line 2 beam |
| Jiefangbei 解放碑 | 600-900, 160-420 | CBD towers, malls, LED screens, the Liberation Monument plaza at (750, 300) |
| Hongyadong 洪崖洞 | 820-960, 60-200 | stilt complex stacked down the Jialing cliff, street entrances at 44, 30 and 12 m |
| Xinhua Road 新华路 | 880-1060, 420-580 | lower city on the Yangtze side, cableway station, substation |
| Xiaoshizi 小什字 | 980-1120, 280-420 | Line 6 station and control room, Dongshuimen Bridge approach |
| Chaotianmen 朝天门 | 1120-1400, 160-460 | the tip, Raffles City towers and The Crystal, river-police pier, the two rivers meeting |
| Riverfronts | north edge (Jialing), south edge (Yangtze) | riverside roads, prefab barrier walls, docks |
| Western border | x 0-60 | the wall across the Eling neck: turrets, floodlit, impassable |

Landmarks moved for play are logged in DECISIONS.md. Dongshuimen Bridge leaves the Yangtze side at (1080, 560) and runs south to Nan'an; road deck at 40 m, Line 6 rail deck inside the truss at 32 m. Qiansimen Bridge (Jialing side, from 960, 100) is sealed by a collapsed span: a vantage point, not a route. The cableway runs from Xinhua Road (980, 540) south across the Yangtze. Nan'an and Jiangbei across the rivers are backdrop.

### High-security sites

| Site | Ways in | Loot tier | Unique hazard |
|---|---|---|---|
| Construction site 工地 | scaffold from the alley; crawl under the hoarding along the drainage ditch; drop from the Line 2 beam onto the hoist roof; gate with the gate camera looped | 2: tools (bolt cutters, rope, carabiners, harness, steel hook, nail gun, angle grinder, jerrycan, breaching charge, pulley block in the crane cab) | loose scaffold planks that fall under a sprint; the crane moving loads on autopilot |
| Hospital 渝中医院 | ambulance bay (camera + keycard); laundry crawlspace from the service alley; helipad by grapple; basement link to the air-raid tunnels | 2: medical (first-aid kits, tourniquets, splints, painkillers, mylar, oxygen kit, defibrillator capacitor bank) | pressure-plate pharmacy floor; dark wards with motion sensors |
| Police station 派出所 | roof hatch by grapple; pry the garage shutter and crawl; rear cell-block bars with bolt cutters; front door with a looped camera and keycard | 3: weapons and keys (pistol, magazines, shotgun, grenades, smoke, boat key, keycards) | the armoury ceiling turret |
| Electronics market 数码城 | loading dock during the delivery-robot shift change; skylight by rope; vent duct from the hotpot kitchen next door; the underground mall passage | 2-3: electronics (SDR dongle, RFID reader, circuit boards, clip leads, data cables, CAN interface, battery packs, power banks) | acoustic sensor arrays on the shop floors |
| Telecom exchange 电信枢纽 (machine relay node) | cable tunnel from the air-raid tunnels; antenna-mast climb from the next roof; generator-room vent; front gate (keycard + loop) | 3: network (RF amplifier, network credentials, fibre tap) | server-hall gas suppression (8 s to get out); a dense camera mesh |
| Substation 变电站 | cut the dark back fence; drain culvert under the yard; control-building roof from the retaining wall; main gate with his father's badge | 2: electrical (insulated gloves, copper coil, the single spare HV fuse) | live HV yard: arcs kill within 1 m of busbars (a hum warns) |
| Cableway station 索道站 | public stair entrance (cameras); tower maintenance ladder from the Xinhua Road roofs; pry the cabin garage door | 2: operator key, maintenance logs | the exposed bullwheel when powered |
| Metro control room 小什字控制室 | face-recognition gates (loop the camera or vault in a drone gap); street ventilation shaft (crawl); the Line 6 track tunnel; emergency hatch | 3: metro keys, blast-door keycard, rail-deck schedule, pump panel | live third rail; face-recognition gates |
| Raffles drone hub and The Crystal 来福士 | service elevator shaft climb; exterior maintenance gantry from a lower roof; grapple from the neighbouring tower; lobby with keycard | 4: drone controller parts, big battery packs, thermal camera module, a second HV fuse | 250 m height with wind gusts; glass-floor pressure sensors |
| Bridge checkpoint 东水门检查站 | road deck (turrets, scanners); climb the north pier truss from the riverbank; the Line 6 rail deck from Xiaoshizi | 3: military crate (breaching charge, EMP parts) | turret cluster and scanner gates |
| River-police pier 水警码头 | swim from the stilt docks; gangway (cameras); cargo crane over the pier | 2: the patrol boat, life jackets | sonar buoys, river drone boats, cold water |

Every site has an approach with an unwatched window of 10 s or more (a coverage test proves it).

## 11. Escape routes

| Route | Required | Where |
|---|---|---|
| A. Dongshuimen rail deck 桥下 | cut the bridge sensor-bus relay (bolt cutters + insulated gloves) | substation relay cabinet (tools from the construction site / substation) |
| | signal jammer (SDR + RF amplifier + battery pack + board) | electronics market, telecom exchange |
| | reach the rail deck | Line 6 tunnel through the metro control room's track door, or climb the north pier with the grapple |
| | cross 300 m of truss past maintenance drones, then drop to the Nan'an bank | the bridge |
| B. Yangtze Cableway 索道 | **cabin**: restore the cableway feeder with the spare HV fuse + operator key, ride 60 s past the line drone | substation, cableway station |
| | **trolley**: haul-rope trolley (pulley block + carabiners + harness), climb the station tower, slide 40 s | construction site, cableway station |
| C. River at night 雾中 | river-police boat + 20 L fuel + boat battery (any car battery) + ignition (boat key or CAN hotwire) | pier; construction site or hospital generator room; police station or electronics market |
| | slip past sonar buoys and drone boats: fog and night with the engine off drifting, or jammer, or EMP | the Yangtze |
| D. Underground 隧道尽头 | flooded section: run the tunnel pumps (spare HV fuse in the metro feeder + pump panel) or swim it with the oxygen kit | substation + metro control room, or hospital |
| | sealed blast door: angle grinder + battery pack, breaching charge, or the blast-door keycard | construction site, bridge checkpoint, metro control room |
| | seismic sensors: move slowly or EMP them | Line 1 tunnel west under the border wall |

**Shared and scarce.** There is one spare HV fuse in the substation (a second one sits in the Raffles hub, tier 4): restoring the cableway or the metro pumps uses it. The construction site feeds three routes. The jammer serves A and helps C. The bridge relay cut is noticed: machines repair it at the next 06:00, so route A must be run the same night.

Endings: each route has its own short ending (section 13).

## 12. Anna 安娜

An open-source model running locally on his scuffed laptop. The laptop opens with L, does not pause the game, drains its battery (100% lasts 2 game hours open; charge at a shelter with power) and glows (light 0.5 at night). The interface is a dim, dense, bilingual terminal UI: monospace, near-black, low-contrast amber and grey, box-drawn panels, no pill buttons or gradients.

| Page / ability | Unlock |
|---|---|
| 状态 Status: health, wounds, needs | start |
| 扫描 Scan: identify an item or machine, its purpose and uses (look at it with the laptop open, 2 s) | start |
| Food check: remaining shelf life | start (after scanning that item) |
| 地图 Auto-map of places he has been | start |
| 巡逻日志 Patrol logs: units observed through binoculars with times and routes | binoculars |
| Drone routes on the map; tracking-tag detection and removal | SDR dongle |
| 摄像头 Live feeds of tapped cameras; loop a feed | camera tap (per camera) |
| District camera network | telecom exchange credentials |
| Aerial map; drone piloting | hacked drone |
| Weak points of a unit type | scanning a disabled unit of that type |
| Rail-deck and maintenance-drone schedule | metro control room file |
| Boat hotwire | CAN interface |

## 13. Story

- **Intro (skippable after the first run).** Dusk, the construction site, Li Wei on the tower-crane ladder. His father (李国荣, electrician at the Xinhua Road substation) calls; the call breaks up as drones crest the skyline and the street speakers say 请居民留在室内. Machines sweep the site; Li Wei climbs down and runs through Shibati's stairs, slips into the old air-raid tunnel his friends used, and collapses on the mattress. The laptop wakes: Anna says hello. Fade to day 1, 06:00.
- **In the world.** The Li family flat in upper Shibati (his father's badge, a voicemail on a cracked phone); friends' marks on the tunnel walls; LED boards with the machine's announcements; Anna's remarks on what he scans.
- **Endings.** A 桥下 Beneath the Bridge: dawn on the Nan'an bank under the truss, the city behind in fog. B 索道 The Cable: the cabin or trolley reaches Shangxin Street as the line alarm sounds behind him. C 雾中 Into the Fog: the boat drifts down the Yangtze with the engine off, Chaotianmen's lights fading. D 隧道尽头 Tunnel's End: he climbs out of a vent beyond the border wall into rain. Each ends with Anna and Li Wei's last exchange, then the run summary (days survived, sites entered, times seen).
- **Death.** A short black screen with the run summary; the save is gone.

## 14. Audio and voice

All audio is synthesised with Web Audio: buses for master, voice, effects, ambience and music. Footsteps per surface (stone, metal, wood, water, gravel), breathing and heartbeat that follow stamina and health, rotor buzz with Doppler, servo whine, gunfire, rain, river, city hum, tunnel drips, distant announcements. Music: sparse ambient pads by day and night; a pursuit layer that rises Suspicious -> Engaged -> Searching and fades through Heightened.

Dialogue lives in `src/data/dialogue` (id, speaker, zh, en). Playback: `public/audio/vo/<id>.mp3` if present, else Web Speech zh-CN, else subtitles only. `tools/make-voice` generates every mp3 with a TTS the director chooses, with distinct voices for Li Wei (dialect lines: 要得, 莫得, 啥子, 巴适), Anna (calm standard Mandarin), his father and the announcements.

## 15. Art direction

Fog (雾都) is the draw distance. Wet concrete and tile, mossy retaining walls, fig roots, tiled apartment blocks with balconies, AC units, water tanks and laundry poles; grey brick and timber eaves in Shibati; glass towers and huge LED screens in Jiefangbei. Neon and signs in simplified Chinese drawn on canvas with the system CJK font stack. Machines read clearly: lights white / amber / red by state. 2038 touches: smart lampposts, drone docks on towers, face-recognition gates, prefab barrier walls, LED boards with the machine's announcements. Everything is made in code: merged box geometry per chunk, canvas textures, instanced props.

## 16. Performance budgets

| Preset | Draw distance (fog) | Draw calls | Triangles | Pixel ratio | Shadows |
|---|---|---|---|---|---|
| Low | 110 m | 200 | 0.8 M | 0.75 | off |
| Medium | 160 m | 300 | 1.5 M | 1.0 | off |
| High | 220 m | 450 | 2.5 M | 1.0 | sun only |

Target 60 fps at 1080p on a mid-range laptop GPU (judged by the director). Headless tests track draw calls and triangles. Sim tick budget: under 2 ms at 60 Hz with all units.

## 17. Architecture

- `src/sim`: deterministic fixed-step simulation (60 Hz), headless, no DOM or WebGL. State is plain JSON-able data (one object), functions advance it. All randomness from the run seed's RNG. Inputs are per-tick frames.
- `src/world`: generates the static city (solids, ramps, water, climbables, interactables, nav graph, unit placements) from `src/data`. Used by both sim and renderer; identical every run.
- `src/data`: tuning and content (movement, perception, units, items, recipes, loot, food, map, tunnels, dialogue, scenarios).
- `src/render`, `src/ui`, `src/audio`, `src/input`, `src/dev`: browser-only. The renderer interpolates between sim ticks.
- Collision: axis-aligned boxes and ramps in a uniform grid (4 m cells); per-axis sweep with step-up; rays for line of sight. Buildings and tunnels are made by carving boxes out of solid boxes.
- Saves: the sim state object serialized to localStorage.

## 18. Dev tools and scenarios

`?dev=1`: teleport list, time-of-day and weather control, perception cones and alert overlay, item spawner, god mode, noclip, draw-call readout. `?scenario=<name>` loads a set-up situation (gym, hideout, shibati, each site, each route, pursuit cases). `?seed=<n>` fixes the run seed.
